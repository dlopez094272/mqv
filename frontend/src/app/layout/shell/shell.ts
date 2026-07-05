import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { PermisosService } from '../../core/services/permisos.service';
import { InactividadService } from '../../core/services/inactividad.service';
import { SessionGuardComponent } from '../session-guard/session-guard';
import { CorreoService } from '../../correo/correo.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, SessionGuardComponent],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class ShellComponent {
  sidebarOpen      = signal(window.innerWidth >= 768);
  seguridadOpen    = signal(false);
  catalogosOpen    = signal(false);
  actividadesOpen  = signal(false);
  reportesOpen     = signal(false);
  crecimientoOpen  = signal(false);

  get isMobile() { return window.innerWidth < 768; }

  constructor(
    public auth:       AuthService,
    public permisos:   PermisosService,
    public router:     Router,
    public correoSvc:  CorreoService,
    private inactividad: InactividadService,
  ) {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      if (this.isMobile) this.sidebarOpen.set(false);
      if (e.url.startsWith('/seguridad'))    this.seguridadOpen.set(true);
      if (e.url.startsWith('/catalogos'))   this.catalogosOpen.set(true);
      if (e.url.startsWith('/actividades')) this.actividadesOpen.set(true);
      if (e.url.startsWith('/reportes'))    this.reportesOpen.set(true);
      if (e.url.startsWith('/crecimiento')) this.crecimientoOpen.set(true);
    });
    // Cargar no leídos al iniciar el shell
    this.correoSvc.cargarNoLeidos().subscribe();
  }

  logout() { this.inactividad.detener(); this.permisos.limpiar(); this.auth.logout(); }

  isActive(path: string): boolean {
    return this.router.url === path || this.router.url.startsWith(path + '/');
  }

  tieneSeguridad(): boolean {
    return this.auth.isSuperadmin() || this.permisos.puede('usuarios', 'S');
  }

  tieneCatalogos(): boolean {
    const tablas = [
      'iglesias', 'lugares', 'nacionalidades', 'departamentos', 'municipios',
      'profesiones', 'roles', 'grupos', 'tipos_documento',
      'experiencia_ministerial', 'experiencia_laboral',
      'actividades_categorias', 'actividades_grupos', 'estados_crecimiento',
    ];
    return tablas.some(t => this.permisos.puede(t, 'S'));
  }

  tieneActividades(): boolean {
    return this.permisos.puede('actividades', 'S');
  }

  tieneTesoreria(): boolean {
    return this.permisos.puede('tesoreria', 'S');
  }

  tienePersonas(): boolean {
    return this.permisos.puede('personas', 'S');
  }

  tieneReportes(): boolean {
    return this.permisos.puede('actividades', 'S') || this.permisos.puede('personas', 'S');
  }

  tienePublicaciones(): boolean {
    return this.permisos.puede('publicaciones', 'S');
  }

  tieneCrecimiento(): boolean {
    return this.permisos.puede('cursos', 'S') || this.permisos.puede('mis_cursos', 'S');
  }

  tieneCorreo(): boolean {
    return this.auth.isSuperadmin() || this.permisos.puede('correo', 'S');
  }
}
