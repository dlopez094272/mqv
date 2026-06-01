import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface LookupItem {
  id: number | string;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogosService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/catalogos`;

  listar(ruta: string) {
    return this.http.get<any[]>(`${this.base}/${ruta}`);
  }

  crear(ruta: string, datos: Record<string, any>) {
    return this.http.post<{ id: number }>(`${this.base}/${ruta}`, datos);
  }

  actualizar(ruta: string, id: number, datos: Record<string, any>) {
    return this.http.put<{ ok: boolean }>(`${this.base}/${ruta}/${id}`, datos);
  }

  toggle(ruta: string, id: number) {
    return this.http.patch<{ ok: boolean }>(`${this.base}/${ruta}/${id}/toggle`, {});
  }

  eliminar(ruta: string, id: number) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${ruta}/${id}`);
  }

  lookup(nombre: string) {
    return this.http.get<LookupItem[]>(`${this.base}/lookup/${nombre}`);
  }
}
