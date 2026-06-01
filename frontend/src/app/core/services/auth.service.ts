import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthResponse } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = environment.apiUrl + '/auth';

  readonly usuarioCodigo   = signal<string | null>(null);
  readonly usuarioNombre   = signal<string | null>(null);
  readonly primerIngreso   = signal<boolean>(false);
  readonly superadmin      = signal<boolean>(false);

  constructor(private http: HttpClient, private router: Router) {
    this.cargarSesion();
  }

  login(usuario: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/login`, { usuario, password }).pipe(
      tap(r => this.guardarSesion(r))
    );
  }

  forgotPassword(identificador: string) {
    return this.http.post<{ message: string }>(`${this.base}/forgot-password`, { identificador });
  }

  verifyToken(token: string) {
    return this.http.get<{ valid: boolean; nombre: string }>(`${this.base}/verify-token/${token}`);
  }

  resetPassword(token: string, password: string) {
    return this.http.post<{ message: string }>(`${this.base}/reset-password`, { token, password });
  }

  completeRegistration(token: string, password: string, foto?: string) {
    return this.http.post<{ message: string }>(`${this.base}/complete-registration`, { token, password, foto });
  }

  changePassword(password_actual: string, password_nuevo: string) {
    return this.http.put<{ message: string }>(`${this.base}/change-password`, { password_actual, password_nuevo });
  }

  miPersona() {
    return this.http.get<{ idpersonas: number | null }>(`${this.base}/mi-persona`);
  }

  getMiPerfilPersona() {
    return this.http.get<any>(`${this.base}/mi-perfil-persona`);
  }

  updateMiPerfilPersona(data: Record<string, any>) {
    return this.http.put<{ message: string }>(`${this.base}/mi-perfil-persona`, data);
  }

  logout() {
    localStorage.clear();
    this.usuarioCodigo.set(null);
    this.usuarioNombre.set(null);
    this.primerIngreso.set(false);
    this.superadmin.set(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('mqv_token');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const p = JSON.parse(atob(token.split('.')[1]));
      return p.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  isSuperadmin(): boolean {
    return this.superadmin();
  }

  getPayload(): { usuario: string; nombre: string; primer_ingreso: number; is_superadmin: boolean } | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }

  private guardarSesion(r: AuthResponse) {
    localStorage.setItem('mqv_token',    r.token);
    localStorage.setItem('mqv_usuario',  r.usuario);
    localStorage.setItem('mqv_nombre',   r.nombre);
    localStorage.setItem('mqv_super',    r.is_superadmin ? '1' : '0');
    this.usuarioCodigo.set(r.usuario);
    this.usuarioNombre.set(r.nombre);
    this.primerIngreso.set(r.primer_ingreso === 1);
    this.superadmin.set(!!r.is_superadmin);
  }

  private cargarSesion() {
    this.usuarioCodigo.set(localStorage.getItem('mqv_usuario'));
    this.usuarioNombre.set(localStorage.getItem('mqv_nombre'));
    this.superadmin.set(localStorage.getItem('mqv_super') === '1');
    const p = this.getPayload();
    this.primerIngreso.set(p?.primer_ingreso === 1);
  }
}
