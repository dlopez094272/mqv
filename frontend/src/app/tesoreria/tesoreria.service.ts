import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Tesoreria {
  idtesoreria:  number;
  nombre:       string;
  saldo:        number;
  fecha_cracion: string | null;
  creador:      string | null;
  responsable:  string | null;
  activo:       number;
}

export interface TesoreriaUsuario {
  usuario:         string;
  nombre_completo: string;
  solo_lectura:    number;
}

export interface UsuarioLookup {
  usuario:         string;
  nombre_completo: string;
}

export interface TipoMovimientoLookup {
  id:     number;
  nombre: string;
}

export interface AdjuntoInfo {
  filename:     string;
  originalname: string;
  mimetype:     string;
  size:         number;
}

export interface Movimiento {
  idtesoreria_movimientos: number;
  fecha:               string;
  concepto:            string;
  credito:             number;
  debito:              number;
  dtesoreria:          number;
  idtipo_movimiento:   number | null;
  tipo_movimiento:     string | null;
  creador:             string | null;
  anulado:             number;
  fecha_anulacion:     string | null;
  usuario_anulacion:   string | null;
  fecha_creacion:      string;
  adjuntos:            AdjuntoInfo[] | string | null;
}

export interface MovimientosResponse {
  tesoreria:     Tesoreria;
  saldo_inicial: number;
  movimientos:   Movimiento[];
  solo_lectura:  boolean;
}

@Injectable({ providedIn: 'root' })
export class TesoreriaService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tesoreria`;

  // ── Tesorerías ────────────────────────────────────────────────
  listar() {
    return this.http.get<Tesoreria[]>(this.base);
  }

  crear(data: { nombre: string; responsable: string }) {
    return this.http.post<{ id: number }>(this.base, data);
  }

  actualizar(id: number, data: { nombre: string; responsable: string }) {
    return this.http.put<{ ok: boolean }>(`${this.base}/${id}`, data);
  }

  toggle(id: number) {
    return this.http.patch<{ ok: boolean }>(`${this.base}/${id}/toggle`, {});
  }

  eliminar(id: number) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}`);
  }

  // ── Lookups ───────────────────────────────────────────────────
  lookupUsuarios() {
    return this.http.get<UsuarioLookup[]>(`${this.base}/lookup/usuarios`);
  }

  lookupTiposMovimiento() {
    return this.http.get<TipoMovimientoLookup[]>(`${this.base}/lookup/tipos-movimiento`);
  }

  // ── Usuarios de tesorería ─────────────────────────────────────
  listarUsuarios(id: number) {
    return this.http.get<TesoreriaUsuario[]>(`${this.base}/${id}/usuarios`);
  }

  asignarUsuario(id: number, usuarioNuevo: string, soloLectura: boolean) {
    return this.http.post<{ message: string }>(
      `${this.base}/${id}/usuarios`,
      { usuarioNuevo, solo_lectura: soloLectura }
    );
  }

  quitarUsuario(id: number, usuario: string) {
    return this.http.delete<{ message: string }>(`${this.base}/${id}/usuarios/${usuario}`);
  }

  // ── Movimientos ───────────────────────────────────────────────
  listarMovimientos(id: number, desde?: string, hasta?: string) {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<MovimientosResponse>(`${this.base}/${id}/movimientos`, { params });
  }

  crearMovimiento(id: number, data: FormData) {
    return this.http.post<{ id: number }>(`${this.base}/${id}/movimientos`, data);
  }

  actualizarMovimiento(id: number, movId: number, data: FormData) {
    return this.http.put<{ ok: boolean }>(`${this.base}/${id}/movimientos/${movId}`, data);
  }

  anularMovimiento(id: number, movId: number) {
    return this.http.patch<{ ok: boolean }>(
      `${this.base}/${id}/movimientos/${movId}/anular`, {}
    );
  }

  urlAdjunto(filename: string): string {
    return `${this.base}/adjuntos/${filename}`;
  }
}
