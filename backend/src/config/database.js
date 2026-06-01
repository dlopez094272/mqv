const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mqv',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('Conexión a MySQL establecida correctamente (base de datos: mqv)');
    conn.release();
  } catch (err) {
    console.error('Error al conectar con MySQL:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
