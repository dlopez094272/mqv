import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GruposService } from '../../core/services/grupos.service';
import { GrupoPermiso } from '../../core/models/usuario.model';
import { confirmar } from '../../shared/confirmar.util';

@Component({
  selector: 'app-grupos',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './grupos.html',
  styleUrl: './grupos.scss',
})
export class GruposComponent implements OnInit {
  grupos = signal<GrupoPermiso[]>([]);
  cargando = signal(false);
  error = signal('');
  successMsg = signal('');
  showForm = signal(false);
  editando = signal<GrupoPermiso | null>(null);
  saving = signal(false);

  form: FormGroup;

  constructor(private svc: GruposService, private fb: FormBuilder) {
    this.form = this.fb.group({
      label:   ['', Validators.required],
      comment: [''],
    });
  }

  ngOnInit() { this.cargar(); }

  cargar() {
    this.cargando.set(true);
    this.svc.listar().subscribe({
      next:  d => { this.grupos.set(d); this.cargando.set(false); },
      error: e => { this.error.set(e.message); this.cargando.set(false); },
    });
  }

  abrirNuevo() {
    this.editando.set(null);
    this.form.reset();
    this.showForm.set(true);
  }

  abrirEditar(g: GrupoPermiso) {
    if (g.GroupID === -1) return;
    this.editando.set(g);
    this.form.patchValue({ label: g.Label, comment: g.Comment || '' });
    this.showForm.set(true);
  }

  cancelar() { this.showForm.set(false); this.form.reset(); }

  guardar() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    const data = { label: this.form.value.label, comment: this.form.value.comment || undefined };
    const g = this.editando();
    const obs = g ? this.svc.actualizar(g.GroupID, data) : this.svc.crear(data);
    obs.subscribe({
      next: (r) => {
        this.successMsg.set(r.message);
        this.saving.set(false);
        this.showForm.set(false);
        this.cargar();
        setTimeout(() => this.successMsg.set(''), 3000);
      },
      error: (e) => { this.error.set(e.message); this.saving.set(false); },
    });
  }

  async eliminar(g: GrupoPermiso) {
    if (g.GroupID === -1) return;
    if (!await confirmar(`¿Eliminar el grupo <b>"${g.Label}"</b>?<br>Se eliminarán también sus miembros y permisos.`, { peligro: true })) return;
    this.svc.eliminar(g.GroupID).subscribe({
      next: (r) => { this.successMsg.set(r.message); this.cargar(); setTimeout(() => this.successMsg.set(''), 3000); },
      error: (e) => this.error.set(e.message),
    });
  }
}
