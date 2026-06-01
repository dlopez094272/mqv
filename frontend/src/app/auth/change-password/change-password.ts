import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './change-password.html',
})
export class ChangePasswordComponent {
  form: FormGroup;
  loading = signal(false);
  error = signal('');
  success = signal('');

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      password_actual: ['', Validators.required],
      password_nuevo: ['', [Validators.required, Validators.minLength(8)]],
      confirmar: ['', Validators.required],
    }, { validators: this.matchPasswords });
  }

  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    const { password_actual, password_nuevo } = this.form.value;
    this.auth.changePassword(password_actual, password_nuevo).subscribe({
      next: (r) => {
        this.success.set(r.message);
        this.loading.set(false);
        setTimeout(() => this.router.navigate(['/dashboard']), 2000);
      },
      error: (err) => { this.error.set(err.message || 'Error al cambiar contraseña'); this.loading.set(false); },
    });
  }

  private matchPasswords(g: FormGroup) {
    return g.get('password_nuevo')?.value === g.get('confirmar')?.value ? null : { mismatch: true };
  }
}
