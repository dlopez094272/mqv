const { pool } = require('../config/database');

async function superadminRequired(req, res, next) {
  // JWT already has is_superadmin, but verify against DB for sensitive operations
  if (!req.user?.is_superadmin) {
    return res.status(403).json({ error: 'Acceso exclusivo para superadministradores' });
  }
  // Double-check in DB
  const [rows] = await pool.query(
    'SELECT 1 FROM mqv_ugmembers WHERE UserName = ? AND GroupID = -1 LIMIT 1',
    [req.user.usuario]
  );
  if (!rows.length) {
    return res.status(403).json({ error: 'Acceso exclusivo para superadministradores' });
  }
  next();
}

module.exports = superadminRequired;
