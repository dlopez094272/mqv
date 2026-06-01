const router = require('express').Router();
const { pool } = require('../config/database');
const authMiddleware = require('../middleware/authMiddleware');
const checkPermission = require('../middleware/permissionsMiddleware');

router.use(authMiddleware);

const CATALOGS = {
  iglesias: {
    tabla: 'iglesias', pk: 'idiglesias',
    campos: ['nombre', 'direccion'],
    ordenar: 'nombre', tieneActivo: true,
  },
  lugares: {
    tabla: 'lugares', pk: 'idlugares',
    campos: ['lugar', 'direccion', 'telefono'],
    ordenar: 'lugar', tieneActivo: true,
  },
  nacionalidades: {
    tabla: 'nacionalidades', pk: 'idnacionalidades',
    campos: ['nacionalidad'],
    ordenar: 'nacionalidad', tieneActivo: true,
  },
  municipios: {
    tabla: 'municipios', pk: 'idmunicipios',
    campos: ['municipio', 'iddepartamentos'],
    ordenar: 'municipio', tieneActivo: true,
    joinSql: 'LEFT JOIN departamentos d ON d.iddepartamentos = municipios.iddepartamentos',
    extraSelect: ', d.departamento',
  },
  profesiones: {
    tabla: 'profesiones', pk: 'idprofesiones',
    campos: ['profesion'],
    ordenar: 'profesion', tieneActivo: true,
  },
  roles: {
    tabla: 'roles', pk: 'idroles',
    campos: ['rol'],
    ordenar: 'rol', tieneActivo: true,
  },
  tesoreria: {
    tabla: 'tesoreria', pk: 'idtesoreria',
    campos: ['nombre', 'saldo', 'fecha_cracion', 'creador', 'responsable'],
    ordenar: 'nombre', tieneActivo: true,
  },
  tipos_documento: {
    tabla: 'tipos_documento', pk: 'idtipos_documento',
    campos: ['documento'],
    ordenar: 'documento', tieneActivo: true,
  },
  experiencia_ministerial: {
    tabla: 'experiencia_ministerial', pk: 'idexperiencia_ministerial',
    campos: ['experiencia_ministerial'],
    ordenar: 'experiencia_ministerial', tieneActivo: true,
  },
  experiencia_laboral: {
    tabla: 'experiencia_laboral', pk: 'idexperiencia_laboral',
    campos: ['experiencia_laboral'],
    ordenar: 'experiencia_laboral', tieneActivo: true,
  },
  departamentos: {
    tabla: 'departamentos', pk: 'iddepartamentos',
    campos: ['departamento'],
    ordenar: 'departamento', tieneActivo: true,
  },
  actividades_categorias: {
    tabla: 'actividades_categorias', pk: 'idactividades_categorias',
    campos: ['categoria', 'color'],
    ordenar: 'categoria', tieneActivo: true,
  },
  actividades_grupos: {
    tabla: 'actividades_grupos', pk: 'idactividades_grupos',
    campos: ['idactividades', 'idgrupos'],
    ordenar: 'idactividades_grupos', tieneActivo: false,
    joinSql: `LEFT JOIN actividades a ON a.idactividades = actividades_grupos.idactividades
              LEFT JOIN grupos g ON g.idgrupos = actividades_grupos.idgrupos`,
    extraSelect: ', a.nombre AS actividad, g.grupo',
  },
  grupos: {
    tabla: 'grupos', pk: 'idgrupos',
    campos: ['grupo'],
    ordenar: 'grupo', tieneActivo: true,
  },
  estados_crecimiento: {
    tabla: 'estados_crecimiento', pk: 'idestados_crecimiento',
    campos: ['estado'],
    ordenar: 'estado', tieneActivo: true,
  },
};

// Lookups para selects
router.get('/lookup/departamentos', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT iddepartamentos AS id, departamento AS nombre FROM departamentos WHERE activo = 1 ORDER BY departamento'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/lookup/grupos', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT idgrupos AS id, grupo AS nombre FROM grupos WHERE activo = 1 ORDER BY grupo'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/lookup/actividades', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT idactividades AS id, nombre FROM actividades ORDER BY nombre'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/lookup/municipios', async (req, res, next) => {
  try {
    const { dept } = req.query;
    let sql = 'SELECT idmunicipios AS id, municipio AS nombre FROM municipios WHERE activo = 1';
    const params = [];
    if (dept) { sql += ' AND iddepartamentos = ?'; params.push(dept); }
    sql += ' ORDER BY municipio';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/lookup/nacionalidades', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT idnacionalidades AS id, nacionalidad AS nombre FROM nacionalidades WHERE activo = 1 ORDER BY nacionalidad'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/lookup/iglesias', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT idiglesias AS id, nombre FROM iglesias WHERE activo = 1 ORDER BY nombre'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/lookup/profesiones', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT idprofesiones AS id, profesion AS nombre FROM profesiones WHERE activo = 1 ORDER BY profesion'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/lookup/experiencia-ministerial', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT idexperiencia_ministerial AS id, experiencia_ministerial AS nombre FROM experiencia_ministerial WHERE activo = 1 ORDER BY experiencia_ministerial'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/lookup/experiencia-laboral', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT idexperiencia_laboral AS id, experiencia_laboral AS nombre FROM experiencia_laboral WHERE activo = 1 ORDER BY experiencia_laboral'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/lookup/estados-crecimiento', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT idestados_crecimiento AS id, estado AS nombre FROM estados_crecimiento WHERE activo = 1 ORDER BY estado'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/lookup/lugares', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT idlugares AS id, lugar AS nombre FROM lugares WHERE activo = 1 ORDER BY lugar'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/lookup/actividades-categorias', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT idactividades_categorias AS id, categoria AS nombre,
              IFNULL(color, '#3788d8') AS color
       FROM actividades_categorias WHERE activo = 1 ORDER BY categoria`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/lookup/personas', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT idpersonas AS id,
        TRIM(CONCAT_WS(' ', primer_nombre, NULLIF(segundo_nombre,''), primer_apellido, NULLIF(segundo_apellido,''))) AS nombre
       FROM personas ORDER BY primer_apellido, primer_nombre`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// ── Endpoints especiales para Grupos (encargados) ────────────────
// Deben ir ANTES del bloque genérico para no ser capturados por /:id

router.get('/grupos/:id/encargados', checkPermission('grupos', 'S'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT ge.idpersonas,
        TRIM(CONCAT_WS(' ', p.primer_nombre, NULLIF(p.segundo_nombre,''),
             p.primer_apellido, NULLIF(p.segundo_apellido,''))) AS nombre_completo,
        p.celular, p.email
       FROM grupos_encargados ge
       JOIN personas p ON p.idpersonas = ge.idpersonas
       WHERE ge.idgrupos = ?
       ORDER BY p.primer_apellido, p.primer_nombre`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/grupos/:id/encargados', checkPermission('grupos', 'E'), async (req, res, next) => {
  try {
    const { idpersonas } = req.body;
    if (!idpersonas) return res.status(400).json({ error: 'idpersonas es requerido' });
    const [[persona]] = await pool.query('SELECT idpersonas FROM personas WHERE idpersonas = ?', [idpersonas]);
    if (!persona) return res.status(404).json({ error: 'Persona no encontrada' });
    try {
      await pool.query('INSERT INTO grupos_encargados (idgrupos, idpersonas) VALUES (?, ?)', [req.params.id, idpersonas]);
    } catch (dbErr) {
      if (dbErr.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Esta persona ya es encargada de este grupo' });
      }
      throw dbErr;
    }
    res.status(201).json({ message: 'Encargado asignado correctamente' });
  } catch (err) { next(err); }
});

router.delete('/grupos/:id/encargados/:idpersonas', checkPermission('grupos', 'E'), async (req, res, next) => {
  try {
    await pool.query(
      'DELETE FROM grupos_encargados WHERE idgrupos = ? AND idpersonas = ?',
      [req.params.id, req.params.idpersonas]
    );
    res.json({ message: 'Encargado eliminado correctamente' });
  } catch (err) { next(err); }
});

// CRUD genérico para cada catálogo
Object.entries(CATALOGS).forEach(([nombre, cfg]) => {
  // GET - Listar
  router.get(`/${nombre}`, checkPermission(nombre, 'S'), async (req, res, next) => {
    try {
      const join = cfg.joinSql || '';
      const extra = cfg.extraSelect || '';
      const [rows] = await pool.query(
        `SELECT \`${cfg.tabla}\`.*${extra} FROM \`${cfg.tabla}\` ${join} ORDER BY \`${cfg.tabla}\`.\`${cfg.ordenar}\``
      );
      res.json(rows);
    } catch (err) { next(err); }
  });

  // POST - Crear
  router.post(`/${nombre}`, checkPermission(nombre, 'A'), async (req, res, next) => {
    try {
      const vals = {};
      for (const campo of cfg.campos) {
        if (req.body[campo] !== undefined && req.body[campo] !== '') {
          vals[campo] = req.body[campo];
        }
      }
      if (cfg.tieneActivo) vals.activo = 1;

      const cols = Object.keys(vals).map(k => `\`${k}\``).join(', ');
      const placeholders = Object.keys(vals).map(() => '?').join(', ');
      const [r] = await pool.query(
        `INSERT INTO \`${cfg.tabla}\` (${cols}) VALUES (${placeholders})`,
        Object.values(vals)
      );
      res.status(201).json({ id: r.insertId });
    } catch (err) { next(err); }
  });

  // PUT - Actualizar
  router.put(`/${nombre}/:id`, checkPermission(nombre, 'E'), async (req, res, next) => {
    try {
      const vals = {};
      for (const campo of cfg.campos) {
        if (req.body[campo] !== undefined) {
          vals[campo] = req.body[campo] === '' ? null : req.body[campo];
        }
      }
      if (!Object.keys(vals).length) {
        return res.status(400).json({ error: 'No se enviaron campos' });
      }
      const setClause = Object.keys(vals).map(k => `\`${k}\` = ?`).join(', ');
      const [r] = await pool.query(
        `UPDATE \`${cfg.tabla}\` SET ${setClause} WHERE \`${cfg.pk}\` = ?`,
        [...Object.values(vals), req.params.id]
      );
      if (!r.affectedRows) return res.status(404).json({ error: 'Registro no encontrado' });
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  // PATCH - Toggle activo
  if (cfg.tieneActivo) {
    router.patch(`/${nombre}/:id/toggle`, checkPermission(nombre, 'E'), async (req, res, next) => {
      try {
        const [r] = await pool.query(
          `UPDATE \`${cfg.tabla}\` SET activo = IF(activo = 1, 0, 1) WHERE \`${cfg.pk}\` = ?`,
          [req.params.id]
        );
        if (!r.affectedRows) return res.status(404).json({ error: 'Registro no encontrado' });
        res.json({ ok: true });
      } catch (err) { next(err); }
    });
  }

  // DELETE - Eliminar
  router.delete(`/${nombre}/:id`, checkPermission(nombre, 'D'), async (req, res, next) => {
    try {
      const [r] = await pool.query(
        `DELETE FROM \`${cfg.tabla}\` WHERE \`${cfg.pk}\` = ?`,
        [req.params.id]
      );
      if (!r.affectedRows) return res.status(404).json({ error: 'Registro no encontrado' });
      res.json({ ok: true });
    } catch (err) { next(err); }
  });
});

module.exports = router;
