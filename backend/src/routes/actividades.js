const router = require('express').Router();
const path   = require('path');
const fs     = require('fs');
const multer = require('multer');
const { pool }       = require('../config/database');
const authMiddleware = require('../middleware/authMiddleware');
const checkPermission = require('../middleware/permissionsMiddleware');
const { tienePermiso } = require('../middleware/permissionsMiddleware');
const { recalcularSaldo, verificarAccesoTesoreria } = require('../utils/tesoreriaAccess');

const logosDir    = path.join(__dirname, '..', '..', 'files', 'actividades', 'logos');
const adjuntosDir = path.join(__dirname, '..', '..', 'files', 'actividades', 'adjuntos');
fs.mkdirSync(logosDir,    { recursive: true });
fs.mkdirSync(adjuntosDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, file.fieldname === 'logo' ? logosDir : adjuntosDir);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const safe = path.basename(file.originalname, ext)
                     .replace(/[^a-zA-Z0-9-_]/g, '_')
                     .slice(0, 60);
    cb(null, `${Date.now()}-${safe}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'logo' && !file.mimetype.startsWith('image/')) {
    return cb(new Error('El logo debe ser un archivo de imagen (jpg, png, gif, webp...)'));
  }
  cb(null, true);
};

const uploadFields = multer({
  storage,
  fileFilter,
  limits: { fileSize: 200 * 1024 * 1024 },
}).fields([
  { name: 'logo',     maxCount: 1  },
  { name: 'adjuntos', maxCount: 20 },
]);

router.use(authMiddleware);

/* ── Grupos disponibles (lookup para multiselect) ────────────── */
router.get('/grupos-disponibles', checkPermission('actividades', 'S'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT idgrupos AS id, grupo AS nombre FROM grupos WHERE activo = 1 ORDER BY grupo'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* ── Listar ──────────────────────────────────────────────────── */
router.get('/', checkPermission('actividades', 'S'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.*,
             ac.categoria,
             IFNULL(ac.color, '#3788d8') AS categoria_color,
             l.lugar
      FROM actividades a
      LEFT JOIN actividades_categorias ac ON ac.idactividades_categorias = a.idcategorias
      LEFT JOIN lugares l ON l.idlugares = a.idlugares
      ORDER BY a.fecha_inicio, a.nombre
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

/* ── Adjunto autenticado ─────────────────────────────────────── */
router.get('/adjuntos/:filename', checkPermission('actividades', 'S'), (req, res) => {
  const filePath = path.join(adjuntosDir, path.basename(req.params.filename));
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado' });
  res.sendFile(filePath);
});

/* ── Grupos de una actividad ─────────────────────────────────── */
router.get('/:id/grupos', checkPermission('actividades', 'S'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT idgrupos FROM actividades_grupos WHERE idactividades = ?',
      [req.params.id]
    );
    res.json(rows.map(r => r.idgrupos));
  } catch (err) { next(err); }
});

/* ── Obtener uno ─────────────────────────────────────────────── */
router.get('/:id', checkPermission('actividades', 'S'), async (req, res, next) => {
  try {
    const [[row]] = await pool.query(`
      SELECT a.*,
             ac.categoria,
             IFNULL(ac.color, '#3788d8') AS categoria_color,
             l.lugar
      FROM actividades a
      LEFT JOIN actividades_categorias ac ON ac.idactividades_categorias = a.idcategorias
      LEFT JOIN lugares l ON l.idlugares = a.idlugares
      WHERE a.idactividades = ?
    `, [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Actividad no encontrada' });
    res.json(row);
  } catch (err) { next(err); }
});

/* ── Crear ───────────────────────────────────────────────────── */
router.post('/', checkPermission('actividades', 'A'), (req, res, next) => {
  uploadFields(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Error de subida: ${err.message}` });
    }
    if (err) return res.status(400).json({ error: err.message });

    try {
      const { idcategorias, nombre, descripcion, fecha_inicio, fecha_fin,
              hora_inicio, hora_fin, idlugares } = req.body;

      if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });
      if (!fecha_inicio)   return res.status(400).json({ error: 'La fecha de inicio es requerida' });
      if (!fecha_fin)      return res.status(400).json({ error: 'La fecha de fin es requerida' });

      const logo = req.files?.logo?.[0]?.filename || null;
      const adjuntos = (req.files?.adjuntos || []).map(f => ({
        filename:     f.filename,
        originalname: f.originalname,
        mimetype:     f.mimetype,
        size:         f.size,
      }));

      const [r] = await pool.query(`
        INSERT INTO actividades
          (idcategorias, nombre, descripcion, fecha_inicio, fecha_fin,
           hora_inicio, hora_fin, adjuntos, logo, idlugares, usuario)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        idcategorias || null,
        nombre.trim(),
        descripcion  || null,
        fecha_inicio,
        fecha_fin,
        hora_inicio  || null,
        hora_fin     || null,
        JSON.stringify(adjuntos),
        logo,
        idlugares    || null,
        req.user.usuario,
      ]);

      // Insertar grupos asociados
      const grupos = req.body.grupos;
      if (grupos) {
        let gruposIds = [];
        try { gruposIds = JSON.parse(grupos); } catch {}
        if (gruposIds.length) {
          const vals = gruposIds.map(gId => [r.insertId, gId]);
          await pool.query('INSERT INTO actividades_grupos (idactividades, idgrupos) VALUES ?', [vals]);
        }
      }

      res.status(201).json({ id: r.insertId });
    } catch (dbErr) { next(dbErr); }
  });
});

/* ── Actualizar ──────────────────────────────────────────────── */
router.put('/:id', checkPermission('actividades', 'E'), (req, res, next) => {
  uploadFields(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Error de subida: ${err.message}` });
    }
    if (err) return res.status(400).json({ error: err.message });

    try {
      const [[existing]] = await pool.query(
        'SELECT logo, adjuntos FROM actividades WHERE idactividades = ?',
        [req.params.id]
      );
      if (!existing) return res.status(404).json({ error: 'Actividad no encontrada' });

      const { idcategorias, nombre, descripcion, fecha_inicio, fecha_fin,
              hora_inicio, hora_fin, idlugares,
              adjuntos_existentes, eliminar_logo } = req.body;

      if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });
      if (!fecha_inicio)   return res.status(400).json({ error: 'La fecha de inicio es requerida' });
      if (!fecha_fin)      return res.status(400).json({ error: 'La fecha de fin es requerida' });

      // Manejo de logo
      let logo = existing.logo;
      if (eliminar_logo === 'true') {
        if (existing.logo) { try { fs.unlinkSync(path.join(logosDir, existing.logo)); } catch {} }
        logo = null;
      }
      if (req.files?.logo?.[0]) {
        if (existing.logo) { try { fs.unlinkSync(path.join(logosDir, existing.logo)); } catch {} }
        logo = req.files.logo[0].filename;
      }

      // Manejo de adjuntos: conservar los que quedan + agregar nuevos
      let adjuntosActuales = [];
      try { adjuntosActuales = JSON.parse(existing.adjuntos || '[]'); } catch {}

      if (adjuntos_existentes !== undefined) {
        let keepFilenames = [];
        try { keepFilenames = JSON.parse(adjuntos_existentes); } catch {}
        for (const adj of adjuntosActuales) {
          if (!keepFilenames.includes(adj.filename)) {
            try { fs.unlinkSync(path.join(adjuntosDir, adj.filename)); } catch {}
          }
        }
        adjuntosActuales = adjuntosActuales.filter(a => keepFilenames.includes(a.filename));
      }

      const nuevos = (req.files?.adjuntos || []).map(f => ({
        filename:     f.filename,
        originalname: f.originalname,
        mimetype:     f.mimetype,
        size:         f.size,
      }));

      const adjuntosFinales = [...adjuntosActuales, ...nuevos];

      const [r] = await pool.query(`
        UPDATE actividades SET
          idcategorias = ?, nombre = ?, descripcion = ?,
          fecha_inicio = ?, fecha_fin = ?,
          hora_inicio = ?, hora_fin = ?,
          adjuntos = ?, logo = ?, idlugares = ?
        WHERE idactividades = ?
      `, [
        idcategorias || null,
        nombre.trim(),
        descripcion  || null,
        fecha_inicio,
        fecha_fin,
        hora_inicio  || null,
        hora_fin     || null,
        JSON.stringify(adjuntosFinales),
        logo,
        idlugares    || null,
        req.params.id,
      ]);

      if (!r.affectedRows) return res.status(404).json({ error: 'No encontrado' });

      // Sincronizar grupos asociados
      const grupos = req.body.grupos;
      if (grupos !== undefined) {
        let gruposIds = [];
        try { gruposIds = JSON.parse(grupos); } catch {}
        await pool.query('DELETE FROM actividades_grupos WHERE idactividades = ?', [req.params.id]);
        if (gruposIds.length) {
          const vals = gruposIds.map(gId => [req.params.id, gId]);
          await pool.query('INSERT INTO actividades_grupos (idactividades, idgrupos) VALUES ?', [vals]);
        }
      }

      res.json({ ok: true });
    } catch (dbErr) { next(dbErr); }
  });
});

/* ── Asistentes: resumen completo para el modal ──────────────── */
router.get('/:id/asistentes', checkPermission('actividades_asistentes', 'S'), async (req, res, next) => {
  try {
    const idActividad = req.params.id;

    // Todas las personas con su estado de asistencia en esta actividad
    const [personas] = await pool.query(`
      SELECT
        p.idpersonas,
        TRIM(CONCAT_WS(' ',
          p.primer_nombre, NULLIF(p.segundo_nombre,''),
          p.primer_apellido, NULLIF(p.segundo_apellido,''),
          NULLIF(p.apellidocasada,'')
        )) AS nombre_completo,
        p.foto,
        aa.idactividades_asistentes,
        aa.comentarios,
        (aa.idactividades_asistentes IS NOT NULL) AS asiste,
        GROUP_CONCAT(DISTINCT g.grupo ORDER BY g.grupo SEPARATOR ', ') AS grupos_nombres
      FROM personas p
      LEFT JOIN actividades_asistentes aa
        ON aa.idpersonas = p.idpersonas AND aa.idactividades = ?
      LEFT JOIN grupos_personas gp ON gp.idpersonas = p.idpersonas
      LEFT JOIN grupos g           ON g.idgrupos = gp.idgrupos
      GROUP BY p.idpersonas
      ORDER BY asiste DESC, p.primer_apellido, p.primer_nombre
    `, [idActividad]);

    // Visitantes sin registro en personas
    const [visitantes] = await pool.query(`
      SELECT idactividades_asistentes, nombre_completo, telefono, comentarios
      FROM actividades_asistentes
      WHERE idactividades = ? AND idpersonas IS NULL
      ORDER BY idactividades_asistentes
    `, [idActividad]);

    // Contadores por grupo de los asistentes con registro
    const [porGrupo] = await pool.query(`
      SELECT g.grupo, COUNT(DISTINCT aa.idpersonas) AS count
      FROM actividades_asistentes aa
      JOIN grupos_personas gp ON gp.idpersonas = aa.idpersonas
      JOIN grupos g           ON g.idgrupos = gp.idgrupos
      WHERE aa.idactividades = ?
      GROUP BY g.idgrupos, g.grupo
      ORDER BY count DESC, g.grupo
    `, [idActividad]);

    const totalPersonas   = personas.filter(p => p.asiste).length;
    const totalVisitantes = visitantes.length;

    res.json({
      personas,
      visitantes,
      contadores: {
        personas:   totalPersonas,
        visitantes: totalVisitantes,
        total:      totalPersonas + totalVisitantes,
        porGrupo,
      },
    });
  } catch (err) { next(err); }
});

/* ── Asistentes: agregar persona o visitante ─────────────────── */
router.post('/:id/asistentes', checkPermission('actividades_asistentes', 'A'), async (req, res, next) => {
  try {
    const idActividad = req.params.id;
    const { idpersonas, nombre_completo, comentarios } = req.body;

    const [[act]] = await pool.query(
      'SELECT idactividades FROM actividades WHERE idactividades = ?', [idActividad]
    );
    if (!act) return res.status(404).json({ error: 'Actividad no encontrada' });

    if (idpersonas) {
      const [[existe]] = await pool.query(
        'SELECT idactividades_asistentes FROM actividades_asistentes WHERE idactividades = ? AND idpersonas = ?',
        [idActividad, idpersonas]
      );
      if (existe) return res.status(409).json({ error: 'La persona ya está registrada como asistente' });

      const [r] = await pool.query(
        'INSERT INTO actividades_asistentes (idactividades, idpersonas, comentarios) VALUES (?, ?, ?)',
        [idActividad, idpersonas, comentarios || null]
      );
      res.status(201).json({ id: r.insertId });
    } else {
      if (!nombre_completo?.trim())
        return res.status(400).json({ error: 'El nombre del visitante es requerido' });

      const { telefono } = req.body;
      const [r] = await pool.query(
        'INSERT INTO actividades_asistentes (idactividades, nombre_completo, telefono, comentarios) VALUES (?, ?, ?, ?)',
        [idActividad, nombre_completo.trim(), telefono || null, comentarios || null]
      );
      res.status(201).json({ id: r.insertId });
    }
  } catch (err) { next(err); }
});

/* ── Asistentes: eliminar ────────────────────────────────────── */
router.delete('/:id/asistentes/:idasistente', checkPermission('actividades_asistentes', 'D'), async (req, res, next) => {
  try {
    const [r] = await pool.query(
      'DELETE FROM actividades_asistentes WHERE idactividades_asistentes = ? AND idactividades = ?',
      [req.params.idasistente, req.params.id]
    );
    if (!r.affectedRows) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/* ── Tesorería: movimientos vinculados a la actividad ────────── */
router.get('/:id/tesoreria', checkPermission('actividades', 'S'), async (req, res, next) => {
  try {
    const { usuario, is_superadmin } = req.user;
    if (!await tienePermiso(usuario, 'tesoreria_movimientos', 'S', is_superadmin)) {
      return res.json({ movimientos: [], totales: { ingresos: 0, egresos: 0, saldo: 0 } });
    }

    let sql = `
      SELECT tm.idtesoreria_movimientos, tm.dtesoreria AS idtesoreria, t.nombre AS tesoreria,
             tm.fecha, tm.concepto, tm.credito, tm.debito, tm.anulado,
             tt.tipo_movimiento
      FROM actividades_tesoreria_movimientos atm
      JOIN tesoreria_movimientos tm ON tm.idtesoreria_movimientos = atm.idtesoreria_movimientos
      JOIN tesoreria t ON t.idtesoreria = tm.dtesoreria
      LEFT JOIN tesoreria_tipomov tt ON tt.idtesoreria_tipomov = tm.idtipo_movimiento
      WHERE atm.idactividades = ?`;
    const params = [req.params.id];

    if (!is_superadmin) {
      sql += ` AND (t.responsable = ? OR EXISTS (
                 SELECT 1 FROM tesoreria_usuarios tu
                 WHERE tu.idtesoreria = t.idtesoreria AND tu.usuario = ?
               ))`;
      params.push(usuario, usuario);
    }
    sql += ' ORDER BY tm.fecha, tm.idtesoreria_movimientos';

    const [movimientos] = await pool.query(sql, params);

    const totales = movimientos.reduce((acc, m) => {
      if (!m.anulado) {
        acc.ingresos += parseFloat(m.debito)  || 0;
        acc.egresos  += parseFloat(m.credito) || 0;
      }
      return acc;
    }, { ingresos: 0, egresos: 0 });
    totales.saldo = totales.ingresos - totales.egresos;

    res.json({ movimientos, totales });
  } catch (err) { next(err); }
});

router.post('/:id/tesoreria', checkPermission('actividades', 'S'), async (req, res, next) => {
  try {
    const { usuario, is_superadmin } = req.user;
    const { idtesoreria, movimientos } = req.body;

    if (!idtesoreria) return res.status(400).json({ error: 'La tesorería es requerida' });
    if (!Array.isArray(movimientos) || !movimientos.length) {
      return res.status(400).json({ error: 'Debe incluir al menos un movimiento' });
    }

    const [[act]] = await pool.query(
      'SELECT idactividades, fecha_inicio FROM actividades WHERE idactividades = ?', [req.params.id]
    );
    if (!act) return res.status(404).json({ error: 'Actividad no encontrada' });

    const acceso = await verificarAccesoTesoreria(usuario, idtesoreria, is_superadmin);
    if (!acceso.acceso)     return res.status(403).json({ error: 'No tiene acceso a esa tesorería' });
    if (acceso.soloLectura) return res.status(403).json({ error: 'Su acceso a esa tesorería es de solo lectura' });
    if (!await tienePermiso(usuario, 'tesoreria_movimientos', 'A', is_superadmin)) {
      return res.status(403).json({ error: 'No tiene permiso para agregar movimientos de tesorería' });
    }

    for (const m of movimientos) {
      if (!m.concepto?.trim()) return res.status(400).json({ error: 'Todos los movimientos requieren un concepto' });
      if (m.concepto.length > 145) return res.status(400).json({ error: 'El concepto supera los 145 caracteres' });
      const monto = parseFloat(m.monto);
      if (!monto || monto <= 0) return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
      if (m.tipo !== 'ingreso' && m.tipo !== 'egreso') {
        return res.status(400).json({ error: "El tipo de movimiento debe ser 'ingreso' o 'egreso'" });
      }
    }

    const ids = [];
    for (const m of movimientos) {
      const monto = parseFloat(m.monto);
      const fecha = m.fecha || String(act.fecha_inicio).slice(0, 10);
      const [r] = await pool.query(
        `INSERT INTO tesoreria_movimientos
           (fecha, concepto, credito, debito, dtesoreria, idtipo_movimiento, creador)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          fecha, m.concepto.trim(),
          m.tipo === 'egreso'  ? monto : 0,
          m.tipo === 'ingreso' ? monto : 0,
          idtesoreria, m.idtipo_movimiento || null, usuario,
        ]
      );
      await pool.query(
        'INSERT INTO actividades_tesoreria_movimientos (idactividades, idtesoreria_movimientos) VALUES (?, ?)',
        [req.params.id, r.insertId]
      );
      ids.push(r.insertId);
    }

    await recalcularSaldo(idtesoreria);
    res.status(201).json({ ids });
  } catch (err) { next(err); }
});

/* ── Eliminar ────────────────────────────────────────────────── */
router.delete('/:id', checkPermission('actividades', 'D'), async (req, res, next) => {
  try {
    const [[row]] = await pool.query(
      'SELECT logo, adjuntos FROM actividades WHERE idactividades = ?',
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: 'Actividad no encontrada' });

    if (row.logo) { try { fs.unlinkSync(path.join(logosDir, row.logo)); } catch {} }
    let adjuntos = [];
    try { adjuntos = JSON.parse(row.adjuntos || '[]'); } catch {}
    for (const adj of adjuntos) {
      try { fs.unlinkSync(path.join(adjuntosDir, adj.filename)); } catch {}
    }

    await pool.query('DELETE FROM actividades WHERE idactividades = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/* ── Reconocimiento facial: obtener descriptores almacenados ─── */
router.get('/faces/descriptors', checkPermission('actividades_asistentes', 'S'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        p.idpersonas,
        TRIM(CONCAT_WS(' ',
          p.primer_nombre, NULLIF(p.segundo_nombre,''),
          p.primer_apellido, NULLIF(p.segundo_apellido,'')
        )) AS nombre,
        CONVERT(p.foto USING utf8) AS foto,
        d.descriptor,
        d.foto_ref
      FROM personas p
      LEFT JOIN personas_descriptores_faciales d ON d.idpersonas = p.idpersonas
      WHERE p.foto IS NOT NULL
        AND CONVERT(p.foto USING utf8) != ''
      ORDER BY p.primer_apellido, p.primer_nombre
    `);

    res.json(rows.map(r => ({
      ...r,
      descriptor: r.descriptor ? JSON.parse(r.descriptor) : null,
    })));
  } catch (err) { next(err); }
});

/* ── Reconocimiento facial: guardar/actualizar descriptor ───── */
router.post('/faces/descriptor', checkPermission('actividades_asistentes', 'A'), async (req, res, next) => {
  try {
    const { idpersonas, descriptor, foto_ref } = req.body;
    if (!idpersonas || !Array.isArray(descriptor) || descriptor.length !== 128)
      return res.status(400).json({ error: 'idpersonas y descriptor (array[128]) son requeridos' });

    await pool.query(`
      INSERT INTO personas_descriptores_faciales (idpersonas, descriptor, foto_ref)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        descriptor     = VALUES(descriptor),
        foto_ref       = VALUES(foto_ref),
        actualizado_at = NOW()
    `, [idpersonas, JSON.stringify(descriptor), foto_ref || null]);

    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
