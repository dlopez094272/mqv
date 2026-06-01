import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.html',
})
export class ForgotPasswordComponent {
  form: FormGroup;
  loading = signal(false);
  error = signal('');
  success = signal('');

  constructor(private fb: FormBuilder, private auth: AuthService) {
    this.form = this.fb.group({
      identificador: ['', Validators.required],
    });
  }

  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.success.set('');
    this.auth.forgotPassword(this.form.value.identificador.trim()).subscribe({
      next: (r) => { this.success.set(r.message); this.loading.set(false); },
      error: (err) => { this.error.set(err.message || 'Error al procesar la solicitud'); this.loading.set(false); },
    });
  }
}
