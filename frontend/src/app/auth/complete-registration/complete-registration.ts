import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-complete-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './complete-registration.html',
  styleUrl: './complete-registration.scss',
})
export class CompleteRegistrationComponent implements OnInit {
  form: FormGroup;
  token = '';
  nombre = signal('');
  loading = signal(false);
  verificando = signal(true);
  error = signal('');
  success = signal('');
  fotoPreview = signal<string | null>(null);
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

  onFotoChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { this.error.set('La imagen no debe superar 3 MB'); return; }
    const reader = new FileReader();
    reader.onload = () => this.fotoPreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.completeRegistration(this.token, this.form.value.password, this.fotoPreview() || undefined).subscribe({
      next: (r) => {
        this.success.set(r.message);
        this.loading.set(false);
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (err) => { this.error.set(err.message || 'Error al completar el registro'); this.loading.set(false); },
    });
  }

  private matchPasswords(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmar')?.value ? null : { mismatch: true };
  }
}
