const { pool } = require('../config/database');

/**
 * Verifica si un usuario tiene la operación indicada sobre una
 * tabla/funcionalidad, consultando mqv_ugmembers/mqv_ugrights.
 * Si isSuperadmin es true, siempre retorna true (bypass).
 */
async function tienePermiso(usuario, tableName, operation, isSuperadmin) {
  if (isSuperadmin) return true;

  const [grupos] = await pool.query(
    'SELECT GroupID FROM mqv_ugmembers WHERE UserName = ?',
    [usuario]
  );
  if (!grupos.length) return false;

  const groupIds = grupos.map(g => g.GroupID);
  const [derechos] = await pool.query(
    'SELECT AccessMask FROM mqv_ugrights WHERE TableName = ? AND GroupID IN (?)',
    [tableName, groupIds]
  );

  return derechos.some(d => d.AccessMask.toUpperCase().includes(operation.toUpperCase()));
}

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

      const ok = await tienePermiso(req.user.usuario, tableName, operation);
      if (!ok) {
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
module.exports.tienePermiso = tienePermiso;
