import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

interface PermisosResp {
  is_superadmin: boolean;
  permisos: Record<string, string>;
}

@Injectable({ providedIn: 'root' })
export class PermisosService {
  private readonly base = environment.apiUrl + '/auth/mis-permisos';
  private permisos = signal<Record<string, string>>({});
  private loaded = false;
  private promise: Promise<void> | null = null;

  constructor(private http: HttpClient, private auth: AuthService) {}

  /** Carga desde la API. Devuelve Promise para poder await. */
  cargar(): Promise<void> {
    if (!this.auth.isAuthenticated()) return Promise.resolve();
    this.promise = new Promise<void>((resolve) => {
      this.http.get<PermisosResp>(this.base).subscribe({
        next: (r) => {
          this.permisos.set(r.permisos);
          this.loaded = true;
          resolve();
        },
        error: () => resolve(), // silencioso; el backend rechazará las rutas de todos modos
      });
    });
    return this.promise;
  }

  /** Carga solo si todavía no se ha cargado. Útil en guards. */
  cargarSiVacio(): Promise<void> {
    if (this.loaded) return Promise.resolve();
    if (this.promise) return this.promise;
    return this.cargar();
  }

  /** Comprueba si el usuario tiene permiso para la operación indicada. */
  puede(tabla: string, operacion: 'A' | 'D' | 'E' | 'S'): boolean {
    if (this.auth.isSuperadmin()) return true;
    return (this.permisos()[tabla] || '').includes(operacion);
  }

  /** Retorna el AccessMask completo de una tabla para el usuario actual. */
  getMask(tabla: string): string {
    if (this.auth.isSuperadmin()) return 'ADES';
    return this.permisos()[tabla] || '';
  }

  /** Llama en logout para que el próximo login recargue los permisos. */
  limpiar(): void {
    this.permisos.set({});
    this.loaded = false;
    this.promise = null;
  }
}
