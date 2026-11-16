/**
 * Notificaciones de la app móvil.
 *
 * `notificar()` guarda la notificación en la bandeja de cada usuario (tabla
 * `notificaciones`) y la envía como push a sus teléfonos mediante Firebase
 * Cloud Messaging (API HTTP v1). El push llega aunque la app esté cerrada.
 *
 * Para el push se necesita la cuenta de servicio de Firebase:
 *   - archivo JSON en FCM_SERVICE_ACCOUNT (ruta) o en backend/firebase-service-account.json
 * Sin ese archivo las notificaciones igual quedan en la bandeja de la app.
 *
 * No usa dependencias nuevas: firma el JWT de Google con `jsonwebtoken`.
 */
const fs   = require('fs');
const path = require('path');
const jwt  = require('jsonwebtoken');
const { pool } = require('../config/database');

let cuenta;          // cuenta de servicio (undefined = sin leer, null = no hay)
let accesoCache = { token: null, vence: 0 };

function cuentaServicio() {
  if (cuenta !== undefined) return cuenta;
  const ruta = process.env.FCM_SERVICE_ACCOUNT
    || path.join(__dirname, '..', '..', 'firebase-service-account.json');
  try {
    cuenta = JSON.parse(fs.readFileSync(ruta, 'utf8'));
    if (!cuenta.client_email || !cuenta.private_key || !cuenta.project_id) throw new Error('incompleta');
  } catch {
    cuenta = null;
    console.warn('[notificaciones] Sin cuenta de servicio de Firebase: los push están desactivados (solo bandeja).');
  }
  return cuenta;
}

/** Token OAuth2 de Google para FCM (dura 1 hora; se guarda en memoria). */
async function tokenAcceso() {
  if (accesoCache.token && accesoCache.vence > Date.now() + 60_000) return accesoCache.token;
  const c = cuentaServicio();
  const ahora = Math.floor(Date.now() / 1000);
  const asercion = jwt.sign({
    iss: c.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: ahora,
    exp: ahora + 3600,
  }, c.private_key, { algorithm: 'RS256' });

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: asercion }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`OAuth Google: ${data.error_description || data.error || r.status}`);
  accesoCache = { token: data.access_token, vence: Date.now() + (data.expires_in || 3600) * 1000 };
  return accesoCache.token;
}

/** Envía un push a un token FCM. Devuelve false si el token ya no es válido. */
async function enviarPush(pushToken, { titulo, cuerpo, datos, idnotificaciones }) {
  const c = cuentaServicio();
  const acceso = await tokenAcceso();
  // FCM exige que los valores de `data` sean strings
  const data = { idnotificaciones: String(idnotificaciones || '') };
  for (const [k, v] of Object.entries(datos || {})) data[k] = typeof v === 'string' ? v : JSON.stringify(v);
  // expo-notifications (Android) expone a la app el JSON de la clave "body" como `content.data`
  data.body = JSON.stringify({ ...(datos || {}), idnotificaciones: idnotificaciones || null });

  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${c.project_id}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${acceso}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token: pushToken,
        notification: { title: titulo, body: cuerpo || '' },
        data,
        android: {
          priority: 'HIGH',
          notification: { channel_id: 'general', sound: 'default', color: '#57446C' },
        },
        apns: { payload: { aps: { sound: 'default' } } },
      },
    }),
  });
  if (r.ok) return true;
  const err = await r.json().catch(() => ({}));
  const codigo = err?.error?.details?.find(d => d.errorCode)?.errorCode || err?.error?.status;
  if (codigo === 'UNREGISTERED' || codigo === 'INVALID_ARGUMENT' || r.status === 404) return false;
  throw new Error(`FCM ${r.status}: ${err?.error?.message || ''}`);
}

/**
 * Notifica a uno o varios usuarios. No lanza errores (nunca debe romper la
 * operación que la origina): se ejecuta en segundo plano.
 *
 * @param {string[]} usuarios  códigos de usuario
 * @param {{ tipo: string, titulo: string, cuerpo?: string, datos?: object }} n
 * @param {{ excluir?: string }} [opc] usuario que realizó la acción (no se le notifica)
 */
function notificar(usuarios, n, opc = {}) {
  const lista = [...new Set((usuarios || []).filter(Boolean))].filter(u => u !== opc.excluir);
  if (!lista.length) return;
  setImmediate(() => procesar(lista, n).catch(e => console.error('[notificaciones]', e.message)));
}

async function procesar(usuarios, { tipo, titulo, cuerpo = null, datos = null }) {
  titulo = String(titulo).slice(0, 200);
  cuerpo = cuerpo ? String(cuerpo).slice(0, 500) : null;

  const ids = {};
  for (const u of usuarios) {
    const [r] = await pool.query(
      'INSERT INTO notificaciones (usuario, tipo, titulo, cuerpo, datos) VALUES (?, ?, ?, ?, ?)',
      [u, tipo, titulo, cuerpo, datos ? JSON.stringify(datos) : null]
    );
    ids[u] = r.insertId;
  }

  if (!cuentaServicio()) return;
  const [disp] = await pool.query(
    `SELECT d.iddispositivo, d.usuario, d.push_token
     FROM usuarios_dispositivos d JOIN usuarios u ON u.usuario = d.usuario AND u.activo = 1
     WHERE d.push_token IS NOT NULL AND d.usuario IN (?)`,
    [usuarios]
  );
  for (const d of disp) {
    try {
      const ok = await enviarPush(d.push_token, { titulo, cuerpo, datos: { tipo, ...(datos || {}) }, idnotificaciones: ids[d.usuario] });
      if (!ok) await pool.query('UPDATE usuarios_dispositivos SET push_token = NULL WHERE iddispositivo = ?', [d.iddispositivo]);
    } catch (e) {
      console.error('[notificaciones] push', d.usuario, e.message);
    }
  }
}

/** Usuarios del sistema vinculados a unas personas (fichas de Personas). */
async function usuariosDePersonas(idpersonas) {
  const ids = [...new Set((idpersonas || []).map(Number).filter(Boolean))];
  if (!ids.length) return [];
  const [rows] = await pool.query(
    'SELECT usuario FROM usuarios WHERE activo = 1 AND idpersonas IN (?)', [ids]
  );
  return rows.map(r => r.usuario);
}

module.exports = { notificar, usuariosDePersonas };
