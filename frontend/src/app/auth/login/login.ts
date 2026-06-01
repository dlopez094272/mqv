import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PermisosService } from '../../core/services/permisos.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  form: FormGroup;
  loading = signal(false);
  error = signal('');
  showPass = signal(false);

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private permisos: PermisosService,
    private router: Router,
  ) {
    if (auth.isAuthenticated()) router.navigate(['/dashboard']);
    this.form = this.fb.group({
      usuario: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  submit() {
    if (this.form.invalid || this.loading()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    const { usuario, password } = this.form.value;
    this.auth.login(usuario.trim(), password).subscribe({
      next: async (res) => {
        await this.permisos.cargar(); // carga permisos antes de navegar
        if (res.primer_ingreso === 1) {
          this.router.navigate(['/cambiar-password']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.error.set(err.message || 'Error al iniciar sesión');
        this.loading.set(false);
      },
    });
  }
}
