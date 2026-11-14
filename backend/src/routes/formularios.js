/**
 * Formularios de inscripción de actividades — gestión (usuarios del sistema).
 * Montado en /api/formularios
 *
 * Permisos: consultar formularios y respuestas = actividades:S
 *           crear / editar / eliminar          = actividades:E
 *           registrar persona nueva desde una respuesta = personas:A
 */
const router = require('express').Router();
const crypto = require('crypto');
const { pool }        = require('../config/database');
const authMiddleware  = require('../middleware/authMiddleware');
const checkPermission = require('../middleware/permissionsMiddleware');
const {
  normalizarPreguntas, normalizarNotificaciones, valorHaciaPersona, CAMPOS_PERSONA,
} = require('../utils/formularios');

router.use(authMiddleware);

const NOMBRE_PERSONA_SQL = `TRIM(CONCAT_WS(' ',
  p.primer_nombre, NULLIF(p.segundo_nombre,''),
  p.primer_apellido, NULLIF(p.segundo_apellido,''),
  NULLIF(p.apellidocasada,'')))`;

const nuevoToken = () => crypto.randomBytes(12).toString('base64url');

function parseJson(v, def) {
  if (v === null || v === undefined) return def;
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return def; }
}

function filaFormulario(r) {
  return {
    ...r, publico: !!r.publico, activo: !!r.activo,
    preguntas:      parseJson(r.preguntas, []),
    notificaciones: parseJson(r.notificaciones, null) || { inscrito: false, pregunta_email: null, correos: [] },
  };
}

function datosDesdeBody(body) {
  const titulo = typeof body.titulo === 'string' ? body.titulo.trim().slice(0, 255) : '';
  if (!titulo) throw new Error('El título del formulario es requerido');
  let fecha_limite = null;
  if (body.fecha_limite) {
    const s = String(body.fecha_limite).replace('T', ' ');
    if (!/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?$/.test(s)) throw new Error('Fecha límite inválida');
    fecha_limite = s.length === 10 ? `${s} 23:59:59` : s;
  }
  const preguntas = normalizarPreguntas(body.preguntas || []);
  return {
    titulo,
    descripcion:          typeof body.descripcion === 'string' ? body.descripcion.trim().slice(0, 5000) || null : null,
    publico:              body.publico ? 1 : 0,
    activo:               body.activo === undefined ? 1 : (body.activo ? 1 : 0),
    fecha_limite,
    mensaje_confirmacion: typeof body.mensaje_confirmacion === 'string'
                            ? body.mensaje_confirmacion.trim().slice(0, 2000) || null : null,
    preguntas,
    notificaciones:       normalizarNotificaciones(body.notificaciones, preguntas),
  };
}

/* ── Formularios de una actividad ────────────────────────────── */
router.get('/actividad/:idact', checkPermission('actividades', 'S'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT f.idactividades_formularios, f.idactividades, f.titulo, f.descripcion, f.token,
             f.publico, f.activo, f.fecha_limite, f.created_at, f.updated_at, f.usuario,
             JSON_LENGTH(f.preguntas) AS total_preguntas,
             (SELECT COUNT(*) FROM actividades_formularios_respuestas r
               WHERE r.idactividades_formularios = f.idactividades_formularios) AS total_respuestas
      FROM actividades_formularios f
      WHERE f.idactividades = ?
      ORDER BY f.created_at, f.idactividades_formularios
    `, [req.params.idact]);
    res.json(rows.map(r => ({ ...r, publico: !!r.publico, activo: !!r.activo })));
  } catch (err) { next(err); }
});

/* ── Obtener uno (para el editor) ────────────────────────────── */
router.get('/:id', checkPermission('actividades', 'S'), async (req, res, next) => {
  try {
    const [[row]] = await pool.query(`
      SELECT f.*, a.nombre AS actividad_nombre, a.logo AS actividad_logo
      FROM actividades_formularios f
      JOIN actividades a ON a.idactividades = f.idactividades
      WHERE f.idactividades_formularios = ?
    `, [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Formulario no encontrado' });
    res.json(filaFormulario(row));
  } catch (err) { next(err); }
});

/* ── Crear ───────────────────────────────────────────────────── */
router.post('/actividad/:idact', checkPermission('actividades', 'E'), async (req, res, next) => {
  try {
    const [[act]] = await pool.query('SELECT idactividades FROM actividades WHERE idactividades = ?', [req.params.idact]);
    if (!act) return res.status(404).json({ error: 'Actividad no encontrada' });

    let d;
    try { d = datosDesdeBody(req.body); } catch (e) { return res.status(400).json({ error: e.message }); }

    const token = nuevoToken();
    const [r] = await pool.query(`
      INSERT INTO actividades_formularios
        (idactividades, titulo, descripcion, token, publico, activo, fecha_limite,
         mensaje_confirmacion, notificaciones, preguntas, usuario)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [act.idactividades, d.titulo, d.descripcion, token, d.publico, d.activo, d.fecha_limite,
        d.mensaje_confirmacion, JSON.stringify(d.notificaciones), JSON.stringify(d.preguntas), req.user.usuario]);
    res.status(201).json({ id: r.insertId, token });
  } catch (err) { next(err); }
});

/* ── Actualizar ──────────────────────────────────────────────── */
router.put('/:id', checkPermission('actividades', 'E'), async (req, res, next) => {
  try {
    let d;
    try { d = datosDesdeBody(req.body); } catch (e) { return res.status(400).json({ error: e.message }); }

    const [r] = await pool.query(`
      UPDATE actividades_formularios SET
        titulo = ?, descripcion = ?, publico = ?, activo = ?, fecha_limite = ?,
        mensaje_confirmacion = ?, notificaciones = ?, preguntas = ?
      WHERE idactividades_formularios = ?
    `, [d.titulo, d.descripcion, d.publico, d.activo, d.fecha_limite,
        d.mensaje_confirmacion, JSON.stringify(d.notificaciones), JSON.stringify(d.preguntas), req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Formulario no encontrado' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/* ── Activar / desactivar rápido ─────────────────────────────── */
router.patch('/:id/activo', checkPermission('actividades', 'E'), async (req, res, next) => {
  try {
    const [r] = await pool.query(
      'UPDATE actividades_formularios SET activo = ? WHERE idactividades_formularios = ?',
      [req.body.activo ? 1 : 0, req.params.id]
    );
    if (!r.affectedRows) return res.status(404).json({ error: 'Formulario no encontrado' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/* ── Eliminar ────────────────────────────────────────────────── */
router.delete('/:id', checkPermission('actividades', 'E'), async (req, res, next) => {
  try {
    const [r] = await pool.query('DELETE FROM actividades_formularios WHERE idactividades_formularios = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Formulario no encontrado' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/* ── Respuestas (reporte) ────────────────────────────────────── */
router.get('/:id/respuestas', checkPermission('actividades', 'S'), async (req, res, next) => {
  try {
    const [[form]] = await pool.query(`
      SELECT f.*, a.nombre AS actividad_nombre, a.logo AS actividad_logo,
             a.fecha_inicio AS actividad_fecha_inicio, a.fecha_fin AS actividad_fecha_fin
      FROM actividades_formularios f
      JOIN actividades a ON a.idactividades = f.idactividades
      WHERE f.idactividades_formularios = ?
    `, [req.params.id]);
    if (!form) return res.status(404).json({ error: 'Formulario no encontrado' });

    const [rows] = await pool.query(`
      SELECT idactividades_formularios_respuestas AS id, respuestas, usuario, created_at
      FROM actividades_formularios_respuestas
      WHERE idactividades_formularios = ?
      ORDER BY created_at, idactividades_formularios_respuestas
    `, [req.params.id]);

    const formulario = filaFormulario(form);
    const respuestas = rows.map(r => ({ ...r, respuestas: parseJson(r.respuestas, {}) }));

    // Datos actuales (nombre/foto) de las personas registradas que aparecen en las respuestas
    const clavesPersona = formulario.preguntas.filter(q => q.tipo === 'persona').map(q => q.clave);
    const ids = new Set();
    for (const r of respuestas) {
      for (const c of clavesPersona) {
        const id = r.respuestas[c]?.idpersonas;
        if (id) ids.add(id);
      }
    }
    const personas = {};
    if (ids.size) {
      const [ps] = await pool.query(
        `SELECT p.idpersonas, ${NOMBRE_PERSONA_SQL} AS nombre, p.foto
         FROM personas p WHERE p.idpersonas IN (?)`, [[...ids]]
      );
      for (const p of ps) personas[p.idpersonas] = { nombre: p.nombre, foto: p.foto };
    }

    res.json({ formulario, respuestas, personas });
  } catch (err) { next(err); }
});

router.delete('/:id/respuestas/:idresp', checkPermission('actividades', 'E'), async (req, res, next) => {
  try {
    const [r] = await pool.query(
      `DELETE FROM actividades_formularios_respuestas
       WHERE idactividades_formularios_respuestas = ? AND idactividades_formularios = ?`,
      [req.params.idresp, req.params.id]
    );
    if (!r.affectedRows) return res.status(404).json({ error: 'Respuesta no encontrada' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/* ── Registrar en Personas a una persona "nueva" de una respuesta ─ */
router.post('/:id/respuestas/:idresp/registrar-persona', checkPermission('personas', 'A'), async (req, res, next) => {
  try {
    const { clave } = req.body;
    const [[form]] = await pool.query(
      'SELECT preguntas FROM actividades_formularios WHERE idactividades_formularios = ?', [req.params.id]
    );
    if (!form) return res.status(404).json({ error: 'Formulario no encontrado' });
    const preguntas = parseJson(form.preguntas, []);
    const q = preguntas.find(x => x.clave === clave && x.tipo === 'persona');
    if (!q) return res.status(400).json({ error: 'Pregunta de persona inválida' });

    const [[resp]] = await pool.query(
      `SELECT respuestas FROM actividades_formularios_respuestas
       WHERE idactividades_formularios_respuestas = ? AND idactividades_formularios = ?`,
      [req.params.idresp, req.params.id]
    );
    if (!resp) return res.status(404).json({ error: 'Respuesta no encontrada' });
    const respuestas = parseJson(resp.respuestas, {});
    const val = respuestas[clave];
    if (!val || val.modo !== 'nueva') return res.status(400).json({ error: 'Esta respuesta no contiene una persona nueva' });
    if (!val.primer_nombre || !val.primer_apellido) {
      return res.status(400).json({ error: 'La persona no tiene primer nombre y primer apellido' });
    }

    // Columnas: nombres de la pregunta persona + campos enlazados a ella
    const cols = {
      primer_nombre:    val.primer_nombre,
      segundo_nombre:   val.segundo_nombre || null,
      primer_apellido:  val.primer_apellido,
      segundo_apellido: val.segundo_apellido || null,
    };
    for (const p of preguntas) {
      if (p.pregunta_persona === clave && p.campo_persona && CAMPOS_PERSONA[p.campo_persona]) {
        const v = valorHaciaPersona(p.campo_persona, respuestas[p.clave]);
        if (v !== null) cols[p.campo_persona] = v;
      }
    }
    cols.usuario = req.user.usuario;

    const nombres = Object.keys(cols);
    const [r] = await pool.query(
      `INSERT INTO personas (${nombres.map(n => `\`${n}\``).join(', ')}, fechacreacion)
       VALUES (${nombres.map(() => '?').join(', ')}, NOW())`,
      nombres.map(n => cols[n])
    );

    respuestas[clave] = {
      modo: 'registrada',
      idpersonas: r.insertId,
      nombre: [val.primer_nombre, val.segundo_nombre, val.primer_apellido, val.segundo_apellido].filter(Boolean).join(' '),
      registrada_desde_formulario: true,
    };
    await pool.query(
      'UPDATE actividades_formularios_respuestas SET respuestas = ? WHERE idactividades_formularios_respuestas = ?',
      [JSON.stringify(respuestas), req.params.idresp]
    );
    res.status(201).json({ idpersonas: r.insertId });
  } catch (err) { next(err); }
});

module.exports = router;
