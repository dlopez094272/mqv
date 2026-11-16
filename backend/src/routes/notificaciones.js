/** Bandeja de notificaciones del usuario (app móvil). */
const router = require('express').Router();
const { pool } = require('../config/database');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const limite = Math.min(parseInt(req.query.limite) || 50, 200);
    const antesDe = parseInt(req.query.antes_de) || null;
    const [rows] = await pool.query(
      `SELECT idnotificaciones, tipo, titulo, cuerpo, datos, leida, fecha
       FROM notificaciones
       WHERE usuario = ? ${antesDe ? 'AND idnotificaciones < ?' : ''}
       ORDER BY idnotificaciones DESC LIMIT ?`,
      antesDe ? [req.user.usuario, antesDe, limite] : [req.user.usuario, limite]
    );
    const [[{ no_leidas }]] = await pool.query(
      'SELECT COUNT(*) AS no_leidas FROM notificaciones WHERE usuario = ? AND leida = 0', [req.user.usuario]
    );
    res.json({
      notificaciones: rows.map(r => ({ ...r, datos: typeof r.datos === 'string' ? JSON.parse(r.datos) : r.datos })),
      no_leidas,
    });
  } catch (err) { next(err); }
});

router.get('/no-leidas', async (req, res, next) => {
  try {
    const [[{ no_leidas }]] = await pool.query(
      'SELECT COUNT(*) AS no_leidas FROM notificaciones WHERE usuario = ? AND leida = 0', [req.user.usuario]
    );
    res.json({ no_leidas });
  } catch (err) { next(err); }
});

router.patch('/leer-todas', async (req, res, next) => {
  try {
    await pool.query('UPDATE notificaciones SET leida = 1 WHERE usuario = ? AND leida = 0', [req.user.usuario]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.patch('/:id/leida', async (req, res, next) => {
  try {
    await pool.query('UPDATE notificaciones SET leida = 1 WHERE idnotificaciones = ? AND usuario = ?',
      [req.params.id, req.user.usuario]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM notificaciones WHERE idnotificaciones = ? AND usuario = ?',
      [req.params.id, req.user.usuario]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
