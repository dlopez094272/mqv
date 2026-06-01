import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsuariosService } from '../../core/services/usuarios.service';
import { PermisosService } from '../../core/services/permisos.service';
import { Usuario } from '../../core/models/usuario.model';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.scss',
})
export class UsuariosComponent implements OnInit {
  usuarios = signal<Usuario[]>([]);
  filtrados = signal<Usuario[]>([]);
  cargando = signal(false);
  error = signal('');
  successMsg = signal('');
  busqueda = '';

  constructor(private svc: UsuariosService, public permisos: PermisosService) {}

  ngOnInit() { this.cargar(); }

  cargar() {
    this.cargando.set(true);
    this.svc.listar().subscribe({
      next: (data) => {
        this.usuarios.set(data);
        this.filtrar();
        this.cargando.set(false);
      },
      error: (err) => { this.error.set(err.message || 'Error al cargar usuarios'); this.cargando.set(false); },
    });
  }

  filtrar() {
    const q = this.busqueda.toLowerCase();
    this.filtrados.set(
      q
        ? this.usuarios().filter(u =>
            u.usuario.toLowerCase().includes(q) ||
            u.nombre_completo.toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q)
          )
        : [...this.usuarios()]
    );
  }

  toggleEstado(u: Usuario) {
    const accion = u.activo ? this.svc.desactivar(u.usuario) : this.svc.activar(u.usuario);
    const msg = u.activo ? `¿Desactivar al usuario ${u.nombre_completo}?` : `¿Activar al usuario ${u.nombre_completo}?`;
    if (!confirm(msg)) return;
    accion.subscribe({
      next: (r) => { this.successMsg.set(r.message); this.cargar(); setTimeout(() => this.successMsg.set(''), 3000); },
      error: (err) => this.error.set(err.message || 'Error al cambiar estado'),
    });
  }

  reenviarInvitacion(u: Usuario) {
    if (!confirm(`¿Reenviar invitación a ${u.nombre_completo} (${u.email})?`)) return;
    this.svc.reenviarInvitacion(u.usuario).subscribe({
      next: (r) => { this.successMsg.set(r.message); setTimeout(() => this.successMsg.set(''), 3000); },
      error: (err) => this.error.set(err.message || 'Error al reenviar invitación'),
    });
  }

  iniciales(nombre: string): string {
    return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }
}
