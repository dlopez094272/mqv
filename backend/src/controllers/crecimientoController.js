const { pool } = require('../config/database');
const path = require('path');
const fs   = require('fs');

// ── Directorios de archivos ───────────────────────────────────────
const logosDir   = path.join(__dirname, '..', '..', 'files', 'cursos', 'logos');
const videosDir  = path.join(__dirname, '..', '..', 'files', 'cursos', 'videos');
const archivosDir = path.join(__dirname, '..', '..', 'files', 'cursos', 'archivos');

function safeDeleteFile(filePath) {
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}
}

// ════════════════════════════════════════════════════════════════
// GESTIÓN DE CURSOS
// ════════════════════════════════════════════════════════════════

async function listarCursos(req, res, next) {
  try {
    const isSuperAdmin = req.user?.is_superadmin;
    const where  = isSuperAdmin ? '' : 'WHERE c.created_by = ?';
    const params = isSuperAdmin ? [] : [req.user.usuario];
    const [rows] = await pool.query(`
      SELECT c.*,
             (SELECT COUNT(*) FROM cursos_asignaciones ca WHERE ca.idcursos = c.idcursos) AS total_asignados,
             (SELECT COUNT(*) FROM cursos_preguntas cp WHERE cp.idcursos = c.idcursos)    AS total_preguntas,
             (SELECT COUNT(*) FROM cursos_contenido cc WHERE cc.idcursos = c.idcursos)    AS total_contenido
      FROM cursos c
      ${where}
      ORDER BY c.nombre
    `, params);
    res.json(rows);
  } catch (err) { next(err); }
}

async function obtenerCurso(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const [[curso]] = await pool.query('SELECT * FROM cursos WHERE idcursos = ?', [id]);
    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });
    if (!req.user?.is_superadmin && curso.created_by !== req.user.usuario)
      return res.status(403).json({ error: 'No tienes permiso para ver este curso' });

    const [contenido] = await pool.query(
      'SELECT * FROM cursos_contenido WHERE idcursos = ? ORDER BY orden, idcontenido',
      [id]
    );
    for (const c of contenido) {
      const [archivos] = await pool.query(
        'SELECT * FROM cursos_archivos WHERE idcontenido = ? ORDER BY created_at',
        [c.idcontenido]
      );
      c.archivos = archivos;
    }

    const [preguntas] = await pool.query(
      'SELECT * FROM cursos_preguntas WHERE idcursos = ? ORDER BY orden, idpregunta',
      [id]
    );
    for (const p of preguntas) {
      const [opciones] = await pool.query(
        'SELECT * FROM cursos_opciones WHERE idpregunta = ? ORDER BY orden, idopcion',
        [p.idpregunta]
      );
      p.opciones = opciones;
    }

    res.json({ ...curso, contenido, preguntas });
  } catch (err) { next(err); }
}

async function crearCurso(req, res, next) {
  try {
    const { nombre, descripcion, color } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre del curso es requerido' });

    const logo = req.file ? req.file.filename : null;
    const [r] = await pool.query(
      'INSERT INTO cursos (nombre, descripcion, color, logo, created_by) VALUES (?, ?, ?, ?, ?)',
      [nombre.trim(), descripcion || null, color || '#3788d8', logo, req.user.usuario]
    );
    res.status(201).json({ message: 'Curso creado correctamente', idcursos: r.insertId });
  } catch (err) { next(err); }
}

async function actualizarCurso(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const [[curso]] = await pool.query('SELECT * FROM cursos WHERE idcursos = ?', [id]);
    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });
    if (!req.user?.is_superadmin && curso.created_by !== req.user.usuario)
      return res.status(403).json({ error: 'No tienes permiso para editar este curso' });

    const { nombre, descripcion, color } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre del curso es requerido' });

    let logo = curso.logo;
    if (req.file) {
      if (curso.logo) safeDeleteFile(path.join(logosDir, curso.logo));
      logo = req.file.filename;
    }

    await pool.query(
      'UPDATE cursos SET nombre = ?, descripcion = ?, color = ?, logo = ? WHERE idcursos = ?',
      [nombre.trim(), descripcion || null, color || '#3788d8', logo, id]
    );
    res.json({ message: 'Curso actualizado correctamente' });
  } catch (err) { next(err); }
}

async function toggleCurso(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const [[curso]] = await pool.query('SELECT activo, created_by FROM cursos WHERE idcursos = ?', [id]);
    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });
    if (!req.user?.is_superadmin && curso.created_by !== req.user.usuario)
      return res.status(403).json({ error: 'No tienes permiso para modificar este curso' });
    await pool.query('UPDATE cursos SET activo = ? WHERE idcursos = ?', [curso.activo ? 0 : 1, id]);
    res.json({ message: curso.activo ? 'Curso inactivado' : 'Curso activado' });
  } catch (err) { next(err); }
}

// ════════════════════════════════════════════════════════════════
// CONTENIDO DEL CURSO
// ════════════════════════════════════════════════════════════════

async function crearContenido(req, res, next) {
  try {
    const idcursos = parseInt(req.params.id);
    const [[curso]] = await pool.query('SELECT idcursos FROM cursos WHERE idcursos = ?', [idcursos]);
    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });

    const { titulo, descripcion, orden } = req.body;
    if (!titulo?.trim()) return res.status(400).json({ error: 'El título es requerido' });

    let video_filename = null, video_nombre_original = null;
    if (req.files?.video?.[0]) {
      video_filename       = req.files.video[0].filename;
      video_nombre_original = req.files.video[0].originalname;
    }

    const [r] = await pool.query(
      `INSERT INTO cursos_contenido (idcursos, titulo, descripcion, video_filename, video_nombre_original, orden)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [idcursos, titulo.trim(), descripcion || null, video_filename, video_nombre_original, parseInt(orden) || 0]
    );

    if (req.files?.archivos?.length) {
      for (const f of req.files.archivos) {
        await pool.query(
          'INSERT INTO cursos_archivos (idcontenido, nombre_original, filename, mimetype, tamanio) VALUES (?, ?, ?, ?, ?)',
          [r.insertId, f.originalname, f.filename, f.mimetype, f.size]
        );
      }
    }

    res.status(201).json({ message: 'Contenido creado', idcontenido: r.insertId });
  } catch (err) { next(err); }
}

async function actualizarContenido(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const [[cont]] = await pool.query('SELECT * FROM cursos_contenido WHERE idcontenido = ?', [id]);
    if (!cont) return res.status(404).json({ error: 'Contenido no encontrado' });

    const { titulo, descripcion, orden } = req.body;
    if (!titulo?.trim()) return res.status(400).json({ error: 'El título es requerido' });

    let video_filename = cont.video_filename;
    let video_nombre_original = cont.video_nombre_original;

    if (req.files?.video?.[0]) {
      if (cont.video_filename) safeDeleteFile(path.join(videosDir, cont.video_filename));
      video_filename       = req.files.video[0].filename;
      video_nombre_original = req.files.video[0].originalname;
    }

    await pool.query(
      `UPDATE cursos_contenido SET titulo = ?, descripcion = ?, video_filename = ?, video_nombre_original = ?, orden = ?
       WHERE idcontenido = ?`,
      [titulo.trim(), descripcion || null, video_filename, video_nombre_original, parseInt(orden) || 0, id]
    );

    if (req.files?.archivos?.length) {
      for (const f of req.files.archivos) {
        await pool.query(
          'INSERT INTO cursos_archivos (idcontenido, nombre_original, filename, mimetype, tamanio) VALUES (?, ?, ?, ?, ?)',
          [id, f.originalname, f.filename, f.mimetype, f.size]
        );
      }
    }

    res.json({ message: 'Contenido actualizado' });
  } catch (err) { next(err); }
}

async function eliminarContenido(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const [[cont]] = await pool.query('SELECT * FROM cursos_contenido WHERE idcontenido = ?', [id]);
    if (!cont) return res.status(404).json({ error: 'Contenido no encontrado' });

    if (cont.video_filename) safeDeleteFile(path.join(videosDir, cont.video_filename));

    const [archivos] = await pool.query('SELECT filename FROM cursos_archivos WHERE idcontenido = ?', [id]);
    for (const a of archivos) safeDeleteFile(path.join(archivosDir, a.filename));

    await pool.query('DELETE FROM cursos_contenido WHERE idcontenido = ?', [id]);
    res.json({ message: 'Contenido eliminado' });
  } catch (err) { next(err); }
}

async function eliminarVideo(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const [[cont]] = await pool.query('SELECT * FROM cursos_contenido WHERE idcontenido = ?', [id]);
    if (!cont) return res.status(404).json({ error: 'Contenido no encontrado' });

    if (cont.video_filename) safeDeleteFile(path.join(videosDir, cont.video_filename));
    await pool.query('UPDATE cursos_contenido SET video_filename = NULL, video_nombre_original = NULL WHERE idcontenido = ?', [id]);
    res.json({ message: 'Video eliminado' });
  } catch (err) { next(err); }
}

async function eliminarArchivo(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const [[arch]] = await pool.query('SELECT * FROM cursos_archivos WHERE idarchivo = ?', [id]);
    if (!arch) return res.status(404).json({ error: 'Archivo no encontrado' });

    safeDeleteFile(path.join(archivosDir, arch.filename));
    await pool.query('DELETE FROM cursos_archivos WHERE idarchivo = ?', [id]);
    res.json({ message: 'Archivo eliminado' });
  } catch (err) { next(err); }
}

// ════════════════════════════════════════════════════════════════
// PREGUNTAS Y OPCIONES
// ════════════════════════════════════════════════════════════════

async function crearPregunta(req, res, next) {
  try {
    const idcursos = parseInt(req.params.id);
    const [[curso]] = await pool.query('SELECT idcursos FROM cursos WHERE idcursos = ?', [idcursos]);
    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });

    const { pregunta, orden, opciones } = req.body;
    if (!pregunta?.trim()) return res.status(400).json({ error: 'La pregunta es requerida' });
    if (!Array.isArray(opciones) || opciones.length < 2)
      return res.status(400).json({ error: 'Se requieren al menos 2 opciones' });
    if (!opciones.some(o => o.es_correcta))
      return res.status(400).json({ error: 'Debe indicar al menos una opción correcta' });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [r] = await conn.query(
        'INSERT INTO cursos_preguntas (idcursos, pregunta, orden) VALUES (?, ?, ?)',
        [idcursos, pregunta.trim(), parseInt(orden) || 0]
      );
      for (let i = 0; i < opciones.length; i++) {
        const o = opciones[i];
        await conn.query(
          'INSERT INTO cursos_opciones (idpregunta, texto, es_correcta, orden) VALUES (?, ?, ?, ?)',
          [r.insertId, o.texto.trim(), o.es_correcta ? 1 : 0, i]
        );
      }
      await conn.commit();
      res.status(201).json({ message: 'Pregunta creada', idpregunta: r.insertId });
    } catch (e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
  } catch (err) { next(err); }
}

async function actualizarPregunta(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const [[preg]] = await pool.query('SELECT * FROM cursos_preguntas WHERE idpregunta = ?', [id]);
    if (!preg) return res.status(404).json({ error: 'Pregunta no encontrada' });

    const { pregunta, orden, opciones } = req.body;
    if (!pregunta?.trim()) return res.status(400).json({ error: 'La pregunta es requerida' });
    if (!Array.isArray(opciones) || opciones.length < 2)
      return res.status(400).json({ error: 'Se requieren al menos 2 opciones' });
    if (!opciones.some(o => o.es_correcta))
      return res.status(400).json({ error: 'Debe indicar al menos una opción correcta' });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        'UPDATE cursos_preguntas SET pregunta = ?, orden = ? WHERE idpregunta = ?',
        [pregunta.trim(), parseInt(orden) || 0, id]
      );
      await conn.query('DELETE FROM cursos_opciones WHERE idpregunta = ?', [id]);
      for (let i = 0; i < opciones.length; i++) {
        const o = opciones[i];
        await conn.query(
          'INSERT INTO cursos_opciones (idpregunta, texto, es_correcta, orden) VALUES (?, ?, ?, ?)',
          [id, o.texto.trim(), o.es_correcta ? 1 : 0, i]
        );
      }
      await conn.commit();
      res.json({ message: 'Pregunta actualizada' });
    } catch (e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
  } catch (err) { next(err); }
}

async function eliminarPregunta(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const [r] = await pool.query('DELETE FROM cursos_preguntas WHERE idpregunta = ?', [id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Pregunta no encontrada' });
    res.json({ message: 'Pregunta eliminada' });
  } catch (err) { next(err); }
}

// ════════════════════════════════════════════════════════════════
// ASIGNACIONES
// ════════════════════════════════════════════════════════════════

async function listarAsignaciones(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const [rows] = await pool.query(`
      SELECT ca.idasignacion, ca.usuario, ca.asignado_at,
             u.nombre_completo,
             (SELECT aprobado FROM cursos_evaluaciones
              WHERE idcursos = ca.idcursos AND usuario = ca.usuario
              ORDER BY idevaluacion DESC LIMIT 1) AS aprobado
      FROM cursos_asignaciones ca
      LEFT JOIN usuarios u ON u.usuario = ca.usuario
      WHERE ca.idcursos = ?
      ORDER BY u.nombre_completo
    `, [id]);
    res.json(rows);
  } catch (err) { next(err); }
}

async function asignarUsuarios(req, res, next) {
  try {
    const idcursos = parseInt(req.params.id);
    const { usuarios } = req.body;
    if (!Array.isArray(usuarios) || !usuarios.length)
      return res.status(400).json({ error: 'Debe seleccionar al menos un usuario' });

    let insertados = 0;
    for (const u of usuarios) {
      try {
        await pool.query(
          'INSERT IGNORE INTO cursos_asignaciones (idcursos, usuario, asignado_por) VALUES (?, ?, ?)',
          [idcursos, u, req.user.usuario]
        );
        insertados++;
      } catch (_) {}
    }
    res.status(201).json({ message: `${insertados} usuario(s) asignado(s)` });
  } catch (err) { next(err); }
}

async function quitarAsignacion(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const [r] = await pool.query('DELETE FROM cursos_asignaciones WHERE idasignacion = ?', [id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Asignación no encontrada' });
    res.json({ message: 'Asignación eliminada' });
  } catch (err) { next(err); }
}

async function usuariosDisponibles(req, res, next) {
  try {
    const idcursos = parseInt(req.params.id);
    const [rows] = await pool.query(`
      SELECT u.usuario, u.nombre_completo
      FROM usuarios u
      WHERE u.activo = 1
        AND u.usuario NOT IN (
          SELECT usuario FROM cursos_asignaciones WHERE idcursos = ?
        )
      ORDER BY u.nombre_completo
    `, [idcursos]);
    res.json(rows);
  } catch (err) { next(err); }
}

// ════════════════════════════════════════════════════════════════
// MIS CURSOS (vista del usuario)
// ════════════════════════════════════════════════════════════════

async function misCursos(req, res, next) {
  try {
    const usuario = req.user.usuario;
    const [rows] = await pool.query(`
      SELECT c.idcursos, c.nombre, c.descripcion, c.logo, c.color, c.activo,
             ca.asignado_at,
             (SELECT idevaluacion FROM cursos_evaluaciones
              WHERE idcursos = c.idcursos AND usuario = ? AND aprobado = 1
              ORDER BY idevaluacion DESC LIMIT 1) AS idevaluacion_aprobada
      FROM cursos_asignaciones ca
      JOIN cursos c ON c.idcursos = ca.idcursos
      WHERE ca.usuario = ? AND c.activo = 1
      ORDER BY c.nombre
    `, [usuario, usuario]);
    res.json(rows);
  } catch (err) { next(err); }
}

async function miCursoDetalle(req, res, next) {
  try {
    const usuario  = req.user.usuario;
    const idcursos = parseInt(req.params.id);

    const [[asig]] = await pool.query(
      'SELECT 1 FROM cursos_asignaciones WHERE idcursos = ? AND usuario = ?',
      [idcursos, usuario]
    );
    if (!asig && !req.user.is_superadmin) return res.status(403).json({ error: 'No tienes acceso a este curso' });

    const [[curso]] = await pool.query('SELECT * FROM cursos WHERE idcursos = ? AND activo = 1', [idcursos]);
    if (!curso) return res.status(404).json({ error: 'Curso no encontrado' });

    const [contenido] = await pool.query(
      'SELECT * FROM cursos_contenido WHERE idcursos = ? ORDER BY orden, idcontenido',
      [idcursos]
    );
    for (const c of contenido) {
      const [archivos] = await pool.query(
        'SELECT idarchivo, nombre_original, filename, mimetype, tamanio FROM cursos_archivos WHERE idcontenido = ? ORDER BY created_at',
        [c.idcontenido]
      );
      c.archivos = archivos;
    }

    const totalPreguntas = await pool.query(
      'SELECT COUNT(*) AS total FROM cursos_preguntas WHERE idcursos = ?', [idcursos]
    );

    const [[evaluacion]] = await pool.query(`
      SELECT idevaluacion, puntaje, aprobado, completado_at
      FROM cursos_evaluaciones
      WHERE idcursos = ? AND usuario = ? AND aprobado = 1
      ORDER BY idevaluacion DESC LIMIT 1
    `, [idcursos, usuario]);

    res.json({
      ...curso,
      contenido,
      total_preguntas: totalPreguntas[0][0].total,
      evaluacion_aprobada: evaluacion || null,
    });
  } catch (err) { next(err); }
}

async function obtenerPreguntas(req, res, next) {
  try {
    const usuario  = req.user.usuario;
    const idcursos = parseInt(req.params.id);

    const [[asig]] = await pool.query(
      'SELECT 1 FROM cursos_asignaciones WHERE idcursos = ? AND usuario = ?',
      [idcursos, usuario]
    );
    if (!asig && !req.user.is_superadmin) return res.status(403).json({ error: 'No tienes acceso a este curso' });

    const [preguntas] = await pool.query(
      'SELECT idpregunta, pregunta, orden FROM cursos_preguntas WHERE idcursos = ? ORDER BY orden, idpregunta',
      [idcursos]
    );
    for (const p of preguntas) {
      const [opciones] = await pool.query(
        'SELECT idopcion, texto, orden FROM cursos_opciones WHERE idpregunta = ? ORDER BY orden',
        [p.idpregunta]
      );
      p.opciones = opciones;
    }

    res.json(preguntas);
  } catch (err) { next(err); }
}

async function evaluarCurso(req, res, next) {
  try {
    const usuario  = req.user.usuario;
    const idcursos = parseInt(req.params.id);
    const { respuestas } = req.body; // [{ idpregunta, idopcion }]

    const [[asig]] = await pool.query(
      'SELECT 1 FROM cursos_asignaciones WHERE idcursos = ? AND usuario = ?',
      [idcursos, usuario]
    );
    if (!asig && !req.user.is_superadmin) return res.status(403).json({ error: 'No tienes acceso a este curso' });

    const [preguntas] = await pool.query(
      'SELECT idpregunta FROM cursos_preguntas WHERE idcursos = ?', [idcursos]
    );
    if (!preguntas.length) return res.status(400).json({ error: 'Este curso no tiene preguntas de evaluación' });

    if (!Array.isArray(respuestas) || respuestas.length < preguntas.length)
      return res.status(400).json({ error: 'Debe responder todas las preguntas' });

    let correctas = 0;
    for (const r of respuestas) {
      const [[opcion]] = await pool.query(
        'SELECT es_correcta FROM cursos_opciones WHERE idopcion = ? AND idpregunta = ?',
        [r.idopcion, r.idpregunta]
      );
      if (opcion?.es_correcta) correctas++;
    }

    const puntaje = Math.round((correctas / preguntas.length) * 100 * 100) / 100;
    const aprobado = puntaje >= 80 ? 1 : 0;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [ev] = await conn.query(
        'INSERT INTO cursos_evaluaciones (idcursos, usuario, puntaje, aprobado) VALUES (?, ?, ?, ?)',
        [idcursos, usuario, puntaje, aprobado]
      );
      for (const r of respuestas) {
        await conn.query(
          'INSERT INTO cursos_respuestas (idevaluacion, idpregunta, idopcion) VALUES (?, ?, ?)',
          [ev.insertId, r.idpregunta, r.idopcion]
        );
      }
      await conn.commit();
    } catch (e) { await conn.rollback(); throw e; }
    finally { conn.release(); }

    res.json({ puntaje, aprobado: aprobado === 1, correctas, total: preguntas.length });
  } catch (err) { next(err); }
}

async function datosCertificado(req, res, next) {
  try {
    const usuario  = req.user.usuario;
    const idcursos = parseInt(req.params.id);

    const [[ev]] = await pool.query(`
      SELECT ce.idevaluacion, ce.puntaje, ce.completado_at,
             c.nombre AS curso_nombre, c.logo AS curso_logo, c.color AS curso_color
      FROM cursos_evaluaciones ce
      JOIN cursos c ON c.idcursos = ce.idcursos
      WHERE ce.idcursos = ? AND ce.usuario = ? AND ce.aprobado = 1
      ORDER BY ce.idevaluacion DESC LIMIT 1
    `, [idcursos, usuario]);
    if (!ev) return res.status(404).json({ error: 'No tienes una evaluación aprobada para este curso' });

    const [[u]] = await pool.query(
      'SELECT nombre_completo FROM usuarios WHERE usuario = ?', [usuario]
    );

    res.json({ ...ev, nombre_completo: u?.nombre_completo || usuario });
  } catch (err) { next(err); }
}

// Dashboard: mis logros (cursos aprobados)
async function misLogros(req, res, next) {
  try {
    const usuario = req.user.usuario;
    const [rows] = await pool.query(`
      SELECT c.idcursos, c.nombre, c.logo, c.color,
             ce.puntaje, ce.completado_at, ce.idevaluacion
      FROM cursos_evaluaciones ce
      JOIN cursos c ON c.idcursos = ce.idcursos
      WHERE ce.usuario = ? AND ce.aprobado = 1
      GROUP BY c.idcursos
      ORDER BY ce.completado_at DESC
    `, [usuario]);
    res.json(rows);
  } catch (err) { next(err); }
}

module.exports = {
  listarCursos, obtenerCurso, crearCurso, actualizarCurso, toggleCurso,
  crearContenido, actualizarContenido, eliminarContenido, eliminarVideo, eliminarArchivo,
  crearPregunta, actualizarPregunta, eliminarPregunta,
  listarAsignaciones, asignarUsuarios, quitarAsignacion, usuariosDisponibles,
  misCursos, miCursoDetalle, obtenerPreguntas, evaluarCurso, datosCertificado, misLogros,
};
