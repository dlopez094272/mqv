const router = require('express').Router();
const path   = require('path');
const fs     = require('fs');
const multer = require('multer');

const { pool }        = require('../config/database');
const authMiddleware   = require('../middleware/authMiddleware');
const checkPermission  = require('../middleware/permissionsMiddleware');

// ── Directorios ───────────────────────────────────────────────────
const mediaDir = path.join(__dirname, '..', '..', 'files', 'publicaciones', 'media');
fs.mkdirSync(mediaDir, { recursive: true });

function safeDeleteFile(filename) {
  if (!filename) return;
  try { fs.unlinkSync(path.join(mediaDir, filename)); } catch (_) {}
}

// ── Storage: varias fotos o 1 video por publicación (mutuamente excluyentes) ──
const storageMedia = multer.diskStorage({
  destination: (_, __, cb) => cb(null, mediaDir),
  filename: (_, file, cb) => {
    const ext  = path.extname(file.originalname);
    const safe = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 80);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safe}${ext}`);
  },
});
const uploadMedia = multer({
  storage: storageMedia,
  fileFilter: (_, file, cb) => {
    if (file.fieldname === 'video' && !file.mimetype.startsWith('video/')) {
      return cb(new Error('El campo de video solo acepta archivos de video'));
    }
    if (file.fieldname === 'fotos' && !file.mimetype.startsWith('image/')) {
      return cb(new Error('El campo de fotos solo acepta imágenes'));
    }
    cb(null, true);
  },
  limits: { fileSize: 500 * 1024 * 1024 },
}).fields([
  { name: 'video', maxCount: 1 },
  { name: 'fotos', maxCount: 15 },
]);

function tipoMediaDe(files) {
  if (files?.video?.[0]) return 'video';
  if (files?.fotos?.length) return 'imagen';
  return 'ninguno';
}

async function insertarFotos(idpublicaciones, archivos, ordenInicial = 0) {
  for (let i = 0; i < archivos.length; i++) {
    const f = archivos[i];
    await pool.query(
      'INSERT INTO publicaciones_fotos (idpublicaciones, filename, original_name, orden) VALUES (?, ?, ?, ?)',
      [idpublicaciones, f.filename, f.originalname, ordenInicial + i]
    );
  }
}

async function obtenerFotos(idpublicaciones) {
  const [rows] = await pool.query(
    'SELECT idfoto, filename, original_name, orden FROM publicaciones_fotos WHERE idpublicaciones = ? ORDER BY orden, idfoto',
    [idpublicaciones]
  );
  return rows;
}

async function eliminarFotosDe(idpublicaciones) {
  const fotos = await obtenerFotos(idpublicaciones);
  fotos.forEach(f => safeDeleteFile(f.filename));
  await pool.query('DELETE FROM publicaciones_fotos WHERE idpublicaciones = ?', [idpublicaciones]);
}

function generarSlugBase(titulo) {
  return titulo
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200) || 'publicacion';
}

function absUrl(req, rutaRelativa) {
  return `${req.protocol}://${req.get('host')}${rutaRelativa}`;
}

// La landing vive en un dominio/subdominio distinto al de este backend (admin.iglesiamqv.org),
// así que los links de vuelta a la landing y el CORS de los endpoints públicos deben ser explícitos.
const LANDING_URL = process.env.LANDING_URL || 'https://iglesiamqv.org';

function permitirCorsPublico(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  next();
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ════════════════════════════════════════════════════════════════
// ENDPOINTS PÚBLICOS (sin autenticación) — antes de authMiddleware
// ════════════════════════════════════════════════════════════════

// Lista de publicaciones publicadas, para que la landing arme las cards
router.get('/publicas', permitirCorsPublico, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT idpublicaciones, titulo, resumen, slug, tipo_media, media_filename, tipo_publicacion, fecha_evento, publicado_at
       FROM publicaciones
       WHERE estado = 'publicado'
       ORDER BY publicado_at DESC`
    );
    const resultado = await Promise.all(rows.map(async r => {
      const fotos = r.tipo_media === 'imagen' ? await obtenerFotos(r.idpublicaciones) : [];
      const fotoUrls = fotos.map(f => absUrl(req, `/api/publicaciones/media/${f.filename}`));
      return {
        ...r,
        fotos: fotoUrls,
        media_url: r.tipo_media === 'video' && r.media_filename
          ? absUrl(req, `/api/publicaciones/media/${r.media_filename}`)
          : fotoUrls[0] || null,
        compartir_url: absUrl(req, `/api/publicaciones/compartir/${r.slug}`),
      };
    }));
    res.json(resultado);
  } catch (err) { next(err); }
});

// Sirve el archivo de media públicamente (visible para visitantes y crawlers de redes sociales)
router.get('/media/:filename', permitirCorsPublico, (req, res) => {
  const filename = path.basename(req.params.filename);
  const fp = path.join(mediaDir, filename);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Archivo no encontrado' });
  if (req.query.download !== undefined) return res.download(fp);
  res.sendFile(fp);
});

// Página server-rendered con metatags Open Graph, para compartir en Facebook/WhatsApp/etc.
router.get('/compartir/:slug', permitirCorsPublico, async (req, res, next) => {
  try {
    const [[pub]] = await pool.query(
      `SELECT * FROM publicaciones WHERE slug = ? AND estado = 'publicado'`,
      [req.params.slug]
    );
    if (!pub) return res.status(404).send('Publicación no encontrada');

    const fotos = pub.tipo_media === 'imagen' ? await obtenerFotos(pub.idpublicaciones) : [];
    const fotoUrls = fotos.map(f => absUrl(req, `/api/publicaciones/media/${f.filename}`));

    const mediaUrl    = pub.tipo_media === 'video' && pub.media_filename
      ? absUrl(req, `/api/publicaciones/media/${pub.media_filename}`)
      : fotoUrls[0] || null;
    const downloadUrl = pub.tipo_media === 'video' && pub.media_filename
      ? absUrl(req, `/api/publicaciones/media/${pub.media_filename}?download=1`)
      : pub.tipo_media === 'imagen' && fotoUrls.length === 1
        ? `${fotoUrls[0]}?download=1`
        : null; // con varias fotos, cada miniatura se abre/descarga individualmente
    const pageUrl      = absUrl(req, req.originalUrl);
    const titulo       = escapeHtml(pub.titulo);
    const descripcion  = escapeHtml(pub.resumen || '');

    const mediaHtml = pub.tipo_media === 'video'
      ? `<div class="media-wrap"><video controls playsinline preload="metadata"><source src="${mediaUrl}"></video></div>`
      : pub.tipo_media === 'imagen' && fotoUrls.length === 1
        ? `<div class="media-wrap"><img src="${fotoUrls[0]}" alt="${titulo}" onclick="abrirLightbox(0)"></div>`
        : pub.tipo_media === 'imagen' && fotoUrls.length > 1
          ? `<div class="galeria-wrap">${fotoUrls.map((u, i) => `<a href="${u}" onclick="return abrirLightbox(${i})" rel="noopener"><img src="${u}" alt="${titulo}"></a>`).join('')}</div>`
          : '';

    const fotosJson = JSON.stringify(fotoUrls).replace(/</g, '\\u003c');
    const lightboxHtml = pub.tipo_media === 'imagen' && fotoUrls.length
      ? `<div class="lightbox" id="lightbox" onclick="if(event.target===this) cerrarLightbox()">
          <button class="lightbox-close" onclick="cerrarLightbox()" aria-label="Cerrar">✕</button>
          ${fotoUrls.length > 1 ? `<button class="lightbox-nav lightbox-prev" onclick="navegarLightbox(-1)" aria-label="Anterior">‹</button>` : ''}
          <img class="lightbox-img" id="lightboxImg" src="" alt="${titulo}">
          ${fotoUrls.length > 1 ? `<button class="lightbox-nav lightbox-next" onclick="navegarLightbox(1)" aria-label="Siguiente">›</button>` : ''}
        </div>
        <script>
          const FOTOS = ${fotosJson};
          let lightboxIdx = 0;
          function abrirLightbox(i) {
            lightboxIdx = i;
            document.getElementById('lightboxImg').src = FOTOS[i];
            document.getElementById('lightbox').classList.add('activo');
            return false;
          }
          function cerrarLightbox() {
            document.getElementById('lightbox').classList.remove('activo');
          }
          function navegarLightbox(delta) {
            lightboxIdx = (lightboxIdx + delta + FOTOS.length) % FOTOS.length;
            document.getElementById('lightboxImg').src = FOTOS[lightboxIdx];
          }
          document.addEventListener('keydown', e => {
            if (!document.getElementById('lightbox').classList.contains('activo')) return;
            if (e.key === 'Escape') cerrarLightbox();
            if (e.key === 'ArrowLeft') navegarLightbox(-1);
            if (e.key === 'ArrowRight') navegarLightbox(1);
          });
        </script>`
      : '';

    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo} | MQV</title>
  <meta name="description" content="${descripcion}">

  <meta property="og:type" content="${pub.tipo_media === 'video' ? 'video.other' : 'article'}">
  <meta property="og:title" content="${titulo}">
  <meta property="og:description" content="${descripcion}">
  ${pub.tipo_media === 'imagen' && mediaUrl ? `<meta property="og:image" content="${mediaUrl}">` : ''}
  <meta property="og:url" content="${pageUrl}">
  <meta name="twitter:card" content="${pub.tipo_media === 'imagen' ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title" content="${titulo}">
  <meta name="twitter:description" content="${descripcion}">
  ${pub.tipo_media === 'imagen' && mediaUrl ? `<meta name="twitter:image" content="${mediaUrl}">` : ''}

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400&display=swap" rel="stylesheet">

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --purple: #57446C; --blue: #53819A; --blue-light: #50B8D4; --blue-lighter: #83D3EB;
      --grad-brand: linear-gradient(135deg, #53819A 0%, #57446C 100%);
    }
    body {
      font-family: 'Nunito', sans-serif;
      background: radial-gradient(ellipse at 20% 0%, rgba(83,129,154,.18), transparent 55%),
                  radial-gradient(ellipse at 80% 100%, rgba(87,68,108,.18), transparent 55%),
                  #0a1520;
      color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 32px 18px;
    }
    .card {
      width: 100%; max-width: 560px;
      background: linear-gradient(160deg, #192b38, #221530);
      border: 1px solid rgba(255,255,255,.1); border-radius: 24px; overflow: hidden;
      box-shadow: 0 32px 80px rgba(0,0,0,.55);
    }
    .logo-row { display: flex; justify-content: center; padding: 22px 0 0; }
    .logo-row img { height: 34px; opacity: .9; }
    .media-wrap { margin: 18px 22px 0; border-radius: 16px; overflow: hidden; background: #000; }
    .media-wrap video, .media-wrap img { width: 100%; display: block; max-height: 320px; object-fit: cover; }
    .media-wrap img { cursor: zoom-in; }
    .galeria-wrap {
      margin: 18px 22px 0; display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px;
      border-radius: 16px; overflow: hidden;
    }
    .galeria-wrap a { display: block; background: #000; cursor: zoom-in; }
    .galeria-wrap img { width: 100%; height: 140px; object-fit: cover; display: block; }
    .lightbox {
      display: none; position: fixed; inset: 0; background: rgba(5,8,12,.94); z-index: 100;
      align-items: center; justify-content: center; padding: 40px 16px;
    }
    .lightbox.activo { display: flex; }
    .lightbox-img { max-width: 100%; max-height: 100%; border-radius: 8px; object-fit: contain; }
    .lightbox-close {
      position: absolute; top: 18px; right: 22px; background: rgba(255,255,255,.1); border: none; color: #fff;
      width: 40px; height: 40px; border-radius: 50%; font-size: 18px; cursor: pointer; line-height: 1;
    }
    .lightbox-close:hover { background: rgba(255,255,255,.2); }
    .lightbox-nav {
      position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,.1); border: none;
      color: #fff; width: 48px; height: 48px; border-radius: 50%; font-size: 28px; cursor: pointer; line-height: 1;
    }
    .lightbox-nav:hover { background: rgba(255,255,255,.2); }
    .lightbox-prev { left: 12px; }
    .lightbox-next { right: 12px; }
    .body { padding: 22px 26px 28px; text-align: center; }
    h1 { font-size: 24px; font-weight: 900; line-height: 1.3; margin-bottom: 16px; }
    .contenido { font-size: 14px; line-height: 1.75; color: rgba(255,255,255,.75); text-align: left; margin-bottom: 8px; }
    .contenido p + p { margin-top: 10px; }
    .actions { display: flex; flex-direction: column; gap: 12px; margin-top: 24px; }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 9px;
      padding: 14px 24px; border-radius: 50px; font-family: inherit; font-size: 14px; font-weight: 800;
      text-decoration: none; letter-spacing: .3px; transition: all .3s; border: none; cursor: pointer;
    }
    .btn-primary { background: var(--grad-brand); color: #fff; box-shadow: 0 8px 32px rgba(87,68,108,.5); }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 14px 44px rgba(87,68,108,.65); }
    .btn-ghost { background: rgba(255,255,255,.08); border: 1.5px solid rgba(255,255,255,.18); color: #fff; }
    .btn-ghost:hover { background: rgba(255,255,255,.16); }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-row"><img src="${absUrl(req, '/api/brand/logo-white.png')}" alt="Iglesia del Nazareno MQV"></div>
    ${mediaHtml}
    <div class="body">
      <h1>${titulo}</h1>
      <div class="contenido">${pub.contenido_html || descripcion}</div>
      <div class="actions">
        <a href="${LANDING_URL}/" class="btn btn-primary">← Regresar al sitio web</a>
        ${downloadUrl ? `<a href="${downloadUrl}" class="btn btn-ghost">⬇ Descargar ${pub.tipo_media === 'video' ? 'video' : 'imagen'}</a>` : ''}
      </div>
    </div>
  </div>
  ${lightboxHtml}
</body>
</html>`);
  } catch (err) { next(err); }
});

router.use(authMiddleware);

// ════════════════════════════════════════════════════════════════
// GESTIÓN DE PUBLICACIONES (permiso: publicaciones)
// ════════════════════════════════════════════════════════════════

router.get('/', checkPermission('publicaciones', 'S'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*,
             (SELECT COUNT(*) FROM publicaciones_fotos pf WHERE pf.idpublicaciones = p.idpublicaciones) AS total_fotos,
             (SELECT filename FROM publicaciones_fotos pf WHERE pf.idpublicaciones = p.idpublicaciones ORDER BY orden, idfoto LIMIT 1) AS primera_foto
      FROM publicaciones p
      ORDER BY p.created_at DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id', checkPermission('publicaciones', 'S'), async (req, res, next) => {
  try {
    const [[pub]] = await pool.query('SELECT * FROM publicaciones WHERE idpublicaciones = ?', [req.params.id]);
    if (!pub) return res.status(404).json({ error: 'Publicación no encontrada' });
    const fotos = await obtenerFotos(pub.idpublicaciones);
    res.json({ ...pub, fotos });
  } catch (err) { next(err); }
});

router.post('/', checkPermission('publicaciones', 'A'), (req, res, next) => {
  uploadMedia(req, res, async err => {
    if (err) return next(err);
    try {
      const { titulo, resumen, contenido_html, tipo_publicacion, fecha_evento } = req.body;
      if (!titulo?.trim()) return res.status(400).json({ error: 'El título es requerido' });
      if (tipo_publicacion && !['noticia', 'evento'].includes(tipo_publicacion)) {
        return res.status(400).json({ error: "tipo_publicacion inválido, debe ser 'noticia' o 'evento'" });
      }
      if (tipo_publicacion === 'evento' && !fecha_evento) {
        return res.status(400).json({ error: 'La fecha del evento es requerida' });
      }

      const tipo_media = tipoMediaDe(req.files);
      const videoFile   = req.files?.video?.[0];
      const media_filename      = videoFile ? videoFile.filename : null;
      const media_original_name = videoFile ? videoFile.originalname : null;
      const slugBase = generarSlugBase(titulo);

      const [r] = await pool.query(
        `INSERT INTO publicaciones
           (titulo, slug, resumen, contenido_html, tipo_media, media_filename, media_original_name, tipo_publicacion, fecha_evento, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [titulo.trim(), slugBase, resumen || null, contenido_html || null, tipo_media, media_filename, media_original_name,
         tipo_publicacion === 'evento' ? 'evento' : 'noticia', tipo_publicacion === 'evento' ? fecha_evento : null, req.user.usuario]
      );
      // El slug definitivo incluye el id para garantizar unicidad sin condición de carrera
      const slug = `${slugBase}-${r.insertId}`;
      await pool.query('UPDATE publicaciones SET slug = ? WHERE idpublicaciones = ?', [slug, r.insertId]);

      if (req.files?.fotos?.length) await insertarFotos(r.insertId, req.files.fotos);

      res.status(201).json({ message: 'Publicación creada correctamente', idpublicaciones: r.insertId, slug });
    } catch (err) { next(err); }
  });
});

router.put('/:id', checkPermission('publicaciones', 'E'), (req, res, next) => {
  uploadMedia(req, res, async err => {
    if (err) return next(err);
    try {
      const id = parseInt(req.params.id);
      const [[pub]] = await pool.query('SELECT * FROM publicaciones WHERE idpublicaciones = ?', [id]);
      if (!pub) return res.status(404).json({ error: 'Publicación no encontrada' });

      const { titulo, resumen, contenido_html, tipo_publicacion, fecha_evento } = req.body;
      if (!titulo?.trim()) return res.status(400).json({ error: 'El título es requerido' });
      if (tipo_publicacion && !['noticia', 'evento'].includes(tipo_publicacion)) {
        return res.status(400).json({ error: "tipo_publicacion inválido, debe ser 'noticia' o 'evento'" });
      }
      if (tipo_publicacion === 'evento' && !fecha_evento) {
        return res.status(400).json({ error: 'La fecha del evento es requerida' });
      }

      const videoFile  = req.files?.video?.[0];
      const fotosFiles = req.files?.fotos;

      let tipo_media          = pub.tipo_media;
      let media_filename      = pub.media_filename;
      let media_original_name = pub.media_original_name;

      if (videoFile) {
        // El video reemplaza cualquier galería de fotos que hubiera (mutuamente excluyentes)
        await eliminarFotosDe(id);
        safeDeleteFile(pub.media_filename);
        tipo_media          = 'video';
        media_filename      = videoFile.filename;
        media_original_name = videoFile.originalname;
      } else if (fotosFiles?.length) {
        // Las fotos reemplazan cualquier video previo; se agregan a la galería existente
        if (pub.tipo_media === 'video') safeDeleteFile(pub.media_filename);
        tipo_media          = 'imagen';
        media_filename      = null;
        media_original_name = null;
        const [[{ maxOrden }]] = await pool.query(
          'SELECT COALESCE(MAX(orden), -1) AS maxOrden FROM publicaciones_fotos WHERE idpublicaciones = ?', [id]
        );
        await insertarFotos(id, fotosFiles, maxOrden + 1);
      }

      const tipoPublicacionFinal = tipo_publicacion === 'evento' ? 'evento' : 'noticia';

      await pool.query(
        `UPDATE publicaciones
         SET titulo = ?, resumen = ?, contenido_html = ?, tipo_media = ?, media_filename = ?, media_original_name = ?,
             tipo_publicacion = ?, fecha_evento = ?
         WHERE idpublicaciones = ?`,
        [titulo.trim(), resumen || null, contenido_html || null, tipo_media, media_filename, media_original_name,
         tipoPublicacionFinal, tipoPublicacionFinal === 'evento' ? fecha_evento : null, id]
      );
      res.json({ message: 'Publicación actualizada correctamente' });
    } catch (err) { next(err); }
  });
});

router.delete('/fotos/:idfoto', checkPermission('publicaciones', 'E'), async (req, res, next) => {
  try {
    const idfoto = parseInt(req.params.idfoto);
    const [[foto]] = await pool.query('SELECT filename FROM publicaciones_fotos WHERE idfoto = ?', [idfoto]);
    if (!foto) return res.status(404).json({ error: 'Foto no encontrada' });

    safeDeleteFile(foto.filename);
    await pool.query('DELETE FROM publicaciones_fotos WHERE idfoto = ?', [idfoto]);
    res.json({ message: 'Foto eliminada' });
  } catch (err) { next(err); }
});

router.put('/:id/estado', checkPermission('publicaciones', 'E'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { estado } = req.body;
    if (!['borrador', 'publicado'].includes(estado)) {
      return res.status(400).json({ error: "Estado inválido, debe ser 'borrador' o 'publicado'" });
    }
    const [r] = await pool.query(
      `UPDATE publicaciones
       SET estado = ?, publicado_at = ${estado === 'publicado' ? 'CURRENT_TIMESTAMP' : 'NULL'}
       WHERE idpublicaciones = ?`,
      [estado, id]
    );
    if (!r.affectedRows) return res.status(404).json({ error: 'Publicación no encontrada' });
    res.json({ message: estado === 'publicado' ? 'Publicación publicada' : 'Publicación pasada a borrador' });
  } catch (err) { next(err); }
});

router.delete('/:id', checkPermission('publicaciones', 'D'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const [[pub]] = await pool.query('SELECT media_filename FROM publicaciones WHERE idpublicaciones = ?', [id]);
    if (!pub) return res.status(404).json({ error: 'Publicación no encontrada' });

    await eliminarFotosDe(id);
    safeDeleteFile(pub.media_filename);
    await pool.query('DELETE FROM publicaciones WHERE idpublicaciones = ?', [id]);
    res.json({ message: 'Publicación eliminada' });
  } catch (err) { next(err); }
});

module.exports = router;
