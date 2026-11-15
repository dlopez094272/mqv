/**
 * Módulo Alabanza
 *  - Biblioteca de canciones (letra con acordes ChordPro, partitura ABC, pistas de audio, PDF)
 *  - Programa (orden del culto) de cada actividad: momentos + canciones
 *  - Músicos asignados a una actividad
 *
 * Permisos:
 *  - alabanza (S/A/E/D): biblioteca de canciones
 *  - actividades (E): armar el programa y asignar músicos
 *  - Un músico asignado a una actividad puede ver su programa y las canciones
 *    que contiene aunque no tenga el permiso "alabanza" (así lo usa la app).
 */
const router = require('express').Router();
const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { pool }       = require('../config/database');
const authMiddleware = require('../middleware/authMiddleware');
const checkPermission = require('../middleware/permissionsMiddleware');
const { tienePermiso } = require('../middleware/permissionsMiddleware');

const archivosDir = path.join(__dirname, '..', '..', 'files', 'alabanza');
fs.mkdirSync(archivosDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, archivosDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 80 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^(audio\/|image\/|application\/pdf|video\/mp4)/.test(file.mimetype)
      || /\.(mp3|m4a|aac|wav|ogg|flac|pdf|png|jpe?g|webp|musicxml|mxl|xml|mid|midi)$/i.test(file.originalname);
    cb(ok ? null : new Error('Tipo de archivo no permitido (audio, PDF, imagen, MusicXML o MIDI)'), ok);
  },
}).array('archivos', 20);

// El reproductor de audio de la app y el <audio> de la web no siempre pueden
// enviar el encabezado Authorization: se acepta el token como ?token=.
router.use((req, res, next) => {
  if (!req.headers.authorization && typeof req.query.token === 'string') {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
});
router.use(authMiddleware);

/* ── Utilidades de acceso ───────────────────────────────────── */

async function idPersonaDeUsuario(usuario) {
  const [[u]] = await pool.query('SELECT idpersonas FROM usuarios WHERE usuario = ?', [usuario]);
  return u?.idpersonas || null;
}

const puedeBiblioteca = (req) =>
  tienePermiso(req.user.usuario, 'alabanza', 'S', req.user.is_superadmin);

/** Biblioteca completa, o la canción está en el programa de una actividad donde el usuario es músico. */
async function puedeVerCancion(req, idcanciones) {
  if (await puedeBiblioteca(req)) return true;
  const idp = await idPersonaDeUsuario(req.user.usuario);
  if (!idp) return false;
  const [r] = await pool.query(`
    SELECT 1 FROM actividades_programa ap
    JOIN actividades_musicos am ON am.idactividades = ap.idactividades
    WHERE ap.idcanciones = ? AND am.idpersonas = ? LIMIT 1`, [idcanciones, idp]);
  return r.length > 0;
}

/** Ver el programa: permiso de actividades o de alabanza, o ser músico de la actividad. */
async function puedeVerPrograma(req, idactividades) {
  const { usuario, is_superadmin } = req.user;
  if (await tienePermiso(usuario, 'actividades', 'S', is_superadmin)) return true;
  if (await tienePermiso(usuario, 'alabanza', 'S', is_superadmin)) return true;
  const idp = await idPersonaDeUsuario(usuario);
  if (!idp) return false;
  const [r] = await pool.query(
    'SELECT 1 FROM actividades_musicos WHERE idactividades = ? AND idpersonas = ? LIMIT 1',
    [idactividades, idp]);
  return r.length > 0;
}

const prohibido = (res) => res.status(403).json({ error: 'No tiene acceso a este recurso' });

const TIPOS_CANCION = ['cancion', 'himno', 'coro'];
const TONALIDAD_RE  = /^[A-G](#|b)?m?$/;

function datosCancion(body) {
  const txt = (v, max) => {
    const s = (v ?? '').toString().trim();
    return s ? s.slice(0, max) : null;
  };
  const tonalidad = txt(body.tonalidad, 5);
  const bpm = parseInt(body.bpm, 10);
  return {
    titulo:          txt(body.titulo, 255),
    autor:           txt(body.autor, 255),
    tipo:            TIPOS_CANCION.includes(body.tipo) ? body.tipo : 'cancion',
    tonalidad:       tonalidad && TONALIDAD_RE.test(tonalidad) ? tonalidad : null,
    bpm:             bpm > 0 && bpm < 400 ? bpm : null,
    compas:          txt(body.compas, 5) || '4/4',
    categoria:       txt(body.categoria, 60),
    etiquetas:       txt(body.etiquetas, 255),
    letra_acordes:   (body.letra_acordes ?? '').toString() || null,
    partitura_abc:   (body.partitura_abc ?? '').toString() || null,
    youtube_url:     txt(body.youtube_url, 500),
    spotify_url:     txt(body.spotify_url, 500),
    notas:           txt(body.notas, 5000),
    dominio_publico: body.dominio_publico ? 1 : 0,
    ccli:            txt(body.ccli, 20),
    activo:          body.activo === undefined ? 1 : (body.activo ? 1 : 0),
  };
}

function borrarArchivoDisco(filename) {
  if (!filename) return;
  try { fs.unlinkSync(path.join(archivosDir, path.basename(filename))); } catch {}
}

/* ══════════════════════════════════════════════════════════════
   BIBLIOTECA DE CANCIONES
   ══════════════════════════════════════════════════════════════ */

router.get('/canciones', checkPermission('alabanza', 'S'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.idcanciones, c.titulo, c.autor, c.tipo, c.tonalidad, c.bpm, c.compas,
             c.categoria, c.etiquetas, c.youtube_url, c.dominio_publico, c.activo, c.updated_at,
             (c.letra_acordes IS NOT NULL AND c.letra_acordes <> '') AS tiene_acordes,
             (c.partitura_abc IS NOT NULL AND c.partitura_abc <> '') AS tiene_partitura,
             (SELECT COUNT(*) FROM alabanza_archivos x WHERE x.idcanciones = c.idcanciones AND x.tipo = 'audio')     AS total_audios,
             (SELECT COUNT(*) FROM alabanza_archivos x WHERE x.idcanciones = c.idcanciones AND x.tipo = 'partitura') AS total_partituras,
             (SELECT MAX(a.fecha_inicio) FROM actividades_programa ap
                JOIN actividades a ON a.idactividades = ap.idactividades
               WHERE ap.idcanciones = c.idcanciones AND a.fecha_inicio <= CURDATE()) AS ultima_vez,
             (SELECT COUNT(DISTINCT ap.idactividades) FROM actividades_programa ap
               WHERE ap.idcanciones = c.idcanciones) AS veces
      FROM alabanza_canciones c
      ORDER BY c.titulo
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/canciones/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!(await puedeVerCancion(req, id))) return prohibido(res);
    const [[c]] = await pool.query('SELECT * FROM alabanza_canciones WHERE idcanciones = ?', [id]);
    if (!c) return res.status(404).json({ error: 'Canción no encontrada' });
    const [archivos] = await pool.query(
      `SELECT idarchivos, tipo, pista, nombre_original, mimetype, size, orden
       FROM alabanza_archivos WHERE idcanciones = ? ORDER BY tipo, orden, idarchivos`, [id]);
    c.archivos = archivos;
    const [historial] = await pool.query(`
      SELECT a.idactividades, a.nombre, a.fecha_inicio, ap.tonalidad
      FROM actividades_programa ap JOIN actividades a ON a.idactividades = ap.idactividades
      WHERE ap.idcanciones = ? ORDER BY a.fecha_inicio DESC LIMIT 10`, [id]);
    c.historial = historial;
    res.json(c);
  } catch (err) { next(err); }
});

router.post('/canciones', checkPermission('alabanza', 'A'), async (req, res, next) => {
  try {
    const d = datosCancion(req.body);
    if (!d.titulo) return res.status(400).json({ error: 'El título es requerido' });
    const [r] = await pool.query('INSERT INTO alabanza_canciones SET ?', [{ ...d, usuario: req.user.usuario }]);
    res.status(201).json({ message: 'Canción creada', idcanciones: r.insertId });
  } catch (err) { next(err); }
});

router.put('/canciones/:id', checkPermission('alabanza', 'E'), async (req, res, next) => {
  try {
    const d = datosCancion(req.body);
    if (!d.titulo) return res.status(400).json({ error: 'El título es requerido' });
    const [r] = await pool.query('UPDATE alabanza_canciones SET ? WHERE idcanciones = ?',
      [{ ...d, usuario: req.user.usuario }, req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Canción no encontrada' });
    res.json({ message: 'Canción actualizada' });
  } catch (err) { next(err); }
});

router.delete('/canciones/:id', checkPermission('alabanza', 'D'), async (req, res, next) => {
  try {
    const [archivos] = await pool.query('SELECT filename FROM alabanza_archivos WHERE idcanciones = ?', [req.params.id]);
    const [r] = await pool.query('DELETE FROM alabanza_canciones WHERE idcanciones = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Canción no encontrada' });
    archivos.forEach(a => borrarArchivoDisco(a.filename));
    res.json({ message: 'Canción eliminada' });
  } catch (err) { next(err); }
});

/* ── Archivos (pistas de audio, partituras PDF/imagen) ──────── */

router.post('/canciones/:id/archivos', checkPermission('alabanza', 'E'), (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      const id = Number(req.params.id);
      const [[c]] = await pool.query('SELECT idcanciones FROM alabanza_canciones WHERE idcanciones = ?', [id]);
      if (!c) {
        (req.files || []).forEach(f => borrarArchivoDisco(f.filename));
        return res.status(404).json({ error: 'Canción no encontrada' });
      }
      const files = req.files || [];
      if (!files.length) return res.status(400).json({ error: 'No se recibió ningún archivo' });

      // "pista" puede venir una por archivo (arreglo) o una sola para todos
      const pistas = [].concat(req.body.pista ?? []);
      const [[{ maxOrden }]] = await pool.query(
        'SELECT IFNULL(MAX(orden), 0) AS maxOrden FROM alabanza_archivos WHERE idcanciones = ?', [id]);

      const filas = files.map((f, i) => {
        const esAudio = f.mimetype.startsWith('audio/') || /\.(mp3|m4a|aac|wav|ogg|flac)$/i.test(f.originalname);
        const tipo = req.body.tipo === 'partitura' || req.body.tipo === 'otro' ? req.body.tipo
                   : esAudio ? 'audio' : 'partitura';
        const pista = (pistas[i] ?? pistas[0] ?? '').toString().trim().slice(0, 60)
                   || (tipo === 'audio' ? 'Completa' : null);
        return [id, tipo, pista, f.originalname.slice(0, 255), f.filename, f.mimetype, f.size, maxOrden + i + 1];
      });
      await pool.query(
        'INSERT INTO alabanza_archivos (idcanciones, tipo, pista, nombre_original, filename, mimetype, size, orden) VALUES ?',
        [filas]);
      res.status(201).json({ message: `${filas.length} archivo(s) subido(s)` });
    } catch (e) { next(e); }
  });
});

router.patch('/archivos/:id', checkPermission('alabanza', 'E'), async (req, res, next) => {
  try {
    const pista = (req.body.pista ?? '').toString().trim().slice(0, 60) || null;
    await pool.query('UPDATE alabanza_archivos SET pista = ? WHERE idarchivos = ?', [pista, req.params.id]);
    res.json({ message: 'Archivo actualizado' });
  } catch (err) { next(err); }
});

router.delete('/archivos/:id', checkPermission('alabanza', 'E'), async (req, res, next) => {
  try {
    const [[a]] = await pool.query('SELECT filename FROM alabanza_archivos WHERE idarchivos = ?', [req.params.id]);
    if (!a) return res.status(404).json({ error: 'Archivo no encontrado' });
    await pool.query('DELETE FROM alabanza_archivos WHERE idarchivos = ?', [req.params.id]);
    borrarArchivoDisco(a.filename);
    res.json({ message: 'Archivo eliminado' });
  } catch (err) { next(err); }
});

/** Contenido del archivo (soporta Range para adelantar/atrasar audio). */
router.get('/archivos/:id/contenido', async (req, res, next) => {
  try {
    const [[a]] = await pool.query('SELECT * FROM alabanza_archivos WHERE idarchivos = ?', [req.params.id]);
    if (!a) return res.status(404).json({ error: 'Archivo no encontrado' });
    if (!(await puedeVerCancion(req, a.idcanciones))) return prohibido(res);
    const ruta = path.join(archivosDir, path.basename(a.filename));
    if (!fs.existsSync(ruta)) return res.status(404).json({ error: 'El archivo ya no existe en el servidor' });
    if (a.mimetype) res.type(a.mimetype);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(a.nombre_original)}"`);
    res.sendFile(ruta, { acceptRanges: true, maxAge: '1h' });
  } catch (err) { next(err); }
});

/* ── Estadísticas de uso ────────────────────────────────────── */

router.get('/estadisticas', checkPermission('alabanza', 'S'), async (req, res, next) => {
  try {
    const [masTocadas] = await pool.query(`
      SELECT c.idcanciones, c.titulo, COUNT(DISTINCT ap.idactividades) AS veces, MAX(a.fecha_inicio) AS ultima_vez
      FROM actividades_programa ap
      JOIN alabanza_canciones c ON c.idcanciones = ap.idcanciones
      JOIN actividades a ON a.idactividades = ap.idactividades
      WHERE a.fecha_inicio >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) AND a.fecha_inicio <= CURDATE()
      GROUP BY c.idcanciones, c.titulo ORDER BY veces DESC, c.titulo LIMIT 10`);
    const [olvidadas] = await pool.query(`
      SELECT c.idcanciones, c.titulo,
             (SELECT MAX(a.fecha_inicio) FROM actividades_programa ap JOIN actividades a ON a.idactividades = ap.idactividades
               WHERE ap.idcanciones = c.idcanciones AND a.fecha_inicio <= CURDATE()) AS ultima_vez
      FROM alabanza_canciones c
      WHERE c.activo = 1
      HAVING ultima_vez IS NULL OR ultima_vez < DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
      ORDER BY ultima_vez IS NULL DESC, ultima_vez LIMIT 10`);
    const [[totales]] = await pool.query(`
      SELECT COUNT(*) AS canciones,
             SUM(tipo = 'himno') AS himnos, SUM(tipo = 'coro') AS coros, SUM(tipo = 'cancion') AS cantos
      FROM alabanza_canciones WHERE activo = 1`);
    res.json({ totales, masTocadas, olvidadas });
  } catch (err) { next(err); }
});

/* ══════════════════════════════════════════════════════════════
   PROGRAMA DE UNA ACTIVIDAD + MÚSICOS
   ══════════════════════════════════════════════════════════════ */

async function cargarPrograma(idactividades) {
  const [programa] = await pool.query(`
    SELECT ap.idprograma, ap.orden, ap.tipo, ap.titulo, ap.idcanciones, ap.tonalidad,
           ap.responsable, TIME_FORMAT(ap.hora, '%H:%i') AS hora, ap.duracion_min, ap.notas,
           c.titulo AS cancion_titulo, c.autor AS cancion_autor, c.tonalidad AS cancion_tonalidad,
           c.bpm AS cancion_bpm, c.tipo AS cancion_tipo,
           (c.letra_acordes IS NOT NULL AND c.letra_acordes <> '') AS tiene_acordes,
           (SELECT COUNT(*) FROM alabanza_archivos x WHERE x.idcanciones = c.idcanciones AND x.tipo = 'audio') AS total_audios
    FROM actividades_programa ap
    LEFT JOIN alabanza_canciones c ON c.idcanciones = ap.idcanciones
    WHERE ap.idactividades = ?
    ORDER BY ap.orden, ap.idprograma`, [idactividades]);
  const [musicos] = await pool.query(`
    SELECT am.idactividades_musicos, am.idpersonas, am.instrumento, p.foto, p.celular,
           TRIM(CONCAT_WS(' ', p.primer_nombre, p.primer_apellido)) AS nombre
    FROM actividades_musicos am JOIN personas p ON p.idpersonas = am.idpersonas
    WHERE am.idactividades = ?
    ORDER BY am.instrumento, nombre`, [idactividades]);
  return { programa, musicos };
}

router.get('/actividades/:id/programa', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!(await puedeVerPrograma(req, id))) return prohibido(res);
    const [[actividad]] = await pool.query(`
      SELECT a.idactividades, a.nombre, a.descripcion, a.fecha_inicio, a.fecha_fin,
             TIME_FORMAT(a.hora_inicio, '%H:%i') AS hora_inicio, TIME_FORMAT(a.hora_fin, '%H:%i') AS hora_fin,
             a.logo, l.lugar, ac.categoria, IFNULL(ac.color, '#57446C') AS categoria_color
      FROM actividades a
      LEFT JOIN lugares l ON l.idlugares = a.idlugares
      LEFT JOIN actividades_categorias ac ON ac.idactividades_categorias = a.idcategorias
      WHERE a.idactividades = ?`, [id]);
    if (!actividad) return res.status(404).json({ error: 'Actividad no encontrada' });
    res.json({ actividad, ...(await cargarPrograma(id)) });
  } catch (err) { next(err); }
});

/** Reemplaza el programa completo (el orden es el del arreglo). */
router.put('/actividades/:id/programa', checkPermission('actividades', 'E'), async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const id = Number(req.params.id);
    const items = Array.isArray(req.body.items) ? req.body.items : null;
    if (!items) return res.status(400).json({ error: 'Formato inválido: se esperaba items[]' });

    const filas = [];
    for (const [i, it] of items.entries()) {
      const tipo = it.tipo === 'cancion' ? 'cancion' : 'momento';
      const idc  = tipo === 'cancion' ? Number(it.idcanciones) || null : null;
      const titulo = (it.titulo ?? '').toString().trim().slice(0, 255) || null;
      if (tipo === 'cancion' && !idc) return res.status(400).json({ error: `El elemento ${i + 1} no tiene canción seleccionada` });
      if (tipo === 'momento' && !titulo) return res.status(400).json({ error: `El elemento ${i + 1} no tiene título` });
      const ton = (it.tonalidad ?? '').toString().trim();
      const hora = /^\d{1,2}:\d{2}/.test(it.hora || '') ? it.hora.slice(0, 5) : null;
      const dur = parseInt(it.duracion_min, 10);
      filas.push([
        id, i + 1, tipo, titulo, idc,
        TONALIDAD_RE.test(ton) ? ton : null,
        (it.responsable ?? '').toString().trim().slice(0, 255) || null,
        hora, dur > 0 && dur < 1000 ? dur : null,
        (it.notas ?? '').toString().trim().slice(0, 2000) || null,
      ]);
    }

    const [[act]] = await conn.query('SELECT idactividades FROM actividades WHERE idactividades = ?', [id]);
    if (!act) return res.status(404).json({ error: 'Actividad no encontrada' });

    await conn.beginTransaction();
    await conn.query('DELETE FROM actividades_programa WHERE idactividades = ?', [id]);
    if (filas.length) {
      await conn.query(
        `INSERT INTO actividades_programa
           (idactividades, orden, tipo, titulo, idcanciones, tonalidad, responsable, hora, duracion_min, notas)
         VALUES ?`, [filas]);
    }
    await conn.commit();
    res.json({ message: 'Programa guardado', ...(await cargarPrograma(id)) });
  } catch (err) {
    await conn.rollback().catch(() => {});
    next(err);
  } finally { conn.release(); }
});

router.put('/actividades/:id/musicos', checkPermission('actividades', 'E'), async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const id = Number(req.params.id);
    const lista = Array.isArray(req.body.musicos) ? req.body.musicos : null;
    if (!lista) return res.status(400).json({ error: 'Formato inválido: se esperaba musicos[]' });
    const vistos = new Set();
    const filas = [];
    for (const m of lista) {
      const idp = Number(m.idpersonas);
      if (!idp) continue;
      const inst = (m.instrumento ?? '').toString().trim().slice(0, 60) || null;
      const clave = `${idp}|${inst}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      filas.push([id, idp, inst]);
    }
    await conn.beginTransaction();
    await conn.query('DELETE FROM actividades_musicos WHERE idactividades = ?', [id]);
    if (filas.length) {
      await conn.query('INSERT INTO actividades_musicos (idactividades, idpersonas, instrumento) VALUES ?', [filas]);
    }
    await conn.commit();
    res.json({ message: 'Músicos guardados', ...(await cargarPrograma(id)) });
  } catch (err) {
    await conn.rollback().catch(() => {});
    next(err);
  } finally { conn.release(); }
});

/** Copia el programa de otra actividad (p. ej. el del domingo pasado) como punto de partida. */
router.get('/programas-recientes', checkPermission('actividades', 'E'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.idactividades, a.nombre, a.fecha_inicio, COUNT(ap.idprograma) AS elementos
      FROM actividades a JOIN actividades_programa ap ON ap.idactividades = a.idactividades
      GROUP BY a.idactividades, a.nombre, a.fecha_inicio
      ORDER BY a.fecha_inicio DESC LIMIT 15`);
    res.json(rows);
  } catch (err) { next(err); }
});

/** Personas para asignar como músicos (solo requiere poder editar actividades). */
router.get('/personas', checkPermission('actividades', 'E'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT idpersonas AS id,
             TRIM(CONCAT_WS(' ', primer_nombre, NULLIF(segundo_nombre,''), primer_apellido, NULLIF(segundo_apellido,''))) AS nombre
      FROM personas WHERE IFNULL(fallecido, 0) = 0
      ORDER BY primer_nombre, primer_apellido`);
    res.json(rows);
  } catch (err) { next(err); }
});

/* ── Mis servicios (app / dashboard) ────────────────────────── */

/**
 * Próximas actividades con programa para el usuario:
 *  - donde está asignado como músico
 *  - si tiene permiso de alabanza, también todas las que tienen canciones
 * ?pasadas=1 devuelve las de los últimos 60 días.
 */
router.get('/mis-servicios', async (req, res, next) => {
  try {
    const idp = await idPersonaDeUsuario(req.user.usuario);
    const verTodas = await puedeBiblioteca(req);
    const pasadas = req.query.pasadas === '1';
    const rango = pasadas
      ? 'a.fecha_fin < CURDATE() AND a.fecha_inicio >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)'
      : 'a.fecha_fin >= CURDATE() AND a.fecha_inicio <= DATE_ADD(CURDATE(), INTERVAL 90 DAY)';

    const condiciones = [];
    const params = [idp || 0, idp || 0];
    if (idp) { condiciones.push('am.idpersonas IS NOT NULL'); }
    if (verTodas) { condiciones.push('EXISTS (SELECT 1 FROM actividades_programa p2 WHERE p2.idactividades = a.idactividades)'); }
    if (!condiciones.length) return res.json([]);

    const [rows] = await pool.query(`
      SELECT a.idactividades, a.nombre, a.fecha_inicio, a.fecha_fin,
             TIME_FORMAT(a.hora_inicio, '%H:%i') AS hora_inicio, a.logo, l.lugar,
             IFNULL(ac.color, '#57446C') AS categoria_color,
             (am.idpersonas IS NOT NULL) AS es_musico,
             (SELECT GROUP_CONCAT(DISTINCT am2.instrumento ORDER BY am2.instrumento SEPARATOR ', ')
                FROM actividades_musicos am2 WHERE am2.idactividades = a.idactividades AND am2.idpersonas = ?) AS mi_instrumento,
             (SELECT COUNT(*) FROM actividades_programa p WHERE p.idactividades = a.idactividades AND p.tipo = 'cancion') AS total_canciones,
             (SELECT COUNT(*) FROM actividades_programa p WHERE p.idactividades = a.idactividades) AS total_elementos
      FROM actividades a
      LEFT JOIN lugares l ON l.idlugares = a.idlugares
      LEFT JOIN actividades_categorias ac ON ac.idactividades_categorias = a.idcategorias
      LEFT JOIN (SELECT DISTINCT idactividades, idpersonas FROM actividades_musicos) am
             ON am.idactividades = a.idactividades AND am.idpersonas = ?
      WHERE ${rango} AND (${condiciones.join(' OR ')})
      ORDER BY a.fecha_inicio ${pasadas ? 'DESC' : 'ASC'}, a.hora_inicio
      LIMIT 60`, params);
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
