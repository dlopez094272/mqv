/**
 * Versión de la app móvil.
 *
 * El archivo backend/files/app/version.json (editable desde el administrador
 * de archivos de cPanel, sin reiniciar) define:
 *   version_actual  la última versión publicada
 *   version_minima  por debajo de esta la app se bloquea y pide actualizar
 *   url_descarga    dónde bajar el APK (p. ej. /api/files/app/mqv.apk)
 *   mensaje         texto que se muestra al pedir la actualización
 *
 * La app manda su versión en el encabezado X-App-Version: si es menor que la
 * mínima, cualquier llamada a la API responde 426 y la app muestra la pantalla
 * de actualización obligatoria.
 */
const router = require('express').Router();
const fs   = require('fs');
const path = require('path');

const archivo = path.join(__dirname, '..', '..', 'files', 'app', 'version.json');
let cache = { mtime: 0, datos: null };

function leerVersion() {
  try {
    const st = fs.statSync(archivo);
    if (st.mtimeMs !== cache.mtime) {
      cache = { mtime: st.mtimeMs, datos: JSON.parse(fs.readFileSync(archivo, 'utf8')) };
    }
    return cache.datos;
  } catch {
    return null;
  }
}

/** Compara "1.2.10" con "1.3.0": negativo si a < b. */
function compararVersion(a, b) {
  const pa = String(a || '0').split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b || '0').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

function infoPublica(v) {
  return {
    version_actual: v?.version_actual || null,
    version_minima: v?.version_minima || null,
    url_descarga:   v?.url_descarga || null,
    mensaje:        v?.mensaje || null,
  };
}

/** Middleware: bloquea versiones de la app por debajo de la mínima. */
function exigirVersionMinima(req, res, next) {
  let versionApp = req.headers['x-app-version'];
  // La app 1.0.0 no enviaba su versión: se reconoce por el cliente HTTP nativo de
  // Android (okhttp) y se trata como versión 0 para obligarla a actualizar.
  // Solo llamadas JSON de la API: imágenes, audio y descargas nativas también usan okhttp.
  if (!versionApp && /^okhttp\//i.test(req.headers['user-agent'] || '')
      && (req.headers.accept || '').includes('application/json')) versionApp = '0.0.0';
  if (!versionApp || req.path.startsWith('/app/')) return next();
  const v = leerVersion();
  if (v?.version_minima && compararVersion(versionApp, v.version_minima) < 0) {
    return res.status(426).json({
      error: v.mensaje || 'Debes actualizar la app para continuar.',
      code: 'ACTUALIZAR_APP',
      ...infoPublica(v),
    });
  }
  next();
}

router.get('/version', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(infoPublica(leerVersion()));
});

module.exports = { router, exigirVersionMinima, compararVersion };
