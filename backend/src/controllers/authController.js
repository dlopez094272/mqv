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

function firmarToken(u, is_superadmin) {
  return jwt.sign(
    {
      usuario: u.usuario,
      nombre: u.nombre_completo,
      primer_ingreso: u.primer_ingreso,
      is_superadmin,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

const hashRefresh = t => crypto.createHash('sha256').update(String(t)).digest('hex');

async function crearSesionDispositivo(usuario, d) {
  const refresh = crypto.randomBytes(48).toString('base64url');
  await pool.query(
    `INSERT INTO usuarios_dispositivos (usuario, refresh_hash, plataforma, modelo, app_version)
     VALUES (?, ?, ?, ?, ?)`,
    [usuario, hashRefresh(refresh),
     String(d.plataforma || '').slice(0, 20) || null,
     String(d.modelo || '').slice(0, 120) || null,
     String(d.app_version || '').slice(0, 20) || null]
  );
  return refresh;
}

/**
 * POST /auth/renovar { refresh_token, app_version? }
 * Entrega un token nuevo a un dispositivo con sesión iniciada. La sesión solo
 * termina si el usuario la cierra, se desactiva su usuario o se elimina el dispositivo.
 */
async function renovar(req, res, next) {
  try {
    const { refresh_token, app_version } = req.body || {};
    if (!refresh_token) return res.status(400).json({ error: 'Falta el token de renovación' });
    const [[d]] = await pool.query(
      `SELECT d.iddispositivo, u.usuario, u.nombre_completo, u.activo, u.primer_ingreso
       FROM usuarios_dispositivos d JOIN usuarios u ON u.usuario = d.usuario
       WHERE d.refresh_hash = ?`,
      [hashRefresh(refresh_token)]
    );
    if (!d) return res.status(401).json({ error: 'La sesión de este dispositivo fue cerrada. Ingresa de nuevo.', code: 'SESION_CERRADA' });
    if (!d.activo) return res.status(403).json({ error: 'Usuario desactivado. Contacte al administrador.', code: 'SESION_CERRADA' });

    await pool.query(
      'UPDATE usuarios_dispositivos SET ultimo_uso = NOW(), app_version = COALESCE(?, app_version) WHERE iddispositivo = ?',
      [app_version ? String(app_version).slice(0, 20) : null, d.iddispositivo]
    );
    const is_superadmin = await esSuperadmin(d.usuario);
    res.json({
      token: firmarToken(d, is_superadmin),
      usuario: d.usuario,
      nombre: d.nombre_completo,
      primer_ingreso: d.primer_ingreso,
      is_superadmin,
    });
  } catch (err) { next(err); }
}

/** POST /auth/cerrar-sesion { refresh_token } — el usuario cierra la sesión en su teléfono. */
async function cerrarSesion(req, res, next) {
  try {
    const { refresh_token } = req.body || {};
    if (refresh_token) {
      await pool.query('DELETE FROM usuarios_dispositivos WHERE refresh_hash = ?', [hashRefresh(refresh_token)]);
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
}

/** PUT /auth/push-token { refresh_token, push_token } — registra el token de notificaciones del teléfono. */
async function registrarPushToken(req, res, next) {
  try {
    const { refresh_token, push_token } = req.body || {};
    if (!refresh_token) return res.status(400).json({ error: 'Falta el token de renovación' });
    const token = push_token ? String(push_token).slice(0, 512) : null;
    if (token) {
      // Un teléfono pertenece a una sola sesión: si otro usuario lo usaba, se le quita
      await pool.query('UPDATE usuarios_dispositivos SET push_token = NULL WHERE push_token = ? AND refresh_hash <> ?',
        [token, hashRefresh(refresh_token)]);
    }
    const [r] = await pool.query(
      'UPDATE usuarios_dispositivos SET push_token = ?, ultimo_uso = NOW() WHERE refresh_hash = ? AND usuario = ?',
      [token, hashRefresh(refresh_token), req.user.usuario]
    );
    if (!r.affectedRows) return res.status(404).json({ error: 'Dispositivo no encontrado' });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

/**
 * POST /auth/dispositivo { dispositivo } (con sesión) — convierte una sesión
 * existente de la app en sesión de dispositivo con token de renovación
 * (para teléfonos que actualizan desde una versión anterior).
 */
async function registrarDispositivo(req, res, next) {
  try {
    const refresh_token = await crearSesionDispositivo(req.user.usuario, req.body?.dispositivo || {});
    res.status(201).json({ refresh_token });
  } catch (err) { next(err); }
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

    const token = firmarToken(u, is_superadmin);

    // App móvil: sesión por dispositivo que no se cierra sola (ver /auth/renovar)
    let refresh_token;
    if (req.body.dispositivo && typeof req.body.dispositivo === 'object') {
      refresh_token = await crearSesionDispositivo(u.usuario, req.body.dispositivo);
    }

    res.json({
      token,
      refresh_token,
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

// ── Mi cuenta (app móvil): usuario + datos de contacto de su ficha ──
const CAMPOS_MIS_DATOS = [
  'celular', 'telefono', 'email', 'perfil_social',
  'zona_domicilio', 'direccion_domicilio',
  'lugartrabajo', 'puesto_trabajo', 'estado_civil',
];

async function miCuenta(req, res, next) {
  try {
    const [[u]] = await pool.query(
      'SELECT usuario, nombre_completo, email, telefono, idpersonas, primer_ingreso FROM usuarios WHERE usuario = ?',
      [req.user.usuario]);
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
    let persona = null;
    if (u.idpersonas) {
      const [[p]] = await pool.query(`
        SELECT p.idpersonas, p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido,
               TRIM(CONCAT_WS(' ', p.primer_nombre, NULLIF(p.segundo_nombre,''), p.primer_apellido,
                    NULLIF(p.segundo_apellido,''), NULLIF(p.apellidocasada,''))) AS nombre_completo,
               p.fechanacimiento, p.sexo, p.foto, ${CAMPOS_MIS_DATOS.map(c => 'p.' + c).join(', ')},
               d.departamento AS departamento_domicilio, m.municipio AS municipio_domicilio
        FROM personas p
        LEFT JOIN departamentos d ON d.iddepartamentos = p.iddepartamentos_domicilio
        LEFT JOIN municipios m    ON m.idmunicipios    = p.idmunicipios_domicilio
        WHERE p.idpersonas = ?`, [u.idpersonas]);
      if (p) {
        const [grupos] = await pool.query(
          'SELECT g.idgrupos, g.grupo FROM grupos_personas gp JOIN grupos g ON g.idgrupos = gp.idgrupos WHERE gp.idpersonas = ? ORDER BY g.grupo',
          [u.idpersonas]);
        p.grupos = grupos;
        persona = p;
      }
    }
    res.json({ usuario: u.usuario, nombre: u.nombre_completo, email: u.email, telefono: u.telefono,
               primer_ingreso: u.primer_ingreso, is_superadmin: !!req.user.is_superadmin, persona });
  } catch (err) { next(err); }
}

/** Actualiza solo los datos de contacto de la ficha propia (y la foto si se envía). */
async function actualizarMisDatos(req, res, next) {
  try {
    const [[u]] = await pool.query('SELECT idpersonas FROM usuarios WHERE usuario = ?', [req.user.usuario]);
    if (!u?.idpersonas) return res.status(404).json({ error: 'No tienes una ficha de persona vinculada a tu usuario' });

    const cambios = {};
    for (const c of CAMPOS_MIS_DATOS) {
      if (req.body[c] !== undefined) {
        const v = (req.body[c] ?? '').toString().trim();
        cambios[c] = v ? v.slice(0, 500) : null;
      }
    }
    if (cambios.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cambios.email)) {
      return res.status(400).json({ error: 'El correo electrónico no es válido' });
    }
    if (cambios.estado_civil === null) delete cambios.estado_civil; // es requerido en la ficha

    const { guardarFotoBase64, eliminarFotoDisco } = require('./personasController');
    if (req.body.foto !== undefined) {
      const [[actual]] = await pool.query('SELECT foto FROM personas WHERE idpersonas = ?', [u.idpersonas]);
      if (req.body.foto === null || req.body.foto === '') {
        eliminarFotoDisco(actual?.foto);
        cambios.foto = null;
      } else if (typeof req.body.foto === 'string' && req.body.foto.startsWith('data:image')) {
        const nueva = guardarFotoBase64(req.body.foto, u.idpersonas);
        if (nueva) { eliminarFotoDisco(actual?.foto); cambios.foto = nueva; }
      }
    }

    if (!Object.keys(cambios).length) return res.status(400).json({ error: 'No se recibió ningún cambio' });
    cambios.usuario = req.user.usuario;
    await pool.query('UPDATE personas SET ? WHERE idpersonas = ?', [cambios, u.idpersonas]);
    req.params = {};
    return miCuenta(req, res, next);
  } catch (err) { next(err); }
}

module.exports = { registrarDispositivo, renovar, cerrarSesion, registrarPushToken, miCuenta, actualizarMisDatos, login, misPermisos, miPersona, getMiPerfilPersona, updateMiPerfilPersona, forgotPassword, verifyResetToken, resetPassword, completeRegistration, changePassword };
