const { pool } = require('../config/database');

/**
 * Factory que retorna un middleware que verifica si el usuario
 * tiene la operación requerida sobre la tabla/funcionalidad indicada.
 *
 * Operaciones: A=Agregar, D=Eliminar, E=Editar, S=Consultar
 */
function checkPermission(tableName, operation) {
  return async (req, res, next) => {
    try {
      // Superadmin siempre pasa
      if (req.user?.is_superadmin) return next();

      const [grupos] = await pool.query(
        'SELECT GroupID FROM mqv_ugmembers WHERE UserName = ?',
        [req.user.usuario]
      );

      if (!grupos.length) {
        return res.status(403).json({ error: 'No tiene permisos para acceder a este módulo' });
      }

      const groupIds = grupos.map(g => g.GroupID);
      const [derechos] = await pool.query(
        'SELECT AccessMask FROM mqv_ugrights WHERE TableName = ? AND GroupID IN (?)',
        [tableName, groupIds]
      );

      const tienePermiso = derechos.some(d =>
        d.AccessMask.toUpperCase().includes(operation.toUpperCase())
      );

      if (!tienePermiso) {
        return res.status(403).json({
          error: `No tiene permiso para realizar esta acción (${operation}) en ${tableName}`,
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = checkPermission;
