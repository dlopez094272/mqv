const { pool } = require('../config/database');

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

module.exports = { recalcularSaldo, verificarAccesoTesoreria };
