import { Api } from '../context/AuthContext';
import { Actividad, AdjuntoActividad, AsistenciaActividad, OpcionLookup } from '../types';

export const getActividades = (api: Api) => api.get<Actividad[]>('/actividades');
export const getActividad = (api: Api, id: number) => api.get<Actividad>(`/actividades/${id}`);
export const getGruposActividad = (api: Api, id: number) => api.get<number[]>(`/actividades/${id}/grupos`);
export const getGruposDisponibles = (api: Api) => api.get<OpcionLookup[]>('/actividades/grupos-disponibles');
export const getCategorias = (api: Api) => api.get<OpcionLookup[]>('/catalogos/lookup/actividades-categorias');
export const getLugares = (api: Api) => api.get<OpcionLookup[]>('/catalogos/lookup/lugares');

/** El backend espera multipart (logo/adjuntos opcionales). */
export const crearActividad = (api: Api, datos: FormData) => api.post<{ id: number; ids: number[] }>('/actividades', datos);
export const actualizarActividad = (api: Api, id: number, datos: FormData) => api.put<{ ok: boolean; ids: number[] }>(`/actividades/${id}`, datos);
export const eliminarActividad = (api: Api, id: number) => api.delete<{ ok: boolean }>(`/actividades/${id}`);

export const getAsistencia = (api: Api, id: number) => api.get<AsistenciaActividad>(`/actividades/${id}/asistentes`);
export const agregarAsistente = (api: Api, id: number, datos: { idpersonas?: number; nombre_completo?: string; telefono?: string; comentarios?: string }) =>
  api.post<{ id: number }>(`/actividades/${id}/asistentes`, datos);
export const quitarAsistente = (api: Api, id: number, idasistente: number) =>
  api.delete<{ ok: boolean }>(`/actividades/${id}/asistentes/${idasistente}`);

export const urlLogoActividad = (baseUrl: string, filename: string) => `${baseUrl}/files/actividades/logos/${encodeURIComponent(filename)}`;
export const rutaAdjuntoActividad = (filename: string) => `/actividades/adjuntos/${encodeURIComponent(filename)}`;

export function adjuntosDe(a: Actividad): AdjuntoActividad[] {
  if (Array.isArray(a.adjuntos)) return a.adjuntos;
  try { return JSON.parse(a.adjuntos || '[]') || []; } catch { return []; }
}
