const router = require('express').Router();
const { pool } = require('../config/database');

router.get('/health', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ status: 'ok', db: rows[0].ok === 1 ? 'connected' : 'error' });
  } catch (err) {
    next(err);
  }
});

// App móvil: versión mínima obligatoria (antes de cualquier ruta)
const appVersion = require('./app');
router.use(appVersion.exigirVersionMinima);
router.use('/app', appVersion.router);

router.use('/auth', require('./auth'));
router.use('/notificaciones', require('./notificaciones'));
router.use('/seguridad/grupos', require('./grupos')); // más específico primero
router.use('/seguridad', require('./seguridad'));
router.use('/catalogos',   require('./catalogos'));
router.use('/actividades', require('./actividades'));
router.use('/personas',    require('./personas'));
router.use('/reportes',    require('./reportes'));
router.use('/tesoreria',   require('./tesoreria'));
router.use('/crecimiento', require('./crecimiento'));
router.use('/correo',      require('./correo'));
router.use('/publicaciones', require('./publicaciones'));
router.use('/formularios',  require('./formularios'));
router.use('/alabanza',     require('./alabanza'));
router.use('/formularios-publicos', require('./formulariosPublicos')); // sin auth obligatoria

module.exports = router;
