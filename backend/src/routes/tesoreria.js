const router  = require('express').Router();
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const { pool }       = require('../config/database');
const authMiddleware = require('../middleware/authMiddleware');

// ── Directorio de adjuntos ────────────────────────────────────────
const adjuntosDir = path.join(__dirname, '..', '..', 'files', 'tesoreria', 'adjuntos');
fs.mkdirSync(adjuntosDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, adjuntosDir),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const safe = path.basename(file.originalname, ext)
                     .replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 60);
    cb(null, `${Date.now()}-${safe}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } })
  .array('adjuntos', 10);

router.use(authMiddleware);

// ── Helpers ──────────────────────────────────────────────────────

async function tienePermiso(usuario, tabla, operacion, isSuperadmin) {
  if (isSuperadmin) return true;
  const [grupos] = await pool.query(
    'SELECT GroupID FROM mqv_ugmembers WHERE UserName = ?', [usuario]
  );
  if (!grupos.length) return false;
  const groupIds = grupos.map(g => g.GroupID);
  const [derechos] = await pool.query(
    'SELECT AccessMask FROM mqv_ugrights WHERE TableName = ? AND GroupID IN (?)',
    [tabla, groupIds]
  );
  return derechos.some(d => d.AccessMask.toUpperCase().includes(operacion.toUpperCase()));
}

async function recalcularSaldo(idtesoreria) {
  const id = parseInt(idtesoreria, 10);
  await pool.query(
    `UPDATE tesoreria t
     LEFT JOIN (
       SELECT dtesoreria,
              SUM(debito) - SUM(credito) AS saldo_calculado
       FROM tesoreria_movimientos
       WHERE IFNULL(anulado, 0) = 0
       GROUP BY dtesoreria
     ) m ON t.idtesoreria = m.dtesoreria
     SET t.saldo = COALESCE(m.saldo_calculado, 0)
     WHERE t.idtesoreria = ?`,
    [id]
  );
}

async function verificarAccesoTesoreria(usuario, idtesoreria, isSuperadmin) {
  if (isSuperadmin) return { acceso: true, esResponsable: true, soloLectura: false };

  const [[teso]] = await pool.query(
    'SELECT responsable FROM tesoreria WHERE idtesoreria = ?', [idtesoreria]
  );
  if (!teso) return { acceso: false };

  if (teso.responsable === usuario) {
    return { acceso: true, esResponsable: true, soloLectura: false };
  }

  const [tuRows] = await pool.query(
    'SELECT solo_lectura FROM tesoreria_usuarios WHERE usuario = ? AND idtesoreria = ?',
    [usuario, idtesoreria]
  );
  if (tuRows.length) {
    return { acceso: true, esResponsable: false, soloLectura: tuRows[0].solo_lectura === 1 };
  }

  return { acceso: false };
}

// ── Lookups ──────────────────────────────────────────────────────

router.get('/lookup/usuarios', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT usuario, nombre_completo
       FROM usuarios WHERE activo = 1
       ORDER BY nombre_completo`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/lookup/tipos-movimiento', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT idtesoreria_tipomov AS id, tipo_movimiento AS nombre
       FROM tesoreria_tipomov
       ORDER BY tipo_movimiento`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// ── Descarga de adjunto ──────────────────────────────────────────

router.get('/adjuntos/:filename', (req, res, next) => {
  try {
    const filename = path.basename(req.params.filename);
    const filepath = path.join(adjuntosDir, filename);
    if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Archivo no encontrado' });
    res.download(filepath);
  } catch (err) { next(err); }
});

// ── GET / - Listar tesorerías ────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const { usuario, is_superadmin } = req.user;

    if (!is_superadmin) {
      const tiene = await tienePermiso(usuario, 'tesoreria', 'S', false);
      if (!tiene) return res.status(403).json({ error: 'No tiene permiso para ver tesorería' });
    }

    const saldoJoin = `
      LEFT JOIN tesoreria_movimientos m
        ON m.dtesoreria = t.idtesoreria AND IFNULL(m.anulado, 0) = 0`;
    const saldoSelect = `
      COALESCE(SUM(m.debito) - SUM(m.credito), 0) AS saldo`;
    const groupBy = `
      GROUP BY t.idtesoreria, t.nombre, t.responsable, t.activo, t.fecha_cracion, t.creador`;

    let sql, params = [];
    if (is_superadmin) {
      sql = `SELECT t.idtesoreria, t.nombre, t.responsable, t.activo,
                    t.fecha_cracion, t.creador, ${saldoSelect}
             FROM tesoreria t ${saldoJoin}
             ${groupBy}
             ORDER BY t.nombre`;
    } else {
      sql = `
        SELECT t.idtesoreria, t.nombre, t.responsable, t.activo,
               t.fecha_cracion, t.creador, ${saldoSelect}
        FROM tesoreria t ${saldoJoin}
        WHERE t.responsable = ?
           OR EXISTS (
             SELECT 1 FROM tesoreria_usuarios tu
             WHERE tu.idtesoreria = t.idtesoreria AND tu.usuario = ?
           )
        ${groupBy}
        ORDER BY t.nombre`;
      params = [usuario, usuario];
    }

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// ── POST / - Crear tesorería ──────────────────────────────────────

router.post('/', async (req, res, next) => {
  try {
    const { usuario, is_superadmin } = req.user;
    if (!await tienePermiso(usuario, 'tesoreria', 'A', is_superadmin)) {
      return res.status(403).json({ error: 'No tiene permiso para crear tesorerías' });
    }

    const { nombre, responsable } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });

    const [r] = await pool.query(
      `INSERT INTO tesoreria (nombre, saldo, fecha_cracion, creador, responsable, activo)
       VALUES (?, 0, NOW(), ?, ?, 1)`,
      [nombre.trim(), usuario, responsable || usuario]
    );
    res.status(201).json({ id: r.insertId });
  } catch (err) { next(err); }
});

// ── PUT /:id - Actualizar tesorería ──────────────────────────────

router.put('/:id', async (req, res, next) => {
  try {
    const { usuario, is_superadmin } = req.user;
    if (!await tienePermiso(usuario, 'tesoreria', 'E', is_superadmin)) {
      return res.status(403).json({ error: 'No tiene permiso para editar tesorerías' });
    }
    const acceso = await verificarAccesoTesoreria(usuario, req.params.id, is_superadmin);
    if (!acceso.acceso) return res.status(403).json({ error: 'No tiene acceso a esta tesorería' });

    const { nombre, responsable } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });

    const [r] = await pool.query(
      `UPDATE tesoreria SET nombre = ?, responsable = ? WHERE idtesoreria = ?`,
      [nombre.trim(), responsable || usuario, req.params.id]
    );
    if (!r.affectedRows) return res.status(404).json({ error: 'Tesorería no encontrada' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── PATCH /:id/toggle - Activar/Desactivar ───────────────────────

router.patch('/:id/toggle', async (req, res, next) => {
  try {
    const { usuario, is_superadmin } = req.user;
    if (!await tienePermiso(usuario, 'tesoreria', 'E', is_superadmin)) {
      return res.status(403).json({ error: 'No tiene permiso para editar tesorerías' });
    }
    const acceso = await verificarAccesoTesoreria(usuario, req.params.id, is_superadmin);
    if (!acceso.acceso) return res.status(403).json({ error: 'No tiene acceso a esta tesorería' });

    const [r] = await pool.query(
      'UPDATE tesoreria SET activo = IF(activo=1,0,1) WHERE idtesoreria = ?',
      [req.params.id]
    );
    if (!r.affectedRows) return res.status(404).json({ error: 'Tesorería no encontrada' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── DELETE /:id - Eliminar tesorería ─────────────────────────────

router.delete('/:id', async (req, res, next) => {
  try {
    const { usuario, is_superadmin } = req.user;
    if (!await tienePermiso(usuario, 'tesoreria', 'D', is_superadmin)) {
      return res.status(403).json({ error: 'No tiene permiso para eliminar tesorerías' });
    }
    const acceso = await verificarAccesoTesoreria(usuario, req.params.id, is_superadmin);
    if (!acceso.acceso) return res.status(403).json({ error: 'No tiene acceso a esta tesorería' });

    const [r] = await pool.query(
      'DELETE FROM tesoreria WHERE idtesoreria = ?', [req.params.id]
    );
    if (!r.affectedRows) return res.status(404).json({ error: 'Tesorería no encontrada' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── GET /:id/usuarios - Listar usuarios de una tesorería ─────────

router.get('/:id/usuarios', async (req, res, next) => {
  try {
    const { usuario, is_superadmin } = req.user;
    const acceso = await verificarAccesoTesoreria(usuario, req.params.id, is_superadmin);
    if (!acceso.acceso) return res.status(403).json({ error: 'No tiene acceso a esta tesorería' });

    const [rows] = await pool.query(
      `SELECT tu.usuario, tu.solo_lectura, u.nombre_completo
       FROM tesoreria_usuarios tu
       JOIN usuarios u ON u.usuario = tu.usuario
       WHERE tu.idtesoreria = ?
       ORDER BY u.nombre_completo`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// ── POST /:id/usuarios - Asignar usuario ─────────────────────────

router.post('/:id/usuarios', async (req, res, next) => {
  try {
    const { usuario, is_superadmin } = req.user;
    const acceso = await verificarAccesoTesoreria(usuario, req.params.id, is_superadmin);
    if (!acceso.acceso) return res.status(403).json({ error: 'No tiene acceso a esta tesorería' });
    if (!acceso.esResponsable) {
      return res.status(403).json({ error: 'Solo el responsable puede asignar usuarios' });
    }

    const { usuarioNuevo, solo_lectura } = req.body;
    if (!usuarioNuevo) return res.status(400).json({ error: 'El usuario es requerido' });

    const [[u]] = await pool.query(
      'SELECT usuario FROM usuarios WHERE usuario = ? AND activo = 1', [usuarioNuevo]
    );
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado o inactivo' });

    await pool.query(
      `INSERT INTO tesoreria_usuarios (usuario, idtesoreria, solo_lectura)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE solo_lectura = VALUES(solo_lectura)`,
      [usuarioNuevo, req.params.id, solo_lectura ? 1 : 0]
    );
    res.status(201).json({ message: 'Usuario asignado correctamente' });
  } catch (err) { next(err); }
});

// ── DELETE /:id/usuarios/:usr - Quitar usuario ───────────────────

router.delete('/:id/usuarios/:usr', async (req, res, next) => {
  try {
    const { usuario, is_superadmin } = req.user;
    const acceso = await verificarAccesoTesoreria(usuario, req.params.id, is_superadmin);
    if (!acceso.acceso) return res.status(403).json({ error: 'No tiene acceso a esta tesorería' });
    if (!acceso.esResponsable) {
      return res.status(403).json({ error: 'Solo el responsable puede quitar usuarios' });
    }

    await pool.query(
      'DELETE FROM tesoreria_usuarios WHERE idtesoreria = ? AND usuario = ?',
      [req.params.id, req.params.usr]
    );
    res.json({ message: 'Usuario removido correctamente' });
  } catch (err) { next(err); }
});

// ── GET /:id/movimientos - Listar movimientos ────────────────────

router.get('/:id/movimientos', async (req, res, next) => {
  try {
    const { usuario, is_superadmin } = req.user;
    const acceso = await verificarAccesoTesoreria(usuario, req.params.id, is_superadmin);
    if (!acceso.acceso) return res.status(403).json({ error: 'No tiene acceso a esta tesorería' });

    if (!await tienePermiso(usuario, 'tesoreria_movimientos', 'S', is_superadmin)) {
      return res.status(403).json({ error: 'No tiene permiso para ver movimientos' });
    }

    const [[teso]] = await pool.query(
      `SELECT t.idtesoreria, t.nombre, t.responsable, t.activo, t.fecha_cracion, t.creador,
              COALESCE(SUM(m.debito) - SUM(m.credito), 0) AS saldo
       FROM tesoreria t
       LEFT JOIN tesoreria_movimientos m
         ON m.dtesoreria = t.idtesoreria AND IFNULL(m.anulado, 0) = 0
       WHERE t.idtesoreria = ?
       GROUP BY t.idtesoreria, t.nombre, t.responsable, t.activo, t.fecha_cracion, t.creador`,
      [req.params.id]
    );
    if (!teso) return res.status(404).json({ error: 'Tesorería no encontrada' });

    const { desde, hasta } = req.query;

    // saldo_inicial = movimientos previos al filtro de fecha (base siempre 0)
    let saldoInicial = 0;
    if (desde) {
      const [[prev]] = await pool.query(
        `SELECT COALESCE(SUM(debito) - SUM(credito), 0) AS dif
         FROM tesoreria_movimientos
         WHERE dtesoreria = ? AND anulado = 0 AND fecha < ?`,
        [req.params.id, desde]
      );
      saldoInicial = parseFloat(prev.dif || 0);
    }

    let sql = `
      SELECT m.*, tm.tipo_movimiento
      FROM tesoreria_movimientos m
      LEFT JOIN tesoreria_tipomov tm ON tm.idtesoreria_tipomov = m.idtipo_movimiento
      WHERE m.dtesoreria = ?`;
    const params = [req.params.id];

    if (desde) { sql += ' AND m.fecha >= ?'; params.push(desde); }
    if (hasta) { sql += ' AND m.fecha <= ?'; params.push(hasta); }
    sql += ' ORDER BY m.fecha ASC, m.idtesoreria_movimientos ASC';

    const [movimientos] = await pool.query(sql, params);

    res.json({
      tesoreria:     teso,
      saldo_inicial: saldoInicial,
      movimientos,
      solo_lectura:  acceso.soloLectura,
    });
  } catch (err) { next(err); }
});

// ── POST /:id/movimientos - Crear movimiento ──────────────────────

router.post('/:id/movimientos', upload, async (req, res, next) => {
  try {
    const { usuario, is_superadmin } = req.user;
    const acceso = await verificarAccesoTesoreria(usuario, req.params.id, is_superadmin);
    if (!acceso.acceso)      return res.status(403).json({ error: 'No tiene acceso a esta tesorería' });
    if (acceso.soloLectura)  return res.status(403).json({ error: 'Su acceso es de solo lectura' });
    if (!await tienePermiso(usuario, 'tesoreria_movimientos', 'A', is_superadmin)) {
      return res.status(403).json({ error: 'No tiene permiso para agregar movimientos' });
    }

    const { fecha, concepto, credito, debito, idtipo_movimiento } = req.body;
    if (!fecha || !concepto) return res.status(400).json({ error: 'Fecha y concepto son requeridos' });
    if (concepto.length > 145) return res.status(400).json({ error: 'El concepto supera los 145 caracteres' });

    const creditoVal = parseFloat(credito) || 0;
    const debitoVal  = parseFloat(debito)  || 0;
    if (creditoVal > 0 && debitoVal > 0) {
      return res.status(400).json({ error: 'No se puede registrar ingreso y egreso a la vez' });
    }
    if (creditoVal === 0 && debitoVal === 0) {
      return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
    }

    const adjuntos = req.files && req.files.length
      ? JSON.stringify(req.files.map(f => ({
          filename:     f.filename,
          originalname: f.originalname,
          mimetype:     f.mimetype,
          size:         f.size,
        })))
      : null;

    const [r] = await pool.query(
      `INSERT INTO tesoreria_movimientos
         (fecha, concepto, credito, debito, dtesoreria, idtipo_movimiento, creador, adjuntos)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [fecha, concepto, creditoVal, debitoVal,
       req.params.id, idtipo_movimiento || null, usuario, adjuntos]
    );
    await recalcularSaldo(req.params.id);
    res.status(201).json({ id: r.insertId });
  } catch (err) { next(err); }
});

// ── PUT /:id/movimientos/:movId - Editar movimiento ──────────────

router.put('/:id/movimientos/:movId', upload, async (req, res, next) => {
  try {
    const { usuario, is_superadmin } = req.user;
    const acceso = await verificarAccesoTesoreria(usuario, req.params.id, is_superadmin);
    if (!acceso.acceso)     return res.status(403).json({ error: 'No tiene acceso a esta tesorería' });
    if (acceso.soloLectura) return res.status(403).json({ error: 'Su acceso es de solo lectura' });
    if (!await tienePermiso(usuario, 'tesoreria_movimientos', 'E', is_superadmin)) {
      return res.status(403).json({ error: 'No tiene permiso para editar movimientos' });
    }

    const [[mov]] = await pool.query(
      'SELECT * FROM tesoreria_movimientos WHERE idtesoreria_movimientos = ? AND dtesoreria = ?',
      [req.params.movId, req.params.id]
    );
    if (!mov)      return res.status(404).json({ error: 'Movimiento no encontrado' });
    if (mov.anulado) return res.status(400).json({ error: 'No se puede editar un movimiento anulado' });

    const { fecha, concepto, credito, debito, idtipo_movimiento } = req.body;
    if (!fecha || !concepto) return res.status(400).json({ error: 'Fecha y concepto son requeridos' });
    if (concepto.length > 145) return res.status(400).json({ error: 'El concepto supera los 145 caracteres' });

    const creditoVal = parseFloat(credito) || 0;
    const debitoVal  = parseFloat(debito)  || 0;
    if (creditoVal > 0 && debitoVal > 0) {
      return res.status(400).json({ error: 'No se puede registrar ingreso y egreso a la vez' });
    }
    if (creditoVal === 0 && debitoVal === 0) {
      return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
    }

    // Adjuntos: conservar existentes y agregar nuevos
    let adjuntosActuales = [];
    if (mov.adjuntos) {
      adjuntosActuales = typeof mov.adjuntos === 'string'
        ? JSON.parse(mov.adjuntos)
        : mov.adjuntos;
    }
    if (req.files && req.files.length) {
      const nuevos = req.files.map(f => ({
        filename:     f.filename,
        originalname: f.originalname,
        mimetype:     f.mimetype,
        size:         f.size,
      }));
      adjuntosActuales = [...adjuntosActuales, ...nuevos];
    }

    const [r] = await pool.query(
      `UPDATE tesoreria_movimientos
       SET fecha = ?, concepto = ?, credito = ?, debito = ?,
           idtipo_movimiento = ?, adjuntos = ?
       WHERE idtesoreria_movimientos = ? AND dtesoreria = ?`,
      [fecha, concepto, creditoVal, debitoVal,
       idtipo_movimiento || null,
       adjuntosActuales.length ? JSON.stringify(adjuntosActuales) : null,
       req.params.movId, req.params.id]
    );
    if (!r.affectedRows) return res.status(404).json({ error: 'Movimiento no encontrado' });
    await recalcularSaldo(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── PATCH /:id/movimientos/:movId/anular - Anular movimiento ─────

router.patch('/:id/movimientos/:movId/anular', async (req, res, next) => {
  try {
    const { usuario, is_superadmin } = req.user;
    const acceso = await verificarAccesoTesoreria(usuario, req.params.id, is_superadmin);
    if (!acceso.acceso)     return res.status(403).json({ error: 'No tiene acceso a esta tesorería' });
    if (acceso.soloLectura) return res.status(403).json({ error: 'Su acceso es de solo lectura' });
    if (!await tienePermiso(usuario, 'tesoreria_movimientos', 'E', is_superadmin)) {
      return res.status(403).json({ error: 'No tiene permiso para anular movimientos' });
    }

    const [[mov]] = await pool.query(
      'SELECT anulado FROM tesoreria_movimientos WHERE idtesoreria_movimientos = ? AND dtesoreria = ?',
      [req.params.movId, req.params.id]
    );
    if (!mov)        return res.status(404).json({ error: 'Movimiento no encontrado' });
    if (mov.anulado) return res.status(400).json({ error: 'El movimiento ya fue anulado' });

    await pool.query(
      `UPDATE tesoreria_movimientos
       SET anulado = 1, fecha_anulacion = NOW(), usuario_anulacion = ?
       WHERE idtesoreria_movimientos = ? AND dtesoreria = ?`,
      [usuario, req.params.movId, req.params.id]
    );
    await recalcularSaldo(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
