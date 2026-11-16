import { Api } from '../context/AuthContext';
import { CarpetaCorreo, CorreoCompleto, CorreoResumen } from '../types';

const q = (carpeta: string) => `carpeta=${encodeURIComponent(carpeta)}`;

export const getCredenciales = (api: Api) => api.get<{ configurado: boolean; cuenta?: string }>('/correo/credenciales');
export const guardarCredenciales = (api: Api, cuenta: string, contrasena: string) =>
  api.post<{ ok: boolean }>('/correo/credenciales', { cuenta, contrasena });
export const eliminarCredenciales = (api: Api) => api.delete<{ ok: boolean }>('/correo/credenciales');
export const getNoLeidos = (api: Api) => api.get<{ total: number; configurado: boolean }>('/correo/no-leidos');
export const getCarpetas = (api: Api) => api.get<{ carpetas: CarpetaCorreo[] }>('/correo/carpetas');
export const getBandeja = (api: Api, carpeta: string, pagina: number, limite = 25) =>
  api.get<{ correos: CorreoResumen[]; total: number; pagina: number; limite: number }>(`/correo/bandeja?${q(carpeta)}&pagina=${pagina}&limite=${limite}`);
export const getCorreo = (api: Api, uid: number, carpeta: string) => api.get<CorreoCompleto>(`/correo/${uid}?${q(carpeta)}`);
export const eliminarCorreo = (api: Api, uid: number, carpeta: string) => api.delete<{ ok: boolean }>(`/correo/${uid}?${q(carpeta)}`);
export const buscarContactos = (api: Api, texto: string) =>
  api.get<{ contactos: { nombre: string; email: string }[] }>(`/correo/contactos?q=${encodeURIComponent(texto)}`);
export const enviarCorreo = (api: Api, datos: FormData) => api.post<{ ok: boolean }>('/correo/enviar', datos);
export const rutaAdjuntoCorreo = (uid: number, carpeta: string, filename: string) =>
  `/correo/${uid}/adjunto?${q(carpeta)}&filename=${encodeURIComponent(filename)}`;

/** Nombre legible de las carpetas IMAP más comunes. */
export function nombreCarpeta(c: CarpetaCorreo): string {
  const n = c.path.toUpperCase();
  if (n === 'INBOX') return 'Recibidos';
  if (/SENT/.test(n)) return 'Enviados';
  if (/DRAFT/.test(n)) return 'Borradores';
  if (/TRASH|DELETED/.test(n)) return 'Papelera';
  if (/SPAM|JUNK/.test(n)) return 'Spam';
  if (/ARCHIVE/.test(n)) return 'Archivo';
  return c.name;
}

export function iconoCarpeta(c: CarpetaCorreo): string {
  const n = c.path.toUpperCase();
  if (n === 'INBOX') return 'mail-outline';
  if (/SENT/.test(n)) return 'paper-plane-outline';
  if (/DRAFT/.test(n)) return 'document-text-outline';
  if (/TRASH|DELETED/.test(n)) return 'trash-outline';
  if (/SPAM|JUNK/.test(n)) return 'warning-outline';
  return 'folder-outline';
}

/** Orden: Recibidos primero, luego las comunes, luego el resto. */
export function ordenCarpeta(c: CarpetaCorreo): number {
  const n = c.path.toUpperCase();
  if (n === 'INBOX') return 0;
  if (/SENT/.test(n)) return 1;
  if (/DRAFT/.test(n)) return 2;
  if (/SPAM|JUNK/.test(n)) return 3;
  if (/TRASH|DELETED/.test(n)) return 4;
  return 5;
}
