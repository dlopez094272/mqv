import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Usuario, UsuarioForm } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly base = environment.apiUrl + '/seguridad/usuarios';

  constructor(private http: HttpClient) {}

  listar(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.base);
  }

  obtener(usuario: string): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.base}/${usuario}`);
  }

  crear(data: UsuarioForm): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.base, data);
  }

  actualizar(usuario: string, data: Partial<UsuarioForm>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${usuario}`, data);
  }

  desactivar(usuario: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${usuario}/desactivar`, {});
  }

  activar(usuario: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${usuario}/activar`, {});
  }

  reenviarInvitacion(usuario: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${usuario}/reenviar-invitacion`, {});
  }

  getFotoUrl(usuario: string): string {
    return `${this.base}/${usuario}/foto`;
  }

  getFotoBlob(usuario: string): Observable<Blob> {
    return this.http.get(`${this.base}/${usuario}/foto`, { responseType: 'blob' });
  }

  verificarCodigo(codigo: string): Observable<{ disponible: boolean }> {
    return this.http.get<{ disponible: boolean }>(`${this.base}/verificar/${codigo}`);
  }
}
