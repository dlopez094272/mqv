import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface AdjuntoInfo {
  filename:     string;
  originalname: string;
  mimetype:     string;
  size:         number;
}

export interface Actividad {
  idactividades:   number;
  idcategorias:    number | null;
  nombre:          string;
  descripcion:     string | null;
  fecha_inicio:    string;
  fecha_fin:       string;
  hora_inicio:     string | null;
  hora_fin:        string | null;
  adjuntos:        AdjuntoInfo[] | string | null;
  logo:            string | null;
  idlugares:       number | null;
  usuario:         string | null;
  created_at:      string;
  categoria:       string | null;
  categoria_color: string | null;
  lugar:           string | null;
}

export interface CategoriaLookup {
  id:     number;
  nombre: string;
  color:  string;
}

export interface LugarLookup {
  id:     number;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class ActividadesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/actividades`;

  listar() {
    return this.http.get<Actividad[]>(this.base);
  }

  crear(data: FormData) {
    return this.http.post<{ id: number }>(this.base, data);
  }

  actualizar(id: number, data: FormData) {
    return this.http.put<{ ok: boolean }>(`${this.base}/${id}`, data);
  }

  eliminar(id: number) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}`);
  }

  urlLogo(filename: string): string {
    return `${environment.apiUrl}/files/actividades/logos/${filename}`;
  }

  descargarAdjunto(filename: string, originalname: string) {
    this.http.get(`${this.base}/adjuntos/${filename}`, { responseType: 'blob' }).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = originalname;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
    });
  }
}
