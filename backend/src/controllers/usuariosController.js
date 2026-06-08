const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { sendMail, emailBienvenida } = require('../config/email');

const FRONTEND = () => process.env.FRONTEND_URL || 'http://localhost:4200';

const CAMPOS_LISTA = `
  usuario, nombre_completo, email, telefono, activo, primer_ingreso,
  (userpic1 IS NOT NULL AND OCTET_LENGTH(userpic1) > 0) AS tiene_foto
`;

async function listar(req, res, next) {
  try {
    const [rows] = await pool.query(`SELECT ${CAMPOS_LISTA} FROM usuarios ORDER BY nombre_completo`);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const [rows] = await pool.query(`SELECT ${CAMPOS_LISTA} FROM usuarios WHERE usuario = ?`, [req.params.usuario]);
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const { usuario, nombre_completo, email, telefono } = req.body;
    if (!usuario || !nombre_completo || !email) {
      return res.status(400).json({ error: 'Código, nombre completo y correo son requeridos' });
    }

    const [existe] = await pool.query('SELECT usuario FROM usuarios WHERE usuario = ?', [usuario]);
    if (existe.length) return res.status(409).json({ error: 'El código de usuario ya existe' });

    const [emailExiste] = await pool.query('SELECT usuario FROM usuarios WHERE email = ?', [email]);
    if (emailExiste.length) return res.status(409).json({ error: 'Ya existe un usuario registrado con ese correo electrónico' });

    const token = crypto.randomBytes(32).toString('hex');

    await pool.query(
      `INSERT INTO usuarios (usuario, nombre_completo, email, telefono, activo, primer_ingreso, password, reset_token, reset_date)
       VALUES (?, ?, ?, ?, 1, 1, ?, ?, DATE_ADD(NOW(), INTERVAL 72 HOUR))`,
      [usuario, nombre_completo, email, telefono || null, '', token]
    );

    const link = `${FRONTEND()}/completar-registro?token=${token}`;
    await sendMail({
      to: email,
      subject: 'Bienvenido – Completa tu registro en Sistema MQV',
      html: emailBienvenida(nombre_completo, usuario, link),
    });

    res.status(201).json({ message: 'Usuario creado. Se envió correo de bienvenida para completar el registro.' });
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const { usuario } = req.params;
    const { nombre_completo, email, telefono, foto } = req.body;

    if (!nombre_completo || !email) return res.status(400).json({ error: 'Nombre y correo son requeridos' });

    const [existe] = await pool.query('SELECT usuario FROM usuarios WHERE usuario = ?', [usuario]);
    if (!existe.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (foto) {
      const b64 = foto.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(b64, 'base64');
      await pool.query(
        'UPDATE usuarios SET nombre_completo = ?, email = ?, telefono = ?, userpic1 = ? WHERE usuario = ?',
        [nombre_completo, email, telefono || null, buffer, usuario]
      );
    } else {
      await pool.query(
        'UPDATE usuarios SET nombre_completo = ?, email = ?, telefono = ? WHERE usuario = ?',
        [nombre_completo, email, telefono || null, usuario]
      );
    }

    res.json({ message: 'Usuario actualizado correctamente' });
  } catch (err) {
    next(err);
  }
}

async function desactivar(req, res, next) {
  try {
    const [r] = await pool.query('UPDATE usuarios SET activo = 0 WHERE usuario = ?', [req.params.usuario]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ message: 'Usuario desactivado' });
  } catch (err) {
    next(err);
  }
}

async function activar(req, res, next) {
  try {
    const [r] = await pool.query('UPDATE usuarios SET activo = 1 WHERE usuario = ?', [req.params.usuario]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ message: 'Usuario activado' });
  } catch (err) {
    next(err);
  }
}

async function getFoto(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT userpic1 FROM usuarios WHERE usuario = ?', [req.params.usuario]);
    if (!rows.length || !rows[0].userpic1) return res.status(404).end();
    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'private, max-age=3600');
    res.send(rows[0].userpic1);
  } catch (err) {
    next(err);
  }
}

async function reenviarInvitacion(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT usuario, nombre_completo, email, activo FROM usuarios WHERE usuario = ?',
      [req.params.usuario]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    const u = rows[0];
    if (!u.email) return res.status(400).json({ error: 'El usuario no tiene correo registrado' });

    const token = crypto.randomBytes(32).toString('hex');

    await pool.query(
      'UPDATE usuarios SET reset_token = ?, reset_date = DATE_ADD(NOW(), INTERVAL 72 HOUR) WHERE usuario = ?',
      [token, u.usuario]
    );

    const link = `${FRONTEND()}/completar-registro?token=${token}`;
    await sendMail({
      to: u.email,
      subject: 'Completa tu registro en Sistema MQV',
      html: emailBienvenida(u.nombre_completo, u.usuario, link),
    });

    res.json({ message: 'Invitación reenviada correctamente' });
  } catch (err) {
    next(err);
  }
}

async function verificarCodigo(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT usuario FROM usuarios WHERE usuario = ?', [req.params.codigo]);
    res.json({ disponible: rows.length === 0 });
  } catch (err) { next(err); }
}

async function listarGruposBasico(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT GroupID, Label FROM mqv_uggroups WHERE GroupID >= 0 ORDER BY Label'
    );
    res.json(rows);
  } catch (err) { next(err); }
}

module.exports = { listar, obtener, crear, actualizar, desactivar, activar, getFoto, reenviarInvitacion, verificarCodigo, listarGruposBasico };
