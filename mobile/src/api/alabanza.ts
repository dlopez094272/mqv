import { Api } from '../context/AuthContext';
import { Cancion, CancionResumen, MiCuenta, ProgramaServicio, Servicio } from '../types';

export const getCanciones = (api: Api) => api.get<CancionResumen[]>('/alabanza/canciones');
export const getCancion = (api: Api, id: number) => api.get<Cancion>(`/alabanza/canciones/${id}`);
export const getMisServicios = (api: Api, pasadas = false) =>
  api.get<Servicio[]>(`/alabanza/mis-servicios${pasadas ? '?pasadas=1' : ''}`);
export const getPrograma = (api: Api, id: number) => api.get<ProgramaServicio>(`/alabanza/actividades/${id}/programa`);

/** Ruta (para urlConToken) del contenido de un archivo de canción. */
export const rutaArchivo = (idarchivos: number) => `/alabanza/archivos/${idarchivos}/contenido`;

export const getMiCuenta = (api: Api) => api.get<MiCuenta>('/auth/mi-cuenta');
export const putMisDatos = (api: Api, datos: Record<string, unknown>) => api.put<MiCuenta>('/auth/mis-datos', datos);
export const cambiarPassword = (api: Api, password_actual: string, password_nuevo: string) =>
  api.put<{ message: string }>('/auth/change-password', { password_actual, password_nuevo });

/** Video de YouTube a partir de cualquier formato de enlace. */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/.exec(url);
  return m ? m[1] : null;
}

export const ETIQUETA_TIPO = { cancion: 'Canción', himno: 'Himno', coro: 'Coro' } as const;
