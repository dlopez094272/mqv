/**
 * Formularios de inscripción — acceso por URL (/f/:token en el frontend).
 * Montado en /api/formularios-publicos
 *
 * - Formulario público: cualquiera con la URL puede verlo y responder.
 * - Formulario privado: requiere sesión de un usuario del sistema.
 * El token de sesión es opcional en todas las rutas; si viene, se valida.
 */
const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const { pool } = require('../config/database');
const {
  validarRespuestas, valorDesdePersona, textoRespuesta, tieneValor, CAMPOS_PERSONA, EMAIL_RE,
} = require('../utils/formularios');
const { sendMail, emailInscripcion } = require('../config/email');

const NOMBRE_PERSONA_SQL = `TRIM(CONCAT_WS(' ',
  p.primer_nombre, NULLIF(p.segundo_nombre,''),
  p.primer_apellido, NULLIF(p.segundo_apellido,''),
  NULLIF(p.apellidocasada,'')))`;

/* ── Autenticación opcional ──────────────────────────────────── */
router.use((req, res, next) => {
  const h = req.headers.authorization;
  if (h && h.startsWith('Bearer ')) {
    try { req.user = jwt.verify(h.slice(7), process.env.JWT_SECRET); } catch { /* sesión inválida = anónimo */ }
  }
  next();
});

/* ── Límite simple de peticiones por IP (memoria) ─────────────── */
function limitador(max, ventanaMs) {
  const hits = new Map();
  return (req, res, next) => {
    const ahora = Date.now();
    const ip = req.ip || 'desconocida';
    const arr = (hits.get(ip) || []).filter(t => ahora - t < ventanaMs);
    if (arr.length >= max) {
      return res.status(429).json({ error: 'Demasiadas solicitudes. Intente de nuevo en unos minutos.' });
    }
    arr.push(ahora);
    hits.set(ip, arr);
    if (hits.size > 5000) { for (const [k, v] of hits) if (!v.some(t => ahora - t < ventanaMs)) hits.delete(k); }
    next();
  };
}
const limiteEnvio    = limitador(20,  10 * 60 * 1000);
const limiteBusqueda = limitador(200, 10 * 60 * 1000);

function parseJson(v, def) {
  if (v === null || v === undefined) return def;
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return def; }
}

async function cargarFormulario(token) {
  const [[f]] = await pool.query(`
    SELECT f.*, a.nombre AS actividad_nombre, a.logo AS actividad_logo, a.descripcion AS actividad_descripcion,
           a.fecha_inicio, a.fecha_fin, a.hora_inicio, a.hora_fin, l.lugar
    FROM actividades_formularios f
    JOIN actividades a ON a.idactividades = f.idactividades
    LEFT JOIN lugares l ON l.idlugares = a.idlugares
    WHERE f.token = ?
  `, [String(token || '').slice(0, 40)]);
  if (!f) return null;
  f.preguntas      = parseJson(f.preguntas, []);
  f.notificaciones = parseJson(f.notificaciones, null) || {};
  return f;
}

/** Clave de la pregunta de correo del inscrito, si la confirmación está activa */
const preguntaEmail = f => (f.notificaciones?.inscrito && f.notificaciones.pregunta_email) || null;

function textoFechaActividad(f) {
  const fi = fechaIso(f.fecha_inicio), ff = fechaIso(f.fecha_fin);
  if (!fi) return '';
  const fmt = s => new Date(s + 'T00:00:00').toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  let t = fmt(fi);
  if (ff && ff !== fi) t += ' al ' + fmt(ff);
  if (f.hora_inicio) t += ` · ${String(f.hora_inicio).slice(0, 5)}${f.hora_fin ? ' – ' + String(f.hora_fin).slice(0, 5) : ''}`;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Envía (en segundo plano) la confirmación al inscrito y/o el aviso a los organizadores.
 * Los errores de correo se registran pero nunca afectan la respuesta ya guardada.
 */
function enviarNotificaciones(f, respuestas, req) {
  const n = f.notificaciones || {};
  const claveEmail = preguntaEmail(f);
  const correoInscrito = claveEmail && EMAIL_RE.test(String(respuestas[claveEmail] || '')) ? String(respuestas[claveEmail]).trim() : null;
  const organizadores = Array.isArray(n.correos) ? n.correos : [];
  if (!correoInscrito && !organizadores.length) return;

  const base   = `${req.protocol}://${req.get('host')}`;
  const conValor = f.preguntas.filter(q => q.tipo !== 'seccion' && tieneValor(respuestas[q.clave]));
  // Al organizador se le indica si la persona es nueva (para registrarla); al inscrito no
  const filas = marcar => conValor.map(q => ({ pregunta: q.etiqueta, respuesta: textoRespuesta(q, respuestas[q.clave], marcar) }));
  const datos = {
    titulo:    f.titulo,
    actividad: f.actividad_nombre,
    fecha:     textoFechaActividad(f),
    lugar:     f.lugar,
    logoUrl:   f.actividad_logo ? `${base}/api/files/actividades/logos/${encodeURIComponent(f.actividad_logo)}` : null,
    mensaje:   f.mensaje_confirmacion,
  };

  const envios = [];
  if (correoInscrito) {
    envios.push(sendMail({
      to: correoInscrito,
      subject: `Inscripción recibida: ${f.actividad_nombre}`,
      html: emailInscripcion({ ...datos, filas: filas(false), paraOrganizador: false }),
    }));
  }
  if (organizadores.length) {
    // El nombre de la primera pregunta de persona (o el correo) identifica la inscripción en el asunto
    const qPersona = f.preguntas.find(q => q.tipo === 'persona' && tieneValor(respuestas[q.clave]));
    const quien = qPersona ? textoRespuesta(qPersona, respuestas[qPersona.clave]) : correoInscrito;
    const frontend = process.env.FRONTEND_URL || base;
    envios.push(sendMail({
      to: organizadores.join(', '),
      subject: `Nueva inscripción${quien ? ' de ' + quien : ''} — ${f.titulo}`,
      html: emailInscripcion({
        ...datos, filas: filas(true), paraOrganizador: true,
        urlReporte: `${frontend}/actividades/formularios/${f.idactividades_formularios}/respuestas`,
      }),
    }));
  }
  Promise.allSettled(envios).then(rs => {
    for (const r of rs) if (r.status === 'rejected') console.error('[formularios] error al enviar correo:', r.reason?.message || r.reason);
  });
}

function estadoCierre(f) {
  if (!f.activo) return 'Este formulario no está recibiendo respuestas.';
  if (f.fecha_limite && new Date(f.fecha_limite) < new Date()) return 'El plazo para responder este formulario ya terminó.';
  return null;
}

const fechaIso = v => (v instanceof Date
  ? `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`
  : (v ? String(v).slice(0, 10) : null));

/* ── Obtener formulario ──────────────────────────────────────── */
router.get('/:token', async (req, res, next) => {
  try {
    const f = await cargarFormulario(req.params.token);
    if (!f) return res.status(404).json({ error: 'Formulario no encontrado' });

    const actividad = {
      nombre:       f.actividad_nombre,
      descripcion:  f.actividad_descripcion,
      logo:         f.actividad_logo,
      fecha_inicio: fechaIso(f.fecha_inicio),
      fecha_fin:    fechaIso(f.fecha_fin),
      hora_inicio:  f.hora_inicio,
      hora_fin:     f.hora_fin,
      lugar:        f.lugar,
    };

    // Privado sin sesión: solo datos mínimos para mostrar el aviso de inicio de sesión
    if (!f.publico && !req.user) {
      return res.json({ requiere_login: true, titulo: f.titulo, actividad });
    }

    res.json({
      requiere_login: false,
      titulo:         f.titulo,
      descripcion:    f.descripcion,
      publico:        !!f.publico,
      fecha_limite:   f.fecha_limite,
      cerrado:        estadoCierre(f),
      preguntas:      f.preguntas,
      pregunta_email: preguntaEmail(f),
      actividad,
      usuario:        req.user?.usuario || null,
    });
  } catch (err) { next(err); }
});

/** Pregunta persona del formulario, verificando acceso. Responde error y devuelve null si no aplica. */
async function preguntaPersona(req, res) {
  const f = await cargarFormulario(req.params.token);
  if (!f) { res.status(404).json({ error: 'Formulario no encontrado' }); return null; }
  if (!f.publico && !req.user) { res.status(401).json({ error: 'Inicie sesión para usar este formulario' }); return null; }
  const q = f.preguntas.find(p => p.clave === req.query.pregunta && p.tipo === 'persona');
  if (!q) { res.status(400).json({ error: 'Pregunta inválida' }); return null; }
  return q;
}

/* ── Grupos para el filtro de búsqueda de personas ───────────── */
router.get('/:token/grupos', limiteBusqueda, async (req, res, next) => {
  try {
    const q = await preguntaPersona(req, res);
    if (!q) return;
    let sql = 'SELECT idgrupos AS id, grupo AS nombre FROM grupos WHERE activo = 1';
    const params = [];
    if (q.filtro_grupos?.length) { sql += ' AND idgrupos IN (?)'; params.push(q.filtro_grupos); }
    const [rows] = await pool.query(sql + ' ORDER BY grupo', params);
    res.json(rows);
  } catch (err) { next(err); }
});

/* ── Buscar personas registradas ─────────────────────────────── */
router.get('/:token/personas', limiteBusqueda, async (req, res, next) => {
  try {
    const q = await preguntaPersona(req, res);
    if (!q) return;

    const texto = String(req.query.q || '').trim().slice(0, 100);
    const grupo = Number(req.query.grupo) || null;

    // Sin sesión se exige texto de búsqueda (no se listan grupos completos de forma anónima)
    if (texto.length < 2 && (!grupo || !req.user)) return res.json([]);
    if (grupo && q.filtro_grupos?.length && !q.filtro_grupos.includes(grupo)) return res.json([]);

    let sql = `
      SELECT p.idpersonas, ${NOMBRE_PERSONA_SQL} AS nombre, p.foto,
             (SELECT GROUP_CONCAT(g.grupo ORDER BY g.grupo SEPARATOR ', ')
                FROM grupos_personas gp JOIN grupos g ON g.idgrupos = gp.idgrupos
               WHERE gp.idpersonas = p.idpersonas) AS grupos
      FROM personas p
      WHERE p.fallecido = 0`;
    const params = [];

    for (const palabra of texto.split(/\s+/).filter(Boolean).slice(0, 5)) {
      sql += ` AND CONCAT_WS(' ', p.primer_nombre, p.segundo_nombre, p.primer_apellido,
                              p.segundo_apellido, p.apellidocasada) LIKE ?`;
      params.push(`%${palabra.replace(/[%_\\]/g, '\\$&')}%`);
    }
    if (q.filtro_grupos?.length) {
      sql += ' AND EXISTS (SELECT 1 FROM grupos_personas gp WHERE gp.idpersonas = p.idpersonas AND gp.idgrupos IN (?))';
      params.push(q.filtro_grupos);
    }
    if (grupo) {
      sql += ' AND EXISTS (SELECT 1 FROM grupos_personas gp WHERE gp.idpersonas = p.idpersonas AND gp.idgrupos = ?)';
      params.push(grupo);
    }
    sql += ' ORDER BY p.primer_nombre, p.primer_apellido LIMIT 30';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

/* ── Enviar respuesta ────────────────────────────────────────── */
router.post('/:token', limiteEnvio, async (req, res, next) => {
  try {
    const f = await cargarFormulario(req.params.token);
    if (!f) return res.status(404).json({ error: 'Formulario no encontrado' });
    if (!f.publico && !req.user) return res.status(401).json({ error: 'Inicie sesión para responder este formulario' });
    const cierre = estadoCierre(f);
    if (cierre) return res.status(400).json({ error: cierre });

    let limpias, personasRegistradas;
    try {
      ({ limpias, personasRegistradas } = validarRespuestas(f.preguntas, req.body?.respuestas));
    } catch (e) { return res.status(400).json({ error: e.message }); }

    if (!Object.keys(limpias).length) return res.status(400).json({ error: 'El formulario está vacío' });

    // El correo donde se enviará la confirmación debe ser válido
    const claveEmail = preguntaEmail(f);
    if (claveEmail && tieneValor(limpias[claveEmail]) && !EMAIL_RE.test(String(limpias[claveEmail]).trim())) {
      const q = f.preguntas.find(p => p.clave === claveEmail);
      return res.status(400).json({ error: `"${q?.etiqueta || 'Correo'}": escriba un correo electrónico válido` });
    }

    // Verificar personas registradas y llenar los campos enlazados con su ficha
    for (const { clave, idpersonas } of personasRegistradas) {
      const q = f.preguntas.find(p => p.clave === clave);
      const campos = f.preguntas.filter(p => p.pregunta_persona === clave && CAMPOS_PERSONA[p.campo_persona]);
      const cols = [...new Set(campos.map(p => p.campo_persona))];

      let sql = `SELECT p.idpersonas, ${NOMBRE_PERSONA_SQL} AS nombre
                 ${cols.map(c => `, p.\`${c}\``).join('')}
                 FROM personas p WHERE p.idpersonas = ? AND p.fallecido = 0`;
      const params = [idpersonas];
      if (q.filtro_grupos?.length) {
        sql += ' AND EXISTS (SELECT 1 FROM grupos_personas gp WHERE gp.idpersonas = p.idpersonas AND gp.idgrupos IN (?))';
        params.push(q.filtro_grupos);
      }
      const [[persona]] = await pool.query(sql, params);
      if (!persona) return res.status(400).json({ error: `"${q.etiqueta}": la persona seleccionada no es válida` });

      limpias[clave] = { modo: 'registrada', idpersonas, nombre: persona.nombre };
      for (const p of campos) {
        const v = valorDesdePersona(p.campo_persona, persona[p.campo_persona]);
        if (v !== null) limpias[p.clave] = p.tipo === 'multiple' ? [v] : v;
      }
    }

    const [r] = await pool.query(`
      INSERT INTO actividades_formularios_respuestas (idactividades_formularios, respuestas, usuario, ip)
      VALUES (?, ?, ?, ?)
    `, [f.idactividades_formularios, JSON.stringify(limpias), req.user?.usuario || null, (req.ip || '').slice(0, 64)]);

    enviarNotificaciones(f, limpias, req);
    res.status(201).json({
      id: r.insertId,
      mensaje: f.mensaje_confirmacion || null,
      correo_confirmacion: !!(claveEmail && EMAIL_RE.test(String(limpias[claveEmail] || '').trim())),
    });
  } catch (err) { next(err); }
});

module.exports = router;
