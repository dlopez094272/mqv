import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.html',
})
export class ResetPasswordComponent implements OnInit {
  form: FormGroup;
  token = '';
  nombre = signal('');
  loading = signal(false);
  verificando = signal(true);
  error = signal('');
  success = signal('');
  showPass = signal(false);
  showPass2 = signal(false);

  constructor(private fb: FormBuilder, private auth: AuthService, private route: ActivatedRoute, private router: Router) {
    this.form = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmar: ['', Validators.required],
    }, { validators: this.matchPasswords });
  }

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) { this.error.set('Enlace inválido'); this.verificando.set(false); return; }
    this.auth.verifyToken(this.token).subscribe({
      next: (r) => { this.nombre.set(r.nombre); this.verificando.set(false); },
      error: (err) => { this.error.set(err.message || 'El enlace es inválido o ha expirado'); this.verificando.set(false); },
    });
  }

  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.auth.resetPassword(this.token, this.form.value.password).subscribe({
      next: (r) => { this.success.set(r.message); this.loading.set(false); setTimeout(() => this.router.navigate(['/login']), 3000); },
      error: (err) => { this.error.set(err.message || 'Error al restablecer contraseña'); this.loading.set(false); },
    });
  }

  private matchPasswords(g: FormGroup) {
    const p = g.get('password')?.value;
    const c = g.get('confirmar')?.value;
    return p === c ? null : { mismatch: true };
  }
}
