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

router.use('/auth', require('./auth'));
router.use('/seguridad/grupos', require('./grupos')); // más específico primero
router.use('/seguridad', require('./seguridad'));
router.use('/catalogos',   require('./catalogos'));
router.use('/actividades', require('./actividades'));
router.use('/personas',    require('./personas'));
router.use('/reportes',    require('./reportes'));
router.use('/tesoreria',   require('./tesoreria'));

module.exports = router;
