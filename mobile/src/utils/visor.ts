// Mantener igual a frontend/src/app/shared/visor-archivos/visor-archivos.service.ts

export type TipoVista = 'pdf' | 'imagen' | 'audio' | 'video' | 'texto' | 'otro';

/** Archivo que se puede abrir en la pantalla `visor`. */
export interface ArchivoVisor {
  nombre: string;
  mime?: string | null;
  /** URL completa; se pide con el encabezado Authorization: Bearer <token>. */
  url: string;
}

const EXT_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  bmp: 'image/bmp', svg: 'image/svg+xml', heic: 'image/heic',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', m4a: 'audio/mp4',
  aac: 'audio/aac', flac: 'audio/flac', opus: 'audio/ogg',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', m4v: 'video/mp4',
  txt: 'text/plain', csv: 'text/csv', md: 'text/plain', json: 'application/json',
};

export function mimeDe(nombre: string, mime?: string | null): string {
  const m = (mime || '').toLowerCase().split(';')[0].trim();
  if (m && m !== 'application/octet-stream' && m !== 'binary/octet-stream') return m;
  const ext = (nombre.split('.').pop() || '').toLowerCase();
  return EXT_MIME[ext] || m || 'application/octet-stream';
}

export function tipoVista(nombre: string, mime?: string | null): TipoVista {
  const m = mimeDe(nombre, mime);
  if (m === 'application/pdf') return 'pdf';
  if (m.startsWith('image/') && m !== 'image/heic') return 'imagen';
  if (m.startsWith('audio/')) return 'audio';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('text/') || m === 'application/json') return 'texto';
  return 'otro';
}

export const esVisualizable = (nombre: string, mime?: string | null) => tipoVista(nombre, mime) !== 'otro';
