import type { Api } from '../context/AuthContext';

export interface Tesoreria {
  idtesoreria: number;
  nombre: string;
  responsable: string | null;
  activo: number;
  saldo: number | string;
}

export interface AdjuntoMovimiento {
  filename: string;
  originalname: string;
  mimetype?: string;
  size?: number;
}

export interface Movimiento {
  idtesoreria_movimientos: number;
  fecha: string;
  concepto: string;
  credito: number | string;  // egreso
  debito: number | string;   // ingreso
  idtipo_movimiento: number | null;
  tipo_movimiento: string | null;
  creador: string | null;
  adjuntos: AdjuntoMovimiento[] | string | null;
  anulado: number | null;
  fecha_anulacion: string | null;
  usuario_anulacion: string | null;
}

export interface MovimientosResp {
  tesoreria: Tesoreria;
  saldo_inicial: number;
  movimientos: Movimiento[];
  solo_lectura: boolean;
}

export const getTesorerias = (api: Api) => api.get<Tesoreria[]>('/tesoreria');
export const getMovimientos = (api: Api, id: number, desde?: string, hasta?: string) => {
  const q = [desde && `desde=${desde}`, hasta && `hasta=${hasta}`].filter(Boolean).join('&');
  return api.get<MovimientosResp>(`/tesoreria/${id}/movimientos${q ? `?${q}` : ''}`);
};
export const getTiposMovimiento = (api: Api) => api.get<{ id: number; nombre: string }[]>('/tesoreria/lookup/tipos-movimiento');
export const crearMovimiento = (api: Api, id: number, fd: FormData) => api.post<{ id: number }>(`/tesoreria/${id}/movimientos`, fd);
export const editarMovimiento = (api: Api, id: number, movId: number, fd: FormData) => api.put(`/tesoreria/${id}/movimientos/${movId}`, fd);
export const anularMovimiento = (api: Api, id: number, movId: number) => api.patch(`/tesoreria/${id}/movimientos/${movId}/anular`);
export const rutaAdjuntoTesoreria = (filename: string) => `/tesoreria/adjuntos/${encodeURIComponent(filename)}`;

export function adjuntosDeMovimiento(m: Movimiento): AdjuntoMovimiento[] {
  if (!m.adjuntos) return [];
  if (Array.isArray(m.adjuntos)) return m.adjuntos;
  try { return JSON.parse(m.adjuntos) || []; } catch { return []; }
}

export const num = (v: number | string | null | undefined) => Number(v) || 0;

export const quetzales = (v: number | string | null | undefined) =>
  'Q' + num(v).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
