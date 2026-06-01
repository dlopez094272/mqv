import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GrupoPermiso, GrupoDetalle } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class GruposService {
  private readonly base = environment.apiUrl + '/seguridad/grupos';

  constructor(private http: HttpClient) {}

  listar(): Observable<GrupoPermiso[]> {
    return this.http.get<GrupoPermiso[]>(this.base);
  }

  obtener(id: number): Observable<GrupoDetalle> {
    return this.http.get<GrupoDetalle>(`${this.base}/${id}`);
  }

  crear(data: { label: string; comment?: string }): Observable<{ message: string; GroupID: number }> {
    return this.http.post<{ message: string; GroupID: number }>(this.base, data);
  }

  actualizar(id: number, data: { label: string; comment?: string }): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${id}`, data);
  }

  eliminar(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }

  usuariosDisponibles(id: number): Observable<{ usuario: string; nombre_completo: string; email: string }[]> {
    return this.http.get<any[]>(`${this.base}/${id}/usuarios-disponibles`);
  }

  agregarMiembro(id: number, usuario: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/miembros`, { usuario });
  }

  quitarMiembro(id: number, usuario: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}/miembros/${usuario}`);
  }

  actualizarDerechos(id: number, derechos: { tableName: string; accessMask: string }[]): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${id}/derechos`, { derechos });
  }
}
