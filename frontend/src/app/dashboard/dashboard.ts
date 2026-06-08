import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { CrecimientoService, LogroItem } from '../crecimiento/crecimiento.service';
import { PermisosService } from '../core/services/permisos.service';
import { CorreoService } from '../correo/correo.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  now         = new Date();
  errorPerfil = signal('');
  logros      = signal<LogroItem[]>([]);
  cargandoLogros = signal(false);

  constructor(
    public  auth:      AuthService,
    public  permisos:  PermisosService,
    public  correoSvc: CorreoService,
    private router:    Router,
    private crecSvc:   CrecimientoService,
  ) {}

  ngOnInit() {
    this.cargarLogros();
    this.correoSvc.cargarNoLeidos().subscribe();
  }

  cargarLogros() {
    this.cargandoLogros.set(true);
    this.crecSvc.misLogros().subscribe({
      next:  data => { this.logros.set(data); this.cargandoLogros.set(false); },
      error: ()   => { this.cargandoLogros.set(false); },
    });
  }

  irACorreo()  { this.router.navigate(['/correo']); }
  irAMiPerfil() { this.router.navigate(['/mi-perfil']); }
  irACurso(idcursos: number) { this.router.navigate(['/crecimiento/mis-cursos', idcursos]); }
  verCertificado(idcursos: number) { window.open(`/certificado/${idcursos}`, '_blank'); }

  logoUrl(filename: string) { return this.crecSvc.logoUrl(filename); }

  formatFecha(f: string): string {
    return new Date(f).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
