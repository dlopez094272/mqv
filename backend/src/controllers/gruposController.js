const { pool } = require('../config/database');

// Tablas/funcionalidades disponibles en el sistema
const FEATURES = [
  // Seguridad
  { name: 'usuarios', label: 'Seguridad: Usuarios' },

  // Módulos principales
  { name: 'personas',  label: 'Personas' },
  { name: 'tesoreria', label: 'Tesorería' },

  // Catálogos
  { name: 'iglesias',                label: 'Catálogo: Iglesias' },
  { name: 'lugares',                 label: 'Catálogo: Lugares' },
  { name: 'nacionalidades',          label: 'Catálogo: Nacionalidades' },
  { name: 'departamentos',           label: 'Catálogo: Departamentos' },
  { name: 'municipios',              label: 'Catálogo: Municipios' },
  { name: 'profesiones',             label: 'Catálogo: Profesiones' },
  { name: 'roles',                   label: 'Catálogo: Roles' },
  { name: 'grupos',                  label: 'Catálogo: Grupos' },
  { name: 'tipos_documento',         label: 'Catálogo: Tipos de Documento' },
  { name: 'estados_crecimiento',     label: 'Catálogo: Estados de Crecimiento' },
  { name: 'experiencia_ministerial', label: 'Catálogo: Exp. Ministerial' },
  { name: 'experiencia_laboral',     label: 'Catálogo: Exp. Laboral' },
  { name: 'actividades_categorias',  label: 'Catálogo: Cat. de Actividades' },
  { name: 'actividades_grupos',      label: 'Catálogo: Actividades-Grupos' },

  // Actividades
  { name: 'actividades',            label: 'Actividades' },
  { name: 'actividades_asistentes', label: 'Actividades: Registro de Asistencia' },

  // Tesorería
  { name: 'tesoreria_movimientos',  label: 'Tesorería: Movimientos' },
  { name: 'tesoreria_tipomov',      label: 'Tesorería: Tipos de Movimiento' },

  // Crecimiento
  { name: 'cursos',     label: 'Crecimiento: Gestión de Cursos' },
  { name: 'mis_cursos', label: 'Crecimiento: Mis Cursos' },
];

async function listar(req, res, next) {
  try {
    const [grupos] = await pool.query(
      'SELECT GroupID, Label, Comment FROM mqv_uggroups ORDER BY GroupID'
    );
    // Contar miembros por grupo
    const [counts] = await pool.query(
      'SELECT GroupID, COUNT(*) as total FROM mqv_ugmembers GROUP BY GroupID'
    );
    const countMap = Object.fromEntries(counts.map(c => [c.GroupID, c.total]));
    const result = grupos.map(g => ({ ...g, total_miembros: countMap[g.GroupID] || 0 }));
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const [grupos] = await pool.query('SELECT GroupID, Label, Comment FROM mqv_uggroups WHERE GroupID = ?', [id]);
    if (!grupos.length) return res.status(404).json({ error: 'Grupo no encontrado' });

    const [miembros] = await pool.query(
      `SELECT gm.UserName, u.nombre_completo, u.email
       FROM mqv_ugmembers gm
       LEFT JOIN usuarios u ON u.usuario = gm.UserName
       WHERE gm.GroupID = ?
       ORDER BY u.nombre_completo`,
      [id]
    );

    const [derechos] = await pool.query(
      'SELECT TableName, AccessMask FROM mqv_ugrights WHERE GroupID = ?',
      [id]
    );
    const derechosMap = Object.fromEntries(derechos.map(d => [d.TableName, d.AccessMask]));

    res.json({ ...grupos[0], miembros, derechos: derechosMap, features: FEATURES });
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const { label, comment } = req.body;
    if (!label) return res.status(400).json({ error: 'El nombre del grupo es requerido' });

    // Next positive ID
    const [maxRow] = await pool.query('SELECT MAX(GroupID) as mx FROM mqv_uggroups WHERE GroupID >= 0');
    const nextId = (maxRow[0].mx || 0) + 1;

    await pool.query('INSERT INTO mqv_uggroups (GroupID, Label, Comment) VALUES (?, ?, ?)', [nextId, label, comment || null]);
    res.status(201).json({ message: 'Grupo creado correctamente', GroupID: nextId });
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (id === -1) return res.status(400).json({ error: 'No se puede modificar el grupo Superadministrador' });

    const { label, comment } = req.body;
    if (!label) return res.status(400).json({ error: 'El nombre es requerido' });

    const [r] = await pool.query('UPDATE mqv_uggroups SET Label = ?, Comment = ? WHERE GroupID = ?', [label, comment || null, id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Grupo no encontrado' });
    res.json({ message: 'Grupo actualizado correctamente' });
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (id === -1) return res.status(400).json({ error: 'No se puede eliminar el grupo Superadministrador' });

    await pool.query('DELETE FROM mqv_ugrights WHERE GroupID = ?', [id]);
    await pool.query('DELETE FROM mqv_ugmembers WHERE GroupID = ?', [id]);
    const [r] = await pool.query('DELETE FROM mqv_uggroups WHERE GroupID = ?', [id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Grupo no encontrado' });

    res.json({ message: 'Grupo eliminado correctamente' });
  } catch (err) {
    next(err);
  }
}

async function agregarMiembro(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const { usuario } = req.body;
    if (!usuario) return res.status(400).json({ error: 'Código de usuario requerido' });

    const [u] = await pool.query('SELECT usuario FROM usuarios WHERE usuario = ?', [usuario]);
    if (!u.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    await pool.query('INSERT IGNORE INTO mqv_ugmembers (GroupID, UserName) VALUES (?, ?)', [id, usuario]);
    res.status(201).json({ message: 'Usuario agregado al grupo' });
  } catch (err) {
    next(err);
  }
}

async function quitarMiembro(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const usuario = req.params.usuario;

    if (id === -1 && usuario === req.user.usuario) {
      return res.status(400).json({ error: 'No puede quitarse a sí mismo del grupo Superadministrador' });
    }

    await pool.query('DELETE FROM mqv_ugmembers WHERE GroupID = ? AND UserName = ?', [id, usuario]);
    res.json({ message: 'Usuario removido del grupo' });
  } catch (err) {
    next(err);
  }
}

async function actualizarDerechos(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (id === -1) return res.status(400).json({ error: 'El grupo Superadministrador tiene acceso total, no requiere permisos' });

    const { derechos } = req.body; // [{ tableName, accessMask }]
    if (!Array.isArray(derechos)) return res.status(400).json({ error: 'Formato inválido' });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM mqv_ugrights WHERE GroupID = ?', [id]);
      for (const d of derechos) {
        if (d.accessMask && d.accessMask.length > 0) {
          const mask = [...new Set(d.accessMask.toUpperCase().split(''))].filter(c => 'ADES'.includes(c)).join('');
          if (mask) {
            await conn.query('INSERT INTO mqv_ugrights (TableName, GroupID, AccessMask) VALUES (?, ?, ?)', [d.tableName, id, mask]);
          }
        }
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    res.json({ message: 'Permisos actualizados correctamente' });
  } catch (err) {
    next(err);
  }
}

async function listarUsuariosDisponibles(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const [rows] = await pool.query(
      `SELECT u.usuario, u.nombre_completo, u.email
       FROM usuarios u
       WHERE u.activo = 1
       AND u.usuario NOT IN (SELECT UserName FROM mqv_ugmembers WHERE GroupID = ?)
       ORDER BY u.nombre_completo`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, agregarMiembro, quitarMiembro, actualizarDerechos, listarUsuariosDisponibles };
