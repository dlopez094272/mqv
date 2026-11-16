import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Nombre de archivo seguro para el sistema de archivos. */
const nombreSeguro = (n: string) => (n || 'archivo').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120);

/**
 * Descarga un archivo protegido (con el token en el encabezado) a la caché y
 * abre el menú "Abrir con / Compartir" del sistema para verlo o guardarlo.
 */
export async function descargarYCompartir(url: string, nombre: string, token: string | null, mimeType?: string): Promise<void> {
  const dir = new Directory(Paths.cache, 'descargas');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const destino = new File(dir, nombreSeguro(nombre));
  if (destino.exists) destino.delete();

  const archivo = await File.downloadFileAsync(url, destino, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    idempotent: true,
  });

  if (!(await Sharing.isAvailableAsync())) throw new Error('Este dispositivo no permite abrir archivos compartidos.');
  await Sharing.shareAsync(archivo.uri, { mimeType: mimeType || undefined, dialogTitle: nombre });
}

/** Lee una imagen remota como data URI (para incrustarla en un PDF). */
export async function imagenComoDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export const tamanoLegible = (bytes: number | null | undefined) => {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

export function iconoArchivo(mime: string | null | undefined): string {
  const m = mime || '';
  if (m.includes('pdf')) return 'document-text-outline';
  if (m.startsWith('image/')) return 'image-outline';
  if (m.startsWith('video/')) return 'videocam-outline';
  if (m.startsWith('audio/')) return 'musical-note-outline';
  if (/sheet|excel|csv/.test(m)) return 'grid-outline';
  if (/word|document/.test(m)) return 'document-outline';
  if (/zip|compressed/.test(m)) return 'archive-outline';
  return 'attach-outline';
}
