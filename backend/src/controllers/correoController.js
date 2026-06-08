const { ImapFlow }    = require('imapflow');
const nodemailer      = require('nodemailer');
const { simpleParser } = require('mailparser');
const crypto          = require('crypto');
const { pool }        = require('../config/database');

const IMAP_HOST = 'mail.iglesiamqv.org';
const IMAP_PORT = 993;
const SMTP_HOST = 'mail.iglesiamqv.org';
const SMTP_PORT = 465;

// ── Cifrado de contraseñas ────────────────────────────────────────────────────
function clave() {
  return crypto.createHash('sha256').update(process.env.JWT_SECRET || 'mqv-correo-key').digest();
}
function cifrar(texto) {
  const iv     = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', clave(), iv);
  let   enc    = cipher.update(texto, 'utf8', 'hex');
  enc += cipher.final('hex');
  return iv.toString('hex') + ':' + enc;
}
function descifrar(encTexto) {
  const [ivHex, enc] = encTexto.split(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', clave(), Buffer.from(ivHex, 'hex'));
  let   dec      = decipher.update(enc, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function crearImap(cuenta, pass) {
  return new ImapFlow({
    host:   IMAP_HOST,
    port:   IMAP_PORT,
    secure: true,
    auth:   { user: cuenta, pass },
    logger: false,
    tls:    { rejectUnauthorized: false },
  });
}

async function obtenerCreds(usuario) {
  const [rows] = await pool.query(
    'SELECT correo_cuenta, contrasena_enc FROM correo_credenciales WHERE usuario = ?',
    [usuario]
  );
  if (!rows.length) {
    const err = new Error('Sin cuenta de correo configurada');
    err.status = 403;
    throw err;
  }
  return { cuenta: rows[0].correo_cuenta, pass: descifrar(rows[0].contrasena_enc) };
}

// ── Credenciales ──────────────────────────────────────────────────────────────

// POST /api/correo/credenciales
async function guardarCredenciales(req, res, next) {
  const client = crearImap(req.body.cuenta, req.body.contrasena);
  try {
    const { cuenta, contrasena } = req.body;
    if (!cuenta || !contrasena)
      return res.status(400).json({ error: 'cuenta y contrasena requeridos' });

    try {
      await client.connect();
      await client.logout();
    } catch {
      return res.status(400).json({ error: 'No se pudo conectar. Verifique la cuenta y contraseña.' });
    }

    await pool.query(
      `INSERT INTO correo_credenciales (usuario, correo_cuenta, contrasena_enc)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE correo_cuenta = VALUES(correo_cuenta), contrasena_enc = VALUES(contrasena_enc)`,
      [req.user.usuario, cuenta, cifrar(contrasena)]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
}

// GET /api/correo/credenciales
async function obtenerCredenciales(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT correo_cuenta FROM correo_credenciales WHERE usuario = ?',
      [req.user.usuario]
    );
    if (!rows.length) return res.json({ configurado: false });
    res.json({ configurado: true, cuenta: rows[0].correo_cuenta });
  } catch (err) { next(err); }
}

// DELETE /api/correo/credenciales
async function eliminarCredenciales(req, res, next) {
  try {
    await pool.query('DELETE FROM correo_credenciales WHERE usuario = ?', [req.user.usuario]);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

// ── No leídos (para dashboard) ────────────────────────────────────────────────

// GET /api/correo/no-leidos
async function contarNoLeidos(req, res) {
  let client;
  try {
    const [rows] = await pool.query(
      'SELECT correo_cuenta, contrasena_enc FROM correo_credenciales WHERE usuario = ?',
      [req.user.usuario]
    );
    if (!rows.length) return res.json({ total: 0, configurado: false });

    client = crearImap(rows[0].correo_cuenta, descifrar(rows[0].contrasena_enc));
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    let total = 0;
    try {
      const uids = await client.search({ unseen: true }, { uid: true });
      total = uids.length;
    } finally { lock.release(); }
    res.json({ total, configurado: true });
  } catch {
    res.json({ total: 0, configurado: false });
  } finally {
    if (client) try { await client.logout(); } catch {}
  }
}

// ── Carpetas ──────────────────────────────────────────────────────────────────

// GET /api/correo/carpetas
async function listarCarpetas(req, res, next) {
  let client;
  try {
    const { cuenta, pass } = await obtenerCreds(req.user.usuario);
    client = crearImap(cuenta, pass);
    await client.connect();

    const tree = await client.listTree();
    const carpetas = [];
    function recorrer(node) {
      if (node.path) carpetas.push({ path: node.path, name: node.name });
      (node.folders || []).forEach(recorrer);
    }
    (tree.folders || []).forEach(recorrer);

    res.json({ carpetas });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  } finally {
    if (client) try { await client.logout(); } catch {}
  }
}

// ── Bandeja ───────────────────────────────────────────────────────────────────

// GET /api/correo/bandeja?carpeta=INBOX&pagina=1&limite=20
async function listarBandeja(req, res, next) {
  let client;
  try {
    const { cuenta, pass } = await obtenerCreds(req.user.usuario);
    const carpeta = req.query.carpeta || 'INBOX';
    const pagina  = Math.max(1, parseInt(req.query.pagina)  || 1);
    const limite  = Math.min(50, parseInt(req.query.limite) || 20);

    client = crearImap(cuenta, pass);
    await client.connect();
    const lock = await client.getMailboxLock(carpeta);
    let correos = [], total = 0;
    try {
      const uids = await client.search({ all: true }, { uid: true });
      total       = uids.length;
      const desde = Math.max(0, total - pagina * limite);
      const hasta = total - (pagina - 1) * limite;
      const page  = uids.slice(desde, hasta).reverse();

      if (page.length) {
        for await (const msg of client.fetch(page, { envelope: true, flags: true }, { uid: true })) {
          const from = msg.envelope.from?.[0];
          correos.push({
            uid:      msg.uid,
            asunto:   msg.envelope.subject || '(Sin asunto)',
            de:       from?.address || '',
            deNombre: from?.name   || from?.address || '',
            fecha:    msg.envelope.date,
            leido:    msg.flags.has('\\Seen'),
          });
        }
        // Ordenar más recientes primero
        correos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      }
    } finally { lock.release(); }

    res.json({ correos, total, pagina, limite });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  } finally {
    if (client) try { await client.logout(); } catch {}
  }
}

// ── Leer correo ───────────────────────────────────────────────────────────────

// GET /api/correo/:uid?carpeta=INBOX
async function leerCorreo(req, res, next) {
  let client;
  try {
    const { cuenta, pass } = await obtenerCreds(req.user.usuario);
    const uid     = parseInt(req.params.uid);
    const carpeta = req.query.carpeta || 'INBOX';

    client = crearImap(cuenta, pass);
    await client.connect();
    const lock = await client.getMailboxLock(carpeta);
    let correo = null;
    try {
      for await (const msg of client.fetch([uid], { envelope: true, flags: true, source: true }, { uid: true })) {
        const parsed = await simpleParser(msg.source);
        const from   = msg.envelope.from?.[0];
        correo = {
          uid:      msg.uid,
          asunto:   parsed.subject || '(Sin asunto)',
          de:       from?.address   || '',
          deNombre: from?.name      || from?.address || '',
          para:     parsed.to?.text || '',
          fecha:    msg.envelope.date,
          leido:    msg.flags.has('\\Seen'),
          texto:    parsed.text || '',
          html:     parsed.html || '',
          adjuntos: (parsed.attachments || []).map(a => ({
            filename:    a.filename,
            contentType: a.contentType,
            size:        a.size,
          })),
        };
      }
      if (!correo) return res.status(404).json({ error: 'Correo no encontrado' });

      if (!correo.leido) {
        await client.messageFlagsAdd([uid], ['\\Seen'], { uid: true });
      }
    } finally { lock.release(); }

    res.json(correo);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  } finally {
    if (client) try { await client.logout(); } catch {}
  }
}

// ── Descargar adjunto ─────────────────────────────────────────────────────────

// GET /api/correo/:uid/adjunto?filename=...&carpeta=INBOX
async function descargarAdjunto(req, res, next) {
  let client;
  try {
    const { cuenta, pass } = await obtenerCreds(req.user.usuario);
    const uid      = parseInt(req.params.uid);
    const filename = req.query.filename;
    const carpeta  = req.query.carpeta || 'INBOX';

    if (!filename) return res.status(400).json({ error: 'filename requerido' });

    client = crearImap(cuenta, pass);
    await client.connect();
    const lock = await client.getMailboxLock(carpeta);
    let enviado = false;
    try {
      for await (const msg of client.fetch([uid], { source: true }, { uid: true })) {
        const parsed  = await simpleParser(msg.source);
        const adjunto = parsed.attachments.find(a => a.filename === filename);
        if (adjunto) {
          enviado = true;
          const safe = encodeURIComponent(filename).replace(/'/g, '%27');
          res.set('Content-Type', adjunto.contentType || 'application/octet-stream');
          res.set('Content-Disposition', `attachment; filename*=UTF-8''${safe}`);
          res.set('Content-Length', adjunto.size);
          res.send(adjunto.content);
        }
      }
    } finally { lock.release(); }

    if (!enviado) return res.status(404).json({ error: 'Adjunto no encontrado' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  } finally {
    if (client) try { await client.logout(); } catch {}
  }
}

// ── Eliminar correo ───────────────────────────────────────────────────────────

// DELETE /api/correo/:uid?carpeta=INBOX
async function eliminarCorreo(req, res, next) {
  let client;
  try {
    const { cuenta, pass } = await obtenerCreds(req.user.usuario);
    const uid     = parseInt(req.params.uid);
    const carpeta = req.query.carpeta || 'INBOX';

    client = crearImap(cuenta, pass);
    await client.connect();
    const lock = await client.getMailboxLock(carpeta);
    try {
      await client.messageDelete([uid], { uid: true });
    } finally { lock.release(); }

    res.json({ ok: true });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  } finally {
    if (client) try { await client.logout(); } catch {}
  }
}

// ── Enviar correo ─────────────────────────────────────────────────────────────

// POST /api/correo/enviar  (multipart/form-data via multer)
async function enviarCorreo(req, res, next) {
  try {
    const { cuenta, pass } = await obtenerCreds(req.user.usuario);
    const { para, cc, asunto, cuerpo, esHtml } = req.body;
    if (!para || !asunto || !cuerpo)
      return res.status(400).json({ error: 'para, asunto y cuerpo son requeridos' });

    const transport = nodemailer.createTransport({
      host:   SMTP_HOST,
      port:   SMTP_PORT,
      secure: true,
      auth:   { user: cuenta, pass },
      tls:    { rejectUnauthorized: false },
    });

    const usarHtml = esHtml === 'true' || esHtml === true;
    const mailOpts = {
      from:    cuenta,
      to:      para,
      subject: asunto,
      [usarHtml ? 'html' : 'text']: cuerpo,
    };

    if (cc && cc.trim()) mailOpts.cc = cc;

    if (req.files && req.files.length) {
      mailOpts.attachments = req.files.map(f => ({
        filename:    f.originalname,
        content:     f.buffer,
        contentType: f.mimetype,
      }));
    }

    await transport.sendMail(mailOpts);
    res.json({ ok: true });
  } catch (err) {
    if (err.status)       return res.status(err.status).json({ error: err.message });
    if (err.responseCode) return res.status(400).json({ error: 'Error SMTP: ' + err.response });
    next(err);
  }
}

// ── Contactos (personas con email) ───────────────────────────────────────────

// GET /api/correo/contactos?q=texto
async function buscarContactos(req, res, next) {
  try {
    const q    = (req.query.q || '').trim();
    const like = `%${q}%`;
    const [rows] = await pool.query(
      `SELECT primer_nombre, primer_apellido, segundo_apellido, email
       FROM personas
       WHERE email IS NOT NULL AND email != ''
         AND (primer_nombre LIKE ? OR primer_apellido LIKE ? OR segundo_apellido LIKE ? OR email LIKE ?)
       ORDER BY primer_apellido, primer_nombre
       LIMIT 10`,
      [like, like, like, like]
    );
    res.json({
      contactos: rows.map(r => ({
        nombre: [r.primer_nombre, r.primer_apellido, r.segundo_apellido].filter(Boolean).join(' '),
        email:  r.email,
      })),
    });
  } catch (err) { next(err); }
}

module.exports = {
  guardarCredenciales,
  obtenerCredenciales,
  eliminarCredenciales,
  contarNoLeidos,
  listarCarpetas,
  listarBandeja,
  leerCorreo,
  descargarAdjunto,
  eliminarCorreo,
  enviarCorreo,
  buscarContactos,
};
