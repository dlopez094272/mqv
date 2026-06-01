const router = require('express').Router();
const path   = require('path');
const fs     = require('fs');
const multer = require('multer');
const { pool }       = require('../config/database');
const authMiddleware = require('../middleware/authMiddleware');
const checkPermission = require('../middleware/permissionsMiddleware');

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
      res.json({ ok: true });
    } catch (dbErr) { next(dbErr); }
  });
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

module.exports = router;
