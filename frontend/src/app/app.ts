import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { PermisosService } from './core/services/permisos.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App implements OnInit {
  constructor(private auth: AuthService, private permisos: PermisosService) {}

  ngOnInit() {
    // Recarga permisos al refrescar la página si ya hay sesión activa
    if (this.auth.isAuthenticated()) {
      this.permisos.cargar();
    }
  }
}
