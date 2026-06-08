const router       = require('express').Router();
const { pool }     = require('../config/database');
const authMiddleware  = require('../middleware/authMiddleware');
const checkPermission = require('../middleware/permissionsMiddleware');

router.use(authMiddleware);

/* ─────────────────────────────────────────────────────────────
   GET /reportes/cumpleaneros?mes=&anio=
   Permiso: personas:S
   Superadmin → todos; usuario normal → solo su(s) grupo(s) como encargado
   ───────────────────────────────────────────────────────────── */
router.get('/cumpleaneros', checkPermission('personas', 'S'), async (req, res, next) => {
  try {
    const mes  = parseInt(req.query.mes)  || new Date().getMonth() + 1;
    const anio = parseInt(req.query.anio) || new Date().getFullYear();

    let sql = `
      SELECT
        p.idpersonas,
        TRIM(CONCAT_WS(' ',
          p.primer_nombre, NULLIF(p.segundo_nombre,''),
          p.primer_apellido, NULLIF(p.segundo_apellido,''),
          NULLIF(p.apellidocasada,'')
        )) AS nombre_completo,
        p.foto, p.celular, p.email,
        DAY(p.fechanacimiento)   AS dia_nac,
        MONTH(p.fechanacimiento) AS mes_nac,
        TIMESTAMPDIFF(YEAR, p.fechanacimiento, CURDATE()) AS edad,
        GROUP_CONCAT(DISTINCT g.grupo ORDER BY g.grupo SEPARATOR ', ') AS grupos
      FROM personas p
      LEFT JOIN grupos_personas gp ON gp.idpersonas = p.idpersonas
      LEFT JOIN grupos g           ON g.idgrupos    = gp.idgrupos
      WHERE MONTH(p.fechanacimiento) = ?
        AND p.fechanacimiento IS NOT NULL
    `;
    const params = [mes];

    if (!req.user.is_superadmin) {
      sql += ` AND p.idpersonas IN (
        SELECT gp2.idpersonas FROM grupos_personas gp2
        INNER JOIN grupos_encargados ge ON ge.idgrupos = gp2.idgrupos
        WHERE ge.idpersonas = (SELECT idpersonas FROM usuarios WHERE usuario = ? LIMIT 1)
      )`;
      params.push(req.user.usuario);
    }

    sql += ` GROUP BY p.idpersonas ORDER BY DAY(p.fechanacimiento), nombre_completo`;

    const [rows] = await pool.query(sql, params);
    res.json({ mes, anio, cumpleaneros: rows });
  } catch (err) { next(err); }
});

/* ─────────────────────────────────────────────────────────────
   GET /reportes/actividades?fecha_inicio=&fecha_fin=
   Permiso: actividades:S
   Superadmin → todas; usuario normal → solo grupos donde es encargado
   Devuelve por actividad:
     - resumen (nombre, logo, total_personas, total_visitantes, total_asistentes)
     - grupos relacionados con sus asistentes
     - desglose por edad
     - desglose por género
   ───────────────────────────────────────────────────────────── */
router.get('/actividades', checkPermission('actividades', 'S'), async (req, res, next) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({ error: 'Se requieren fecha_inicio y fecha_fin' });
    }

    // ── Determinar alcance ──────────────────────────────────────
    let gruposFiltro = null; // null = superadmin (ve todo)
    if (!req.user.is_superadmin) {
      const [gRows] = await pool.query(`
        SELECT ge.idgrupos
        FROM grupos_encargados ge
        JOIN usuarios u ON u.idpersonas = ge.idpersonas
        WHERE u.usuario = ?
      `, [req.user.usuario]);
      gruposFiltro = gRows.map(g => g.idgrupos);
      if (!gruposFiltro.length) return res.json({ actividades: [] });
    }

    // ── Actividades en el rango ─────────────────────────────────
    let actQuery = `
      SELECT DISTINCT
        a.idactividades, a.nombre, a.logo,
        a.fecha_inicio, a.fecha_fin, a.hora_inicio, a.hora_fin,
        a.descripcion,
        ac.categoria, IFNULL(ac.color,'#3788d8') AS categoria_color,
        l.lugar
      FROM actividades a
      LEFT JOIN actividades_categorias ac ON ac.idactividades_categorias = a.idcategorias
      LEFT JOIN lugares l                 ON l.idlugares = a.idlugares
    `;
    const actParams = [];

    if (gruposFiltro) {
      actQuery += `
        JOIN actividades_grupos ag ON ag.idactividades = a.idactividades
         AND ag.idgrupos IN (?)
      `;
      actParams.push(gruposFiltro);
    }

    actQuery += ` WHERE a.fecha_inicio >= ? AND a.fecha_inicio <= ?
                  ORDER BY a.fecha_inicio, a.nombre`;
    actParams.push(fecha_inicio, fecha_fin);

    const [actividades] = await pool.query(actQuery, actParams);
    if (!actividades.length) return res.json({ actividades: [] });

    const ids = actividades.map(a => a.idactividades);

    // ── Totales de asistentes por actividad ─────────────────────
    const [totales] = await pool.query(`
      SELECT
        aa.idactividades,
        COUNT(DISTINCT aa.idactividades_asistentes) AS total,
        COUNT(DISTINCT CASE WHEN aa.idpersonas IS NOT NULL THEN aa.idactividades_asistentes END) AS total_personas,
        COUNT(DISTINCT CASE WHEN aa.idpersonas IS NULL     THEN aa.idactividades_asistentes END) AS total_visitantes
      FROM actividades_asistentes aa
      WHERE aa.idactividades IN (?)
      GROUP BY aa.idactividades
    `, [ids]);

    // ── Grupos por actividad con conteo de asistentes ───────────
    const [gruposPorAct] = await pool.query(`
      SELECT
        ag.idactividades,
        g.idgrupos,
        g.grupo,
        COUNT(DISTINCT CASE WHEN gp.idpersonas IS NOT NULL THEN aa.idpersonas END) AS total_asistentes
      FROM actividades_grupos ag
      JOIN grupos g ON g.idgrupos = ag.idgrupos
      LEFT JOIN actividades_asistentes aa ON aa.idactividades = ag.idactividades AND aa.idpersonas IS NOT NULL
      LEFT JOIN grupos_personas gp        ON gp.idpersonas = aa.idpersonas AND gp.idgrupos = ag.idgrupos
      WHERE ag.idactividades IN (?)
      GROUP BY ag.idactividades, ag.idgrupos, g.grupo
      ORDER BY g.grupo
    `, [ids]);

    // ── Desglose por edad (solo personas registradas, no visitantes) ──
    const [porEdad] = await pool.query(`
      SELECT
        aa.idactividades,
        SUM(CASE WHEN TIMESTAMPDIFF(YEAR,p.fechanacimiento,CURDATE()) BETWEEN 0  AND  2  THEN 1 ELSE 0 END) AS bebes,
        SUM(CASE WHEN TIMESTAMPDIFF(YEAR,p.fechanacimiento,CURDATE()) BETWEEN 3  AND  12 THEN 1 ELSE 0 END) AS ninos,
        SUM(CASE WHEN TIMESTAMPDIFF(YEAR,p.fechanacimiento,CURDATE()) BETWEEN 13 AND  17 THEN 1 ELSE 0 END) AS adolescentes,
        SUM(CASE WHEN TIMESTAMPDIFF(YEAR,p.fechanacimiento,CURDATE()) BETWEEN 18 AND  25 THEN 1 ELSE 0 END) AS jovenes,
        SUM(CASE WHEN TIMESTAMPDIFF(YEAR,p.fechanacimiento,CURDATE()) BETWEEN 26 AND  59 THEN 1 ELSE 0 END) AS adultos,
        SUM(CASE WHEN TIMESTAMPDIFF(YEAR,p.fechanacimiento,CURDATE()) >= 60              THEN 1 ELSE 0 END) AS adultos_mayores,
        SUM(CASE WHEN p.fechanacimiento IS NULL                                          THEN 1 ELSE 0 END) AS sin_fecha
      FROM actividades_asistentes aa
      JOIN personas p ON p.idpersonas = aa.idpersonas
      WHERE aa.idactividades IN (?)
      GROUP BY aa.idactividades
    `, [ids]);

    // ── Desglose por género ─────────────────────────────────────
    const [porGenero] = await pool.query(`
      SELECT
        aa.idactividades,
        SUM(CASE WHEN p.sexo = 'M'                      THEN 1 ELSE 0 END) AS hombres,
        SUM(CASE WHEN p.sexo = 'F'                      THEN 1 ELSE 0 END) AS mujeres,
        SUM(CASE WHEN p.sexo NOT IN ('M','F') OR p.sexo IS NULL THEN 1 ELSE 0 END) AS sin_dato
      FROM actividades_asistentes aa
      JOIN personas p ON p.idpersonas = aa.idpersonas
      WHERE aa.idactividades IN (?)
      GROUP BY aa.idactividades
    `, [ids]);

    // ── Combinar resultados ─────────────────────────────────────
    const result = actividades.map(act => {
      const t = totales.find(x => x.idactividades === act.idactividades)
             || { total: 0, total_personas: 0, total_visitantes: 0 };
      const e = porEdad.find(x => x.idactividades === act.idactividades)
             || { bebes: 0, ninos: 0, adolescentes: 0, jovenes: 0, adultos: 0, adultos_mayores: 0, sin_fecha: 0 };
      const g = porGenero.find(x => x.idactividades === act.idactividades)
             || { hombres: 0, mujeres: 0, sin_dato: 0 };

      return {
        ...act,
        total_asistentes:  Number(t.total)            || 0,
        total_personas:    Number(t.total_personas)   || 0,
        total_visitantes:  Number(t.total_visitantes) || 0,
        grupos: gruposPorAct
          .filter(x => x.idactividades === act.idactividades)
          .map(x => ({ idgrupos: x.idgrupos, grupo: x.grupo, total_asistentes: Number(x.total_asistentes) || 0 })),
        por_edad: {
          bebes:          Number(e.bebes)          || 0,
          ninos:          Number(e.ninos)          || 0,
          adolescentes:   Number(e.adolescentes)   || 0,
          jovenes:        Number(e.jovenes)        || 0,
          adultos:        Number(e.adultos)        || 0,
          adultos_mayores:Number(e.adultos_mayores)|| 0,
          sin_fecha:      Number(e.sin_fecha)      || 0,
        },
        por_genero: {
          hombres:  Number(g.hombres)  || 0,
          mujeres:  Number(g.mujeres)  || 0,
          sin_dato: Number(g.sin_dato) || 0,
        },
      };
    });

    res.json({ actividades: result });
  } catch (err) { next(err); }
});

/* ─────────────────────────────────────────────────────────────
   GET /reportes/personas
   Permiso: personas:S
   Devuelve estadísticas globales de personas:
     - por género, por rango de edad, por nacionalidad,
     - convertidos, bautizados, por año de inicio asistencia,
     - por departamento de nacimiento, por profesión
   ───────────────────────────────────────────────────────────── */
router.get('/personas', checkPermission('personas', 'S'), async (req, res, next) => {
  try {
    // ── Alcance (mismo filtro de visibilidad que listar) ────────
    let baseWhere = 'WHERE 1=1';
    const baseParams = [];
    if (!req.user.is_superadmin) {
      baseWhere += ` AND p.idpersonas IN (
        SELECT gp.idpersonas FROM grupos_personas gp
        INNER JOIN grupos_encargados ge ON ge.idgrupos = gp.idgrupos
        WHERE ge.idpersonas = (SELECT idpersonas FROM usuarios WHERE usuario = ? LIMIT 1)
      )`;
      baseParams.push(req.user.usuario);
    }

    // ── Total general ───────────────────────────────────────────
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM personas p ${baseWhere}`, baseParams);

    // ── Por género ──────────────────────────────────────────────
    const [porGenero] = await pool.query(`
      SELECT
        SUM(CASE WHEN p.sexo = 'M' THEN 1 ELSE 0 END) AS hombres,
        SUM(CASE WHEN p.sexo = 'F' THEN 1 ELSE 0 END) AS mujeres,
        SUM(CASE WHEN p.sexo NOT IN ('M','F') OR p.sexo IS NULL THEN 1 ELSE 0 END) AS sin_dato
      FROM personas p ${baseWhere}`, baseParams);

    // ── Por rango de edad ───────────────────────────────────────
    const [porEdad] = await pool.query(`
      SELECT
        SUM(CASE WHEN TIMESTAMPDIFF(YEAR,p.fechanacimiento,CURDATE()) BETWEEN 0  AND 2   THEN 1 ELSE 0 END) AS bebes,
        SUM(CASE WHEN TIMESTAMPDIFF(YEAR,p.fechanacimiento,CURDATE()) BETWEEN 3  AND 12  THEN 1 ELSE 0 END) AS ninos,
        SUM(CASE WHEN TIMESTAMPDIFF(YEAR,p.fechanacimiento,CURDATE()) BETWEEN 13 AND 17  THEN 1 ELSE 0 END) AS adolescentes,
        SUM(CASE WHEN TIMESTAMPDIFF(YEAR,p.fechanacimiento,CURDATE()) BETWEEN 18 AND 25  THEN 1 ELSE 0 END) AS jovenes,
        SUM(CASE WHEN TIMESTAMPDIFF(YEAR,p.fechanacimiento,CURDATE()) BETWEEN 26 AND 59  THEN 1 ELSE 0 END) AS adultos,
        SUM(CASE WHEN TIMESTAMPDIFF(YEAR,p.fechanacimiento,CURDATE()) >= 60              THEN 1 ELSE 0 END) AS adultos_mayores,
        SUM(CASE WHEN p.fechanacimiento IS NULL                                          THEN 1 ELSE 0 END) AS sin_fecha
      FROM personas p ${baseWhere}`, baseParams);

    // ── Convertidos y bautizados ────────────────────────────────
    const [[eclesial]] = await pool.query(`
      SELECT
        SUM(CASE WHEN p.fechaconversion IS NOT NULL THEN 1 ELSE 0 END) AS convertidos,
        SUM(CASE WHEN p.fechabautiso    IS NOT NULL THEN 1 ELSE 0 END) AS bautizados
      FROM personas p ${baseWhere}`, baseParams);

    // ── Por nacionalidad ────────────────────────────────────────
    const [porNacionalidad] = await pool.query(`
      SELECT COALESCE(n.nacionalidad, 'Sin dato') AS etiqueta, COUNT(*) AS cantidad
      FROM personas p
      LEFT JOIN nacionalidades n ON n.idnacionalidades = p.idnacionalidades
      ${baseWhere}
      GROUP BY n.idnacionalidades, n.nacionalidad
      ORDER BY cantidad DESC
      LIMIT 20`, baseParams);

    // ── Por año de inicio de asistencia ────────────────────────
    const [porAnioAsistencia] = await pool.query(`
      SELECT YEAR(p.fecha_inicio_asistencia) AS anio, COUNT(*) AS cantidad
      FROM personas p
      ${baseWhere} AND p.fecha_inicio_asistencia IS NOT NULL
      GROUP BY YEAR(p.fecha_inicio_asistencia)
      ORDER BY anio ASC`, baseParams);

    // ── Por departamento de nacimiento ──────────────────────────
    const [porDepartamento] = await pool.query(`
      SELECT COALESCE(d.departamento, 'Sin dato') AS etiqueta, COUNT(*) AS cantidad
      FROM personas p
      LEFT JOIN departamentos d ON d.iddepartamentos = p.iddepartamentos_nacimiento
      ${baseWhere}
      GROUP BY d.iddepartamentos, d.departamento
      ORDER BY cantidad DESC
      LIMIT 25`, baseParams);

    // ── Por profesión ───────────────────────────────────────────
    const [porProfesion] = await pool.query(`
      SELECT COALESCE(pr.profesion, 'Sin dato') AS etiqueta, COUNT(*) AS cantidad
      FROM personas p
      LEFT JOIN profesiones pr ON pr.idprofesiones = p.idprofesiones
      ${baseWhere}
      GROUP BY pr.idprofesiones, pr.profesion
      ORDER BY cantidad DESC
      LIMIT 20`, baseParams);

    const g = porGenero[0];
    const e = porEdad[0];
    res.json({
      total:       Number(total) || 0,
      por_genero: {
        hombres:  Number(g.hombres)  || 0,
        mujeres:  Number(g.mujeres)  || 0,
        sin_dato: Number(g.sin_dato) || 0,
      },
      por_edad: {
        bebes:          Number(e.bebes)          || 0,
        ninos:          Number(e.ninos)          || 0,
        adolescentes:   Number(e.adolescentes)   || 0,
        jovenes:        Number(e.jovenes)        || 0,
        adultos:        Number(e.adultos)        || 0,
        adultos_mayores:Number(e.adultos_mayores)|| 0,
        sin_fecha:      Number(e.sin_fecha)      || 0,
      },
      eclesial: {
        convertidos: Number(eclesial.convertidos) || 0,
        bautizados:  Number(eclesial.bautizados)  || 0,
      },
      por_nacionalidad:   porNacionalidad,
      por_anio_asistencia: porAnioAsistencia,
      por_departamento:   porDepartamento,
      por_profesion:      porProfesion,
    });
  } catch (err) { next(err); }
});

module.exports = router;
