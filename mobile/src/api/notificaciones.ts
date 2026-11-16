import type { Api } from '../context/AuthContext';

export interface Notificacion {
  idnotificaciones: number;
  tipo: 'curso' | 'servicio' | 'tesoreria' | 'general' | string;
  titulo: string;
  cuerpo: string | null;
  datos: { pantalla?: string; id?: number } | null;
  leida: 0 | 1;
  fecha: string;
}

export const listarNotificaciones = (api: Api, antesDe?: number) =>
  api.get<{ notificaciones: Notificacion[]; no_leidas: number }>(`/notificaciones?limite=40${antesDe ? `&antes_de=${antesDe}` : ''}`);
export const contarNoLeidas = (api: Api) => api.get<{ no_leidas: number }>('/notificaciones/no-leidas');
export const marcarLeida = (api: Api, id: number) => api.patch(`/notificaciones/${id}/leida`);
export const marcarTodasLeidas = (api: Api) => api.patch('/notificaciones/leer-todas');
export const eliminarNotificacion = (api: Api, id: number) => api.delete(`/notificaciones/${id}`);
