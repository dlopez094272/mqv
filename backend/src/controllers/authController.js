const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { sendMail, emailResetPassword } = require('../config/email');

const FRONTEND = () => process.env.FRONTEND_URL || 'http://localhost:4200';

async function esSuperadmin(usuario) {
  const [rows] = await pool.query(
    'SELECT 1 FROM mqv_ugmembers WHERE UserName = ? AND GroupID = -1 LIMIT 1',
    [usuario]
  );
  return rows.length > 0;
}

async function login(req, res, next) {
  try {
    const { usuario, password } = req.body;
    if (!usuario || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    const [rows] = await pool.query(
      'SELECT usuario, password, nombre_completo, activo, primer_ingreso FROM usuarios WHERE usuario = ? OR email = ?',
      [usuario, usuario]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const u = rows[0];

    if (!u.activo) {
      return res.status(403).json({ error: 'Usuario desactivado. Contacte al administrador.' });
    }

    // Verificar que tenga contraseña configurada
    if (!u.password) {
      return res.status(403).json({ error: 'Debe completar su registro. Revise su correo electrónico.' });
    }

    const valid = await bcrypt.compare(password, u.password);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const is_superadmin = await esSuperadmin(u.usuario);

    const token = jwt.sign(
      {
        usuario: u.usuario,
        nombre: u.nombre_completo,
        primer_ingreso: u.primer_ingreso,
        is_superadmin,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      token,
      usuario: u.usuario,
      nombre: u.nombre_completo,
      primer_ingreso: u.primer_ingreso,
      is_superadmin,
    });
  } catch (err) {
    next(err);
  }
}

async function misPermisos(req, res, next) {
  try {
    if (req.user.is_superadmin) {
      return res.json({ is_superadmin: true, permisos: {} });
    }

    const [grupos] = await pool.query(
      'SELECT GroupID FROM mqv_ugmembers WHERE UserName = ?',
      [req.user.usuario]
    );

    if (!grupos.length) {
      return res.json({ is_superadmin: false, permisos: {} });
    }

    const groupIds = grupos.map(g => g.GroupID);
    const [rights] = await pool.query(
      'SELECT TableName, AccessMask FROM mqv_ugrights WHERE GroupID IN (?)',
      [groupIds]
    );

    // Merge masks por tabla (unión de caracteres)
    const merged = {};
    for (const r of rights) {
      const prev = new Set((merged[r.TableName] || '').split(''));
      for (const c of r.AccessMask.toUpperCase()) prev.add(c);
      merged[r.TableName] = ['A', 'D', 'E', 'S'].filter(c => prev.has(c)).join('');
    }

    res.json({ is_superadmin: false, permisos: merged });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { identificador } = req.body;
    if (!identificador) {
      return res.status(400).json({ error: 'Ingrese su correo electrónico o código de usuario' });
    }

    const [rows] = await pool.query(
      'SELECT usuario, email, nombre_completo, activo FROM usuarios WHERE email = ? OR usuario = ?',
      [identificador, identificador]
    );

    const MSG = 'Si el usuario existe y está activo, recibirá un correo con instrucciones.';

    if (!rows.length || !rows[0].activo || !rows[0].email) {
      return res.json({ message: MSG });
    }

    const u = rows[0];
    const token = crypto.randomBytes(32).toString('hex');

    await pool.query(
      'UPDATE usuarios SET reset_token = ?, reset_date = DATE_ADD(NOW(), INTERVAL 24 HOUR) WHERE usuario = ?',
      [token, u.usuario]
    );

    const link = `${FRONTEND()}/restablecer-password?token=${token}`;
    await sendMail({
      to: u.email,
      subject: 'Restablecer contraseña – Sistema MQV',
      html: emailResetPassword(u.nombre_completo, link),
    });

    res.json({ message: MSG });
  } catch (err) {
    next(err);
  }
}

async function verifyResetToken(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT usuario, nombre_completo FROM usuarios WHERE reset_token = ? AND reset_date > NOW()',
      [req.params.token]
    );
    if (!rows.length) {
      return res.status(400).json({ error: 'El enlace es inválido o ha expirado' });
    }
    res.json({ valid: true, nombre: rows[0].nombre_completo });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Datos incompletos' });
    if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });

    const [rows] = await pool.query(
      'SELECT usuario FROM usuarios WHERE reset_token = ? AND reset_date > NOW()',
      [token]
    );
    if (!rows.length) return res.status(400).json({ error: 'El enlace es inválido o ha expirado' });

    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'UPDATE usuarios SET password = ?, reset_token = NULL, reset_date = NULL, primer_ingreso = 0 WHERE usuario = ?',
      [hash, rows[0].usuario]
    );

    res.json({ message: 'Contraseña actualizada correctamente. Ya puede iniciar sesión.' });
  } catch (err) {
    next(err);
  }
}

async function completeRegistration(req, res, next) {
  try {
    const { token, password, foto } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Datos incompletos' });
    if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });

    const [rows] = await pool.query(
      'SELECT usuario FROM usuarios WHERE reset_token = ? AND reset_date > NOW()',
      [token]
    );
    if (!rows.length) return res.status(400).json({ error: 'El enlace es inválido o ha expirado' });

    const hash = await bcrypt.hash(password, 12);

    if (foto) {
      const b64 = foto.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(b64, 'base64');
      await pool.query(
        'UPDATE usuarios SET password = ?, userpic1 = ?, reset_token = NULL, reset_date = NULL, primer_ingreso = 0 WHERE usuario = ?',
        [hash, buffer, rows[0].usuario]
      );
    } else {
      await pool.query(
        'UPDATE usuarios SET password = ?, reset_token = NULL, reset_date = NULL, primer_ingreso = 0 WHERE usuario = ?',
        [hash, rows[0].usuario]
      );
    }

    res.json({ message: 'Registro completado. Ya puede iniciar sesión.' });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { password_actual, password_nuevo } = req.body;
    if (!password_actual || !password_nuevo) return res.status(400).json({ error: 'Datos incompletos' });
    if (password_nuevo.length < 8) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });

    const [rows] = await pool.query('SELECT password FROM usuarios WHERE usuario = ?', [req.user.usuario]);
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(password_actual, rows[0].password);
    if (!valid) return res.status(400).json({ error: 'La contraseña actual es incorrecta' });

    const hash = await bcrypt.hash(password_nuevo, 12);
    await pool.query(
      'UPDATE usuarios SET password = ?, primer_ingreso = 0 WHERE usuario = ?',
      [hash, req.user.usuario]
    );

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    next(err);
  }
}

async function miPersona(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT idpersonas FROM usuarios WHERE usuario = ?',
      [req.user.usuario]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ idpersonas: rows[0].idpersonas || null });
  } catch (err) {
    next(err);
  }
}

// ── Mi Perfil (sin permiso de personas) ──────────────────────────
async function getMiPerfilPersona(req, res, next) {
  try {
    const [[u]] = await pool.query('SELECT idpersonas FROM usuarios WHERE usuario = ?', [req.user.usuario]);
    if (!u?.idpersonas) return res.status(404).json({ error: 'No tienes una ficha de persona vinculada a tu usuario' });
    // Delegar al controlador de personas reutilizando la lógica
    req.params = { ...req.params, id: String(u.idpersonas) };
    return require('./personasController').obtener(req, res, next);
  } catch (err) { next(err); }
}

async function updateMiPerfilPersona(req, res, next) {
  try {
    const [[u]] = await pool.query('SELECT idpersonas FROM usuarios WHERE usuario = ?', [req.user.usuario]);
    if (!u?.idpersonas) return res.status(404).json({ error: 'No tienes una ficha de persona vinculada a tu usuario' });
    req.params = { ...req.params, id: String(u.idpersonas) };
    return require('./personasController').actualizar(req, res, next);
  } catch (err) { next(err); }
}

module.exports = { login, misPermisos, miPersona, getMiPerfilPersona, updateMiPerfilPersona, forgotPassword, verifyResetToken, resetPassword, completeRegistration, changePassword };
