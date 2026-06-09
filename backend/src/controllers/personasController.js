const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');
const { pool } = require('../config/database');
const XLSX = require('xlsx');
const { sendMail, emailCumpleaneros, emailBienvenida } = require('../config/email');

const FRONTEND = () => process.env.FRONTEND_URL || 'http://localhost:4200';

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads', 'personas');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── Guardar foto base64 en disco, devuelve filename ───────────────
function guardarFotoBase64(base64String, idpersonas) {
  if (!base64String || !base64String.startsWith('data:image')) return null;
  const match = base64String.match(/^data:image\/(\w+);base64,(.+)$/s);
  if (!match) return null;
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const filename = `p_${idpersonas}_${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
  return filename;
}

// ── Eliminar foto anterior del disco ─────────────────────────────
function eliminarFotoDisco(filename) {
  if (!filename) return;
  try { fs.unlinkSync(path.join(UPLOADS_DIR, filename)); } catch {}
}

const CAMPOS_LISTA = `
  p.idpersonas,
  p.primer_nombre, p.segundo_nombre, p.primer_apellido,
  p.segundo_apellido, p.apellidocasada,
  p.fechanacimiento, p.sexo, p.estado_civil,
  p.celular, p.email, p.foto,
  TIMESTAMPDIFF(YEAR, p.fechanacimiento, CURDATE()) AS edad,
  TRIM(CONCAT_WS(' ',
    p.primer_nombre, NULLIF(p.segundo_nombre,''),
    p.primer_apellido, NULLIF(p.segundo_apellido,''),
    NULLIF(p.apellidocasada,'')
  )) AS nombre_completo,
  n.nacionalidad
`;

async function listar(req, res, next) {
  try {
    const { nombre, sexo, estado_civil, grupo, edad_min, edad_max } = req.query;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    let where = `WHERE 1=1`;
    const params = [];

    // Superadmin ve todas las personas; los demás solo ven personas de sus grupos como encargado
    if (!req.user.is_superadmin) {
      where += ` AND p.idpersonas IN (
        SELECT gp.idpersonas FROM grupos_personas gp
        INNER JOIN grupos_encargados ge ON ge.idgrupos = gp.idgrupos
        WHERE ge.idpersonas = (SELECT idpersonas FROM usuarios WHERE usuario = ? LIMIT 1)
      )`;
      params.push(req.user.usuario);
    }

    if (nombre) {
      where += ` AND CONCAT(p.primer_nombre,' ',IFNULL(p.segundo_nombre,''),' ',
                          p.primer_apellido,' ',IFNULL(p.segundo_apellido,'')) LIKE ?`;
      params.push(`%${nombre}%`);
    }
    if (sexo)         { where += ` AND p.sexo = ?`;         params.push(sexo); }
    if (estado_civil) { where += ` AND p.estado_civil = ?`; params.push(estado_civil); }
    if (grupo) {
      where += ` AND p.idpersonas IN (SELECT idpersonas FROM grupos_personas WHERE idgrupos = ?)`;
      params.push(grupo);
    }
    if (edad_min) {
      where += ` AND TIMESTAMPDIFF(YEAR, p.fechanacimiento, CURDATE()) >= ?`;
      params.push(parseInt(edad_min));
    }
    if (edad_max) {
      where += ` AND TIMESTAMPDIFF(YEAR, p.fechanacimiento, CURDATE()) <= ?`;
      params.push(parseInt(edad_max));
    }

    const countSql = `SELECT COUNT(*) AS total FROM personas p
                      LEFT JOIN nacionalidades n ON p.idnacionalidades = n.idnacionalidades
                      ${where}`;
    const [[{ total }]] = await pool.query(countSql, params);

    const dataSql = `SELECT ${CAMPOS_LISTA}
                     FROM personas p
                     LEFT JOIN nacionalidades n ON p.idnacionalidades = n.idnacionalidades
                     ${where}
                     ORDER BY p.primer_apellido, p.primer_nombre
                     LIMIT ? OFFSET ?`;
    const [rows] = await pool.query(dataSql, [...params, limit, offset]);

    res.json({ data: rows, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT p.*,
        TIMESTAMPDIFF(YEAR, p.fechanacimiento, CURDATE()) AS edad,
        TRIM(CONCAT_WS(' ', p.primer_nombre, NULLIF(p.segundo_nombre,''),
             p.primer_apellido, NULLIF(p.segundo_apellido,''),
             NULLIF(p.apellidocasada,''))) AS nombre_completo,
        n.nacionalidad,
        d1.departamento AS dept_nacimiento_nombre, m1.municipio AS muni_nacimiento_nombre,
        d2.departamento AS dept_domicilio_nombre,  m2.municipio AS muni_domicilio_nombre,
        ig1.nombre      AS iglesia_bautizo_nombre, ig2.nombre   AS iglesia_anterior_nombre,
        prof.profesion  AS profesion_nombre,        td.documento AS tipo_documento_nombre
      FROM personas p
      LEFT JOIN nacionalidades n   ON p.idnacionalidades          = n.idnacionalidades
      LEFT JOIN departamentos d1   ON p.iddepartamentos_nacimiento = d1.iddepartamentos
      LEFT JOIN municipios m1      ON p.idmunicipios_nacimiento    = m1.idmunicipios
      LEFT JOIN departamentos d2   ON p.iddepartamentos_domicilio  = d2.iddepartamentos
      LEFT JOIN municipios m2      ON p.idmunicipios_domicilio     = m2.idmunicipios
      LEFT JOIN iglesias ig1       ON p.idiglesias_bautizo         = ig1.idiglesias
      LEFT JOIN iglesias ig2       ON p.idiglesias                 = ig2.idiglesias
      LEFT JOIN profesiones prof   ON p.idprofesiones              = prof.idprofesiones
      LEFT JOIN tipos_documento td ON p.idtipos_documento          = td.idtipos_documento
      WHERE p.idpersonas = ?`, [req.params.id]);

    if (!rows.length) return res.status(404).json({ error: 'Persona no encontrada' });
    const persona = rows[0];

    const [grupos] = await pool.query(`
      SELECT gp.idgrupos_personas, gp.idgrupos, g.grupo
      FROM grupos_personas gp JOIN grupos g ON gp.idgrupos = g.idgrupos
      WHERE gp.idpersonas = ?`, [req.params.id]);
    persona.grupos = grupos;

    res.json(persona);
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const {
      primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, apellidocasada,
      fechanacimiento, lugarnacimiento, idnacionalidades, sexo, estado_civil,
      idtipos_documento, nodocumento, foto,
      telefono, celular, email, perfil_social,
      fecha_inicio_asistencia, fechaconversion, fechabautiso,
      idiglesias_bautizo, idiglesias, estado_iglesia_anterior,
      iglesia_tiempo_anterior, iglesia_pastor_anterior,
      experiencia_ministerial, areas_servir, maestro_escuela_dominical, motivo_ministerio,
      iddepartamentos_nacimiento, idmunicipios_nacimiento,
      iddepartamentos_domicilio, idmunicipios_domicilio,
      zona_domicilio, direccion_domicilio, longitud, latitud,
      idprofesiones, lugartrabajo, direcciontrabajo, puesto_trabajo, experiencia_laboral,
      grupos,
    } = req.body;

    if (!primer_nombre || !primer_apellido || !fechanacimiento || !sexo || !estado_civil) {
      return res.status(400).json({ error: 'Primer nombre, primer apellido, fecha de nacimiento, sexo y estado civil son requeridos' });
    }

    await conn.beginTransaction();

    // Insertar primero para obtener el ID, luego guardar la foto con el ID
    const [result] = await conn.query(`
      INSERT INTO personas (
        primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, apellidocasada,
        fechanacimiento, lugarnacimiento, idnacionalidades, sexo, estado_civil,
        idtipos_documento, nodocumento,
        telefono, celular, email, perfil_social,
        fecha_inicio_asistencia, fechaconversion, fechabautiso,
        idiglesias_bautizo, idiglesias, estado_iglesia_anterior,
        iglesia_tiempo_anterior, iglesia_pastor_anterior,
        experiencia_ministerial, areas_servir, maestro_escuela_dominical, motivo_ministerio,
        iddepartamentos_nacimiento, idmunicipios_nacimiento,
        iddepartamentos_domicilio, idmunicipios_domicilio,
        zona_domicilio, direccion_domicilio, longitud, latitud,
        idprofesiones, lugartrabajo, direcciontrabajo, puesto_trabajo, experiencia_laboral,
        usuario, fechacreacion
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())`,
      [
        primer_nombre, segundo_nombre||null, primer_apellido, segundo_apellido||null, apellidocasada||null,
        fechanacimiento, lugarnacimiento||null, idnacionalidades||null, sexo, estado_civil,
        idtipos_documento||null, nodocumento||null,
        telefono||null, celular||null, email||null, perfil_social||null,
        fecha_inicio_asistencia||null, fechaconversion||null, fechabautiso||null,
        idiglesias_bautizo||null, idiglesias||null, estado_iglesia_anterior||null,
        iglesia_tiempo_anterior||null, iglesia_pastor_anterior||null,
        experiencia_ministerial||null, areas_servir||null,
        maestro_escuela_dominical||null, motivo_ministerio||null,
        iddepartamentos_nacimiento||null, idmunicipios_nacimiento||null,
        iddepartamentos_domicilio||null, idmunicipios_domicilio||null,
        zona_domicilio||null, direccion_domicilio||null,
        longitud||null, latitud||null,
        idprofesiones||null, lugartrabajo||null, direcciontrabajo||null,
        puesto_trabajo||null, experiencia_laboral||null,
        req.user?.usuario||null,
      ]
    );

    const idpersonas = result.insertId;

    // Guardar foto si se envió
    if (foto && foto.startsWith('data:image')) {
      const fotoFilename = guardarFotoBase64(foto, idpersonas);
      if (fotoFilename) {
        await conn.query('UPDATE personas SET foto = ? WHERE idpersonas = ?', [fotoFilename, idpersonas]);
      }
    }

    // Grupos
    if (grupos && grupos.length) {
      const ids = Array.isArray(grupos) ? grupos : JSON.parse(grupos);
      if (ids.length) {
        await conn.query('INSERT IGNORE INTO grupos_personas (idpersonas, idgrupos) VALUES ?',
          [ids.map(g => [idpersonas, g])]);
      }
    }

    await conn.commit();
    res.status(201).json({ message: 'Persona creada correctamente', idpersonas });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally { conn.release(); }
}

async function actualizar(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const {
      primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, apellidocasada,
      fechanacimiento, lugarnacimiento, idnacionalidades, sexo, estado_civil,
      idtipos_documento, nodocumento, foto,
      telefono, celular, email, perfil_social,
      fecha_inicio_asistencia, fechaconversion, fechabautiso,
      idiglesias_bautizo, idiglesias, estado_iglesia_anterior,
      iglesia_tiempo_anterior, iglesia_pastor_anterior,
      experiencia_ministerial, areas_servir, maestro_escuela_dominical, motivo_ministerio,
      iddepartamentos_nacimiento, idmunicipios_nacimiento,
      iddepartamentos_domicilio, idmunicipios_domicilio,
      zona_domicilio, direccion_domicilio, longitud, latitud,
      idprofesiones, lugartrabajo, direcciontrabajo, puesto_trabajo, experiencia_laboral,
      grupos,
    } = req.body;

    if (!primer_nombre || !primer_apellido || !fechanacimiento || !sexo || !estado_civil) {
      return res.status(400).json({ error: 'Campos requeridos faltantes' });
    }

    const [[existe]] = await conn.query('SELECT idpersonas, foto AS fotoActual FROM personas WHERE idpersonas = ?', [id]);
    if (!existe) return res.status(404).json({ error: 'Persona no encontrada' });

    await conn.beginTransaction();

    // Procesar foto
    let fotoFilename = existe.fotoActual; // mantener la actual por defecto
    if (foto === null || foto === '') {
      // Eliminar foto
      eliminarFotoDisco(existe.fotoActual);
      fotoFilename = null;
    } else if (foto && foto.startsWith('data:image')) {
      // Nueva foto
      eliminarFotoDisco(existe.fotoActual);
      fotoFilename = guardarFotoBase64(foto, id);
    }

    await conn.query(`
      UPDATE personas SET
        primer_nombre=?, segundo_nombre=?, primer_apellido=?, segundo_apellido=?, apellidocasada=?,
        fechanacimiento=?, lugarnacimiento=?, idnacionalidades=?, sexo=?, estado_civil=?,
        idtipos_documento=?, nodocumento=?, foto=?,
        telefono=?, celular=?, email=?, perfil_social=?,
        fecha_inicio_asistencia=?, fechaconversion=?, fechabautiso=?,
        idiglesias_bautizo=?, idiglesias=?, estado_iglesia_anterior=?,
        iglesia_tiempo_anterior=?, iglesia_pastor_anterior=?,
        experiencia_ministerial=?, areas_servir=?, maestro_escuela_dominical=?, motivo_ministerio=?,
        iddepartamentos_nacimiento=?, idmunicipios_nacimiento=?,
        iddepartamentos_domicilio=?, idmunicipios_domicilio=?,
        zona_domicilio=?, direccion_domicilio=?, longitud=?, latitud=?,
        idprofesiones=?, lugartrabajo=?, direcciontrabajo=?, puesto_trabajo=?,
        experiencia_laboral=?, usuario=?
      WHERE idpersonas=?`,
      [
        primer_nombre, segundo_nombre||null, primer_apellido, segundo_apellido||null, apellidocasada||null,
        fechanacimiento, lugarnacimiento||null, idnacionalidades||null, sexo, estado_civil,
        idtipos_documento||null, nodocumento||null, fotoFilename,
        telefono||null, celular||null, email||null, perfil_social||null,
        fecha_inicio_asistencia||null, fechaconversion||null, fechabautiso||null,
        idiglesias_bautizo||null, idiglesias||null, estado_iglesia_anterior||null,
        iglesia_tiempo_anterior||null, iglesia_pastor_anterior||null,
        experiencia_ministerial||null, areas_servir||null,
        maestro_escuela_dominical||null, motivo_ministerio||null,
        iddepartamentos_nacimiento||null, idmunicipios_nacimiento||null,
        iddepartamentos_domicilio||null, idmunicipios_domicilio||null,
        zona_domicilio||null, direccion_domicilio||null,
        longitud||null, latitud||null,
        idprofesiones||null, lugartrabajo||null, direcciontrabajo||null,
        puesto_trabajo||null, experiencia_laboral||null,
        req.user?.usuario||null, id,
      ]
    );

    if (grupos !== undefined) {
      const ids = Array.isArray(grupos) ? grupos : JSON.parse(grupos||'[]');
      await conn.query('DELETE FROM grupos_personas WHERE idpersonas = ?', [id]);
      if (ids.length) {
        await conn.query('INSERT IGNORE INTO grupos_personas (idpersonas, idgrupos) VALUES ?',
          [ids.map(g => [id, g])]);
      }
    }

    await conn.commit();
    res.json({ message: 'Persona actualizada correctamente' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally { conn.release(); }
}

async function eliminar(req, res, next) {
  try {
    const [[p]] = await pool.query('SELECT foto FROM personas WHERE idpersonas = ?', [req.params.id]);
    if (!p) return res.status(404).json({ error: 'Persona no encontrada' });
    eliminarFotoDisco(p.foto);
    await pool.query('DELETE FROM personas WHERE idpersonas = ?', [req.params.id]);
    res.json({ message: 'Persona eliminada' });
  } catch (err) { next(err); }
}

async function cumpleaneros(req, res, next) {
  try {
    const mesNum = req.query.mes ? parseInt(req.query.mes, 10) : new Date().getMonth() + 1;
    const [rows] = await pool.query(`
      SELECT idpersonas,
        primer_nombre, primer_apellido,
        TRIM(CONCAT_WS(' ', primer_nombre, NULLIF(segundo_nombre,''),
                       primer_apellido, NULLIF(segundo_apellido,''))) AS nombre_completo,
        fechanacimiento,
        MONTH(fechanacimiento) AS mes_nac, DAY(fechanacimiento) AS dia_nac,
        TIMESTAMPDIFF(YEAR, fechanacimiento, CURDATE()) AS edad,
        sexo, celular, foto
      FROM personas
      WHERE MONTH(fechanacimiento) = ?
      ORDER BY DAY(fechanacimiento), primer_apellido`, [mesNum]);
    res.json({ mes: mesNum, cumpleaneros: rows });
  } catch (err) { next(err); }
}

async function exportarExcel(req, res, next) {
  try {
    const { nombre, sexo, estado_civil, grupo } = req.query;
    let sql = `
      SELECT p.idpersonas AS ID,
        TRIM(CONCAT_WS(' ', p.primer_nombre, NULLIF(p.segundo_nombre,''),
             p.primer_apellido, NULLIF(p.segundo_apellido,''),
             NULLIF(p.apellidocasada,''))) AS Nombre,
        p.fechanacimiento AS 'Fecha Nacimiento',
        TIMESTAMPDIFF(YEAR, p.fechanacimiento, CURDATE()) AS Edad,
        CASE p.sexo WHEN 'M' THEN 'Masculino' WHEN 'F' THEN 'Femenino' ELSE p.sexo END AS Sexo,
        p.estado_civil AS 'Estado Civil', td.documento AS 'Tipo Doc.',
        p.nodocumento AS 'No. Documento', n.nacionalidad AS Nacionalidad,
        p.telefono, p.celular, p.email,
        d2.departamento AS Departamento, m2.municipio AS Municipio,
        p.zona_domicilio AS Zona, p.direccion_domicilio AS Dirección,
        prof.profesion AS Profesión, p.lugartrabajo AS 'Lugar Trabajo'
      FROM personas p
      LEFT JOIN nacionalidades n   ON p.idnacionalidades          = n.idnacionalidades
      LEFT JOIN tipos_documento td ON p.idtipos_documento         = td.idtipos_documento
      LEFT JOIN departamentos d2   ON p.iddepartamentos_domicilio = d2.iddepartamentos
      LEFT JOIN municipios m2      ON p.idmunicipios_domicilio    = m2.idmunicipios
      LEFT JOIN profesiones prof   ON p.idprofesiones             = prof.idprofesiones
      WHERE 1=1`;
    const params = [];
    if (nombre) { sql += ` AND CONCAT(p.primer_nombre,' ',p.primer_apellido) LIKE ?`; params.push(`%${nombre}%`); }
    if (sexo)         { sql += ` AND p.sexo = ?`;         params.push(sexo); }
    if (estado_civil) { sql += ` AND p.estado_civil = ?`; params.push(estado_civil); }
    if (grupo) { sql += ` AND p.idpersonas IN (SELECT idpersonas FROM grupos_personas WHERE idgrupos = ?)`; params.push(grupo); }
    sql += ` ORDER BY p.primer_apellido, p.primer_nombre`;

    const [rows] = await pool.query(sql, params);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    if (rows.length) ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length, 12) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Personas');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.set('Content-Disposition', 'attachment; filename="personas.xlsx"');
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) { next(err); }
}

async function enviarEmailCumpleaneros(req, res, next) {
  try {
    const [[p]] = await pool.query(
      'SELECT primer_nombre, primer_apellido, email FROM personas WHERE idpersonas = ?',
      [req.params.id]
    );
    if (!p) return res.status(404).json({ error: 'Persona no encontrada' });
    if (!p.email) return res.status(400).json({ error: 'La persona no tiene correo electrónico registrado' });
    await sendMail({
      to: p.email,
      subject: `🎂 ¡Feliz Cumpleaños, ${p.primer_nombre}!`,
      html: emailCumpleaneros(`${p.primer_nombre} ${p.primer_apellido}`),
    });
    res.json({ message: `Correo enviado a ${p.email}` });
  } catch (err) { next(err); }
}

// ── Crecimiento ───────────────────────────────────────────────────
async function listarCrecimiento(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT pc.idpersonas_crecimiento, pc.idpersonas, pc.idestados_crecimiento,
             pc.fecha, pc.comentario, ec.estado
      FROM personas_crecimiento pc
      JOIN estados_crecimiento ec ON pc.idestados_crecimiento = ec.idestados_crecimiento
      WHERE pc.idpersonas = ?
      ORDER BY pc.fecha DESC`, [req.params.id]);
    res.json(rows);
  } catch (err) { next(err); }
}

async function agregarCrecimiento(req, res, next) {
  try {
    const { fecha, comentario, idestados_crecimiento } = req.body;
    if (!idestados_crecimiento) return res.status(400).json({ error: 'Estado de crecimiento es requerido' });
    if (comentario && comentario.length > 245) return res.status(400).json({ error: 'El comentario no debe superar 245 caracteres' });
    const fechaFinal = fecha || new Date().toISOString().split('T')[0];
    await pool.query(
      'INSERT INTO personas_crecimiento (idpersonas, idestados_crecimiento, fecha, comentario) VALUES (?, ?, ?, ?)',
      [req.params.id, idestados_crecimiento, fechaFinal, comentario || null]
    );
    res.status(201).json({ message: 'Registro de crecimiento agregado' });
  } catch (err) { next(err); }
}

async function eliminarCrecimiento(req, res, next) {
  try {
    const [r] = await pool.query(
      'DELETE FROM personas_crecimiento WHERE idpersonas_crecimiento = ? AND idpersonas = ?',
      [req.params.idcrecimiento, req.params.id]
    );
    if (!r.affectedRows) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json({ message: 'Registro eliminado' });
  } catch (err) { next(err); }
}

// ── Crear usuario desde persona ───────────────────────────────────
async function crearUsuarioDesdePersona(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const idpersonas = req.params.id;
    const { usuario, nombre_completo, email, telefono, grupo_id, encargado_grupo_id } = req.body;

    if (!usuario || !nombre_completo || !email) {
      return res.status(400).json({ error: 'Código, nombre completo y correo son requeridos' });
    }

    // Verificar que la persona existe
    const [[persona]] = await conn.query('SELECT idpersonas FROM personas WHERE idpersonas = ?', [idpersonas]);
    if (!persona) return res.status(404).json({ error: 'Persona no encontrada' });

    // Verificar que la persona no ya tiene usuario
    const [[yaVinculado]] = await conn.query('SELECT usuario FROM usuarios WHERE idpersonas = ?', [idpersonas]);
    if (yaVinculado) return res.status(409).json({ error: `Esta persona ya tiene el usuario "${yaVinculado.usuario}" asignado` });

    // Verificar que el código de usuario no exista
    const [[existe]] = await conn.query('SELECT usuario FROM usuarios WHERE usuario = ?', [usuario]);
    if (existe) return res.status(409).json({ error: 'El código de usuario ya está en uso' });

    // Verificar que el correo no esté ya registrado en otro usuario
    const [[emailExiste]] = await conn.query('SELECT usuario FROM usuarios WHERE email = ?', [email]);
    if (emailExiste) return res.status(409).json({ error: 'Ya existe un usuario registrado con ese correo electrónico' });

    const token = crypto.randomBytes(32).toString('hex');

    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO usuarios (usuario, nombre_completo, email, telefono, activo, primer_ingreso, password, reset_token, reset_date, idpersonas)
       VALUES (?, ?, ?, ?, 1, 1, ?, ?, DATE_ADD(NOW(), INTERVAL 72 HOUR), ?)`,
      [usuario, nombre_completo, email, telefono || null, '', token, idpersonas]
    );

    // Asignar grupo de permisos si se especificó
    if (grupo_id) {
      await conn.query('INSERT IGNORE INTO mqv_ugmembers (GroupID, UserName) VALUES (?, ?)', [grupo_id, usuario]);
    }

    // Asignar como encargado de grupo si se especificó
    if (encargado_grupo_id) {
      // Obtener idpersonas del nuevo usuario (ya lo tenemos)
      await conn.query(
        'INSERT IGNORE INTO grupos_encargados (idgrupos, idpersonas) VALUES (?, ?)',
        [encargado_grupo_id, idpersonas]
      );
    }

    await conn.commit();

    const link = `${FRONTEND()}/completar-registro?token=${token}`;
    await sendMail({
      to: email,
      subject: 'Bienvenido – Completa tu registro en Sistema MQV',
      html: emailBienvenida(nombre_completo, usuario, link),
    });

    res.status(201).json({ message: 'Usuario creado correctamente. Se envió correo de activación.' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally { conn.release(); }
}

module.exports = {
  listar, obtener, crear, actualizar, eliminar,
  cumpleaneros, exportarExcel, enviarEmailCumpleaneros,
  listarCrecimiento, agregarCrecimiento, eliminarCrecimiento,
  crearUsuarioDesdePersona,
};
