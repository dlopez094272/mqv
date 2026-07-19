const router = require('express').Router();
const path   = require('path');
const fs     = require('fs');
const multer = require('multer');
const jwt    = require('jsonwebtoken');

const authMiddleware  = require('../middleware/authMiddleware');
const checkPermission = require('../middleware/permissionsMiddleware');
const ctrl            = require('../controllers/crecimientoController');

// Acepta JWT desde Authorization header O desde ?token= (necesario para <video> y <a download>)
function authHeaderOrQuery(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try { req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET); return next(); } catch {}
  }
  const qtoken = req.query.token;
  if (qtoken) {
    try { req.user = jwt.verify(qtoken, process.env.JWT_SECRET); return next(); } catch {}
  }
  res.status(401).json({ error: 'Token requerido' });
}

// ── Directorios ───────────────────────────────────────────────────
const logosDir    = path.join(__dirname, '..', '..', 'files', 'cursos', 'logos');
const videosDir   = path.join(__dirname, '..', '..', 'files', 'cursos', 'videos');
const archivosDir = path.join(__dirname, '..', '..', 'files', 'cursos', 'archivos');
[logosDir, videosDir, archivosDir].forEach(d => fs.mkdirSync(d, { recursive: true }));

// ── Storage para logos de cursos ──────────────────────────────────
const storageLogo = multer.diskStorage({
  destination: (_, __, cb) => cb(null, logosDir),
  filename:    (_, file, cb) => {
    const ext  = path.extname(file.originalname);
    const safe = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 60);
    cb(null, `${Date.now()}-${safe}${ext}`);
  },
});
const uploadLogo = multer({
  storage: storageLogo,
  fileFilter: (_, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Solo se permiten imágenes'));
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('logo');

// ── Storage para video + archivos de soporte ──────────────────────
const storageContenido = multer.diskStorage({
  destination: (_, file, cb) => {
    cb(null, file.fieldname === 'video' ? videosDir : archivosDir);
  },
  filename: (_, file, cb) => {
    const ext  = path.extname(file.originalname);
    const safe = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 80);
    cb(null, `${Date.now()}-${safe}${ext}`);
  },
});
const uploadContenido = multer({
  storage: storageContenido,
  limits:  { fileSize: 500 * 1024 * 1024 },
}).fields([
  { name: 'video',    maxCount: 1  },
  { name: 'archivos', maxCount: 10 },
]);

// Logos públicos + videos/archivos con token en query param — todos ANTES del authMiddleware
router.get('/logos/:filename', (req, res) => {
  const fp = path.join(logosDir, path.basename(req.params.filename));
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Archivo no encontrado' });
  res.sendFile(fp);
});

router.get('/videos/:filename', authHeaderOrQuery, (req, res) => {
  const fp = path.join(videosDir, path.basename(req.params.filename));
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Archivo no encontrado' });
  res.sendFile(fp);
});

router.get('/archivos-soporte/:filename', authHeaderOrQuery, (req, res) => {
  const fp = path.join(archivosDir, path.basename(req.params.filename));
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Archivo no encontrado' });
  res.sendFile(fp);
});

router.use(authMiddleware);

// ════════════════════════════════════════════════════════════════
// GESTIÓN DE CURSOS (permiso: cursos)
// ════════════════════════════════════════════════════════════════

router.get('/cursos',     checkPermission('cursos', 'S'), ctrl.listarCursos);
router.get('/cursos/:id', checkPermission('cursos', 'S'), ctrl.obtenerCurso);

router.post('/cursos', checkPermission('cursos', 'A'), (req, res, next) => {
  uploadLogo(req, res, err => {
    if (err) return next(err);
    ctrl.crearCurso(req, res, next);
  });
});

router.put('/cursos/:id', checkPermission('cursos', 'E'), (req, res, next) => {
  uploadLogo(req, res, err => {
    if (err) return next(err);
    ctrl.actualizarCurso(req, res, next);
  });
});

router.put('/cursos/:id/toggle', checkPermission('cursos', 'E'), ctrl.toggleCurso);

// ── Contenido del curso ───────────────────────────────────────────
router.post('/cursos/:id/contenido', checkPermission('cursos', 'E'), (req, res, next) => {
  uploadContenido(req, res, err => { if (err) return next(err); ctrl.crearContenido(req, res, next); });
});
router.put('/contenido/:id', checkPermission('cursos', 'E'), (req, res, next) => {
  uploadContenido(req, res, err => { if (err) return next(err); ctrl.actualizarContenido(req, res, next); });
});
router.delete('/contenido/:id',          checkPermission('cursos', 'D'), ctrl.eliminarContenido);
router.delete('/contenido/:id/video',    checkPermission('cursos', 'E'), ctrl.eliminarVideo);
router.delete('/archivos/:id',           checkPermission('cursos', 'D'), ctrl.eliminarArchivo);

// ── Preguntas ─────────────────────────────────────────────────────
router.post('/cursos/:id/preguntas',  checkPermission('cursos', 'E'), ctrl.crearPregunta);
router.put('/preguntas/:id',          checkPermission('cursos', 'E'), ctrl.actualizarPregunta);
router.delete('/preguntas/:id',       checkPermission('cursos', 'D'), ctrl.eliminarPregunta);

// ── Asignaciones ──────────────────────────────────────────────────
router.get('/cursos/:id/asignaciones',         checkPermission('cursos', 'S'), ctrl.listarAsignaciones);
router.get('/cursos/:id/usuarios-disponibles', checkPermission('cursos', 'S'), ctrl.usuariosDisponibles);
router.post('/cursos/:id/asignaciones',        checkPermission('cursos', 'E'), ctrl.asignarUsuarios);
router.delete('/asignaciones/:id',             checkPermission('cursos', 'E'), ctrl.quitarAsignacion);

// ── Editores (solo el propietario del curso) ───────────────────────
router.get('/cursos/:id/editores',                    checkPermission('cursos', 'S'), ctrl.listarEditores);
router.get('/cursos/:id/usuarios-disponibles-editor',  checkPermission('cursos', 'S'), ctrl.usuariosDisponiblesEditor);
router.post('/cursos/:id/editores',                    checkPermission('cursos', 'E'), ctrl.agregarEditores);
router.delete('/editores/:id',                         checkPermission('cursos', 'E'), ctrl.quitarEditor);

// ════════════════════════════════════════════════════════════════
// MIS CURSOS (permiso: mis_cursos — solo autenticación basta)
// ════════════════════════════════════════════════════════════════

router.get('/mis-cursos',              ctrl.misCursos);
router.get('/mis-cursos/:id',          ctrl.miCursoDetalle);
router.get('/mis-cursos/:id/preguntas', ctrl.obtenerPreguntas);
router.post('/mis-cursos/:id/evaluar', ctrl.evaluarCurso);
router.get('/mis-cursos/:id/certificado', ctrl.datosCertificado);

// ── Dashboard: logros ─────────────────────────────────────────────
router.get('/mis-logros', ctrl.misLogros);

module.exports = router;
