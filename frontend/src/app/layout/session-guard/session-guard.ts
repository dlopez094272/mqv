import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InactividadService } from '../../core/services/inactividad.service';
import { AuthService } from '../../core/services/auth.service';
import { PermisosService } from '../../core/services/permisos.service';

@Component({
  selector: 'app-session-guard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './session-guard.html',
  styleUrl: './session-guard.scss',
})
export class SessionGuardComponent {
  password = '';
  errorMsg = signal('');
  cargando = signal(false);

  constructor(
    public inactividad: InactividadService,
    public auth: AuthService,
    private permisos: PermisosService,
  ) {}

  continuar() {
    this.inactividad.continuar();
  }

  cerrarSesion() {
    this.inactividad.detener();
    this.permisos.limpiar();
    this.auth.logout();
  }

  reautenticar() {
    if (!this.password.trim()) {
      this.errorMsg.set('Ingresa tu contraseña para continuar');
      return;
    }
    this.cargando.set(true);
    this.errorMsg.set('');
    this.auth.login(this.auth.usuarioCodigo()!, this.password).subscribe({
      next: () => {
        this.cargando.set(false);
        this.password = '';
        this.permisos.limpiar();
        this.permisos.cargar();
        this.inactividad.desbloquear();
      },
      error: (err: any) => {
        this.cargando.set(false);
        this.errorMsg.set(err.error?.error || 'Contraseña incorrecta');
      },
    });
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') this.reautenticar();
  }

  get porcentajeRestante(): number {
    return (this.inactividad.segundosRestantes() / 60) * 100;
  }
}
