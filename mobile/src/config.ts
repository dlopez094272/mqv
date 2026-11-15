// Servidor por defecto: el mismo backend que sirve la web de MQV (API + frontend).
// Se puede cambiar desde el login ("Servidor") sin recompilar la app, por
// ejemplo para probar contra el backend local (192.168.x.x:3000).
export const DEFAULT_SERVER = 'admin.iglesiamqv.org';

export const APP_SCHEME = 'mqvapp';

/**
 * URL base de la API a partir de lo que el usuario escribe como servidor.
 * Acepta "admin.iglesiamqv.org", "192.168.1.10:3000", "http://host:puerto" o "https://dominio".
 * Sin protocolo: una IP o "localhost" usa http (red local); un dominio usa https.
 */
export function resolveApiBaseUrl(server: string): string {
  const value = server.trim().replace(/\/+$/, '').replace(/\/api$/, '');
  if (!value) throw new Error('Ingresa el servidor');
  if (/^https?:\/\//i.test(value)) return `${value}/api`;
  const esLocal = /^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?$/i.test(value);
  return `${esLocal ? 'http' : 'https'}://${value}/api`;
}

/** Raíz del servidor (sin /api). */
export const filesRoot = (baseUrl: string) => baseUrl.replace(/\/api\/?$/, '');
