import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';

export type TipoVista = 'pdf' | 'imagen' | 'audio' | 'video' | 'texto' | 'otro';

/** Un archivo que se puede mostrar en el visor. */
export interface ArchivoVisor {
  nombre: string;
  /** Tipo MIME si se conoce; si no, se deduce de la extensión del nombre. */
  mime?: string | null;
  /** URL directa (p. ej. con ?token=). Se usa para audio/video en streaming. */
  url?: string;
  /** Función que devuelve el contenido como Blob (para rutas con encabezado Authorization). */
  obtener?: () => Observable<Blob>;
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

/** MIME efectivo: el informado si es útil; si no, el de la extensión. */
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

/** ¿El visor puede mostrar este archivo (en vez de solo descargarlo)? */
export const esVisualizable = (nombre: string, mime?: string | null) => tipoVista(nombre, mime) !== 'otro';

export function iconoArchivo(nombre: string, mime?: string | null): string {
  switch (tipoVista(nombre, mime)) {
    case 'pdf':    return '📄';
    case 'imagen': return '🖼️';
    case 'audio':  return '🎵';
    case 'video':  return '🎬';
    case 'texto':  return '📝';
    default:       return '📎';
  }
}

/**
 * Visor global de archivos (PDF, imágenes, audio, video y texto).
 * El componente <app-visor-archivos> vive en la raíz de la app.
 */
@Injectable({ providedIn: 'root' })
export class VisorArchivosService {
  readonly lista  = signal<ArchivoVisor[]>([]);
  readonly indice = signal(0);
  readonly abierto = signal(false);

  /** Abre un archivo, o una lista de archivos empezando en `indice` (permite navegar con ← →). */
  abrir(archivo: ArchivoVisor | ArchivoVisor[], indice = 0) {
    const lista = Array.isArray(archivo) ? archivo : [archivo];
    if (!lista.length) return;
    this.lista.set(lista);
    this.indice.set(Math.min(Math.max(indice, 0), lista.length - 1));
    this.abierto.set(true);
  }

  cerrar() { this.abierto.set(false); this.lista.set([]); }
}
