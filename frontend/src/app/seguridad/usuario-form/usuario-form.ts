import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UsuariosService } from '../../core/services/usuarios.service';

@Component({
  selector: 'app-usuario-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './usuario-form.html',
  styleUrl: './usuario-form.scss',
})
export class UsuarioFormComponent implements OnInit {
  form: FormGroup;
  esNuevo = true;
  usuarioCodigo = '';
  loading = signal(false);
  cargando = signal(false);
  error = signal('');
  success = signal('');

  constructor(private fb: FormBuilder, private svc: UsuariosService, private route: ActivatedRoute, private router: Router) {
    this.form = this.fb.group({
      usuario: ['', [Validators.required, Validators.pattern(/^\S+$/)]],
      nombre_completo: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telefono: [''],
    });
  }

  ngOnInit() {
    this.usuarioCodigo = this.route.snapshot.paramMap.get('usuario') || '';
    this.esNuevo = !this.usuarioCodigo;

    if (!this.esNuevo) {
      this.form.get('usuario')?.disable();
      this.cargarUsuario();
    }
  }

  cargarUsuario() {
    this.cargando.set(true);
    this.svc.obtener(this.usuarioCodigo).subscribe({
      next: (u) => {
        this.form.patchValue({ usuario: u.usuario, nombre_completo: u.nombre_completo, email: u.email, telefono: u.telefono || '' });
        this.cargando.set(false);
      },
      error: (err) => { this.error.set(err.message || 'Error al cargar usuario'); this.cargando.set(false); },
    });
  }

  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set('');

    const raw = this.form.getRawValue();
    const payload: any = {
      nombre_completo: raw.nombre_completo,
      email: raw.email,
      telefono: raw.telefono || null,
    };

    if (this.esNuevo) {
      payload.usuario = raw.usuario;
      this.svc.crear(payload).subscribe({
        next: (r) => { this.success.set(r.message); this.loading.set(false); },
        error: (err) => { this.error.set(err.message || 'Error al crear usuario'); this.loading.set(false); },
      });
    } else {
      this.svc.actualizar(this.usuarioCodigo, payload).subscribe({
        next: (r) => {
          this.success.set(r.message);
          this.loading.set(false);
          setTimeout(() => this.router.navigate(['/seguridad/usuarios']), 1500);
        },
        error: (err) => { this.error.set(err.message || 'Error al actualizar usuario'); this.loading.set(false); },
      });
    }
  }
}
