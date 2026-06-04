import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsuariosService } from '../../core/services/usuarios.service';
import { PermisosService } from '../../core/services/permisos.service';
import { Usuario } from '../../core/models/usuario.model';
import { confirmar } from '../../shared/confirmar.util';

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

  async toggleEstado(u: Usuario) {
    const accion = u.activo ? this.svc.desactivar(u.usuario) : this.svc.activar(u.usuario);
    const esDesactivar = u.activo;
    const msg = esDesactivar ? `¿Desactivar al usuario <b>${u.nombre_completo}</b>?` : `¿Activar al usuario <b>${u.nombre_completo}</b>?`;
    if (!await confirmar(msg, { btnConfirmar: esDesactivar ? 'Sí, desactivar' : 'Sí, activar' })) return;
    accion.subscribe({
      next: (r) => { this.successMsg.set(r.message); this.cargar(); setTimeout(() => this.successMsg.set(''), 3000); },
      error: (err) => this.error.set(err.message || 'Error al cambiar estado'),
    });
  }

  async reenviarInvitacion(u: Usuario) {
    if (!await confirmar(`¿Reenviar invitación a <b>${u.nombre_completo}</b> (${u.email})?`, { btnConfirmar: 'Sí, reenviar' })) return;
    this.svc.reenviarInvitacion(u.usuario).subscribe({
      next: (r) => { this.successMsg.set(r.message); setTimeout(() => this.successMsg.set(''), 3000); },
      error: (err) => this.error.set(err.message || 'Error al reenviar invitación'),
    });
  }

  iniciales(nombre: string): string {
    return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }
}
