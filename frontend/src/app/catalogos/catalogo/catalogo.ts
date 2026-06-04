import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { CatalogosService, LookupItem } from '../../core/services/catalogos.service';
import { PermisosService } from '../../core/services/permisos.service';
import { CatalogoConfig, CampoConfig } from '../catalogo-config';
import { confirmar } from '../../shared/confirmar.util';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.scss',
})
export class CatalogoComponent implements OnInit {
  config!: CatalogoConfig;

  items = signal<any[]>([]);
  filtrados = signal<any[]>([]);
  cargando = signal(false);
  error = signal('');
  successMsg = signal('');

  mostrarForm = signal(false);
  modoEdicion = signal(false);
  editandoId = signal<number | null>(null);
  guardando = signal(false);
  errorForm = signal('');

  formData: Record<string, any> = {};
  lookups: Record<string, LookupItem[]> = {};
  busqueda = '';

  constructor(
    private route: ActivatedRoute,
    private svc: CatalogosService,
    public permisos: PermisosService,
  ) {}

  ngOnInit() {
    this.config = this.route.snapshot.data['config'];
    for (const campo of this.config.campos) {
      if (campo.tipo === 'select' && campo.fuente) {
        this.svc.lookup(campo.fuente).subscribe({
          next: (opts) => (this.lookups[campo.fuente!] = opts),
        });
      }
    }
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.error.set('');
    this.svc.listar(this.config.apiRuta).subscribe({
      next: (data) => {
        this.items.set(data);
        this.filtrar();
        this.cargando.set(false);
      },
      error: (err: any) => {
        this.error.set(err.message || 'Error al cargar datos');
        this.cargando.set(false);
      },
    });
  }

  filtrar() {
    const q = this.busqueda.toLowerCase().trim();
    if (!q) { this.filtrados.set([...this.items()]); return; }
    this.filtrados.set(
      this.items().filter(item =>
        this.config.campos.some(c =>
          String(item[c.columnaTabla ?? c.nombre] ?? '').toLowerCase().includes(q)
        )
      )
    );
  }

  abrirNuevo() {
    this.formData = {};
    for (const campo of this.config.campos) {
      this.formData[campo.nombre] = campo.tipo === 'color' ? '#3788d8' : '';
    }
    this.modoEdicion.set(false);
    this.editandoId.set(null);
    this.errorForm.set('');
    this.mostrarForm.set(true);
  }

  abrirEditar(item: any) {
    this.formData = {};
    for (const campo of this.config.campos) {
      let val = item[campo.nombre] ?? '';
      if (campo.tipo === 'datetime-local' && val) {
        val = String(val).replace(' ', 'T').slice(0, 16);
      }
      if (campo.tipo === 'color' && !val) {
        val = '#3788d8';
      }
      this.formData[campo.nombre] = val;
    }
    this.modoEdicion.set(true);
    this.editandoId.set(item[this.config.pk]);
    this.errorForm.set('');
    this.mostrarForm.set(true);
  }

  cerrarForm() {
    this.mostrarForm.set(false);
  }

  guardar() {
    for (const campo of this.config.campos) {
      if (campo.requerido && !this.formData[campo.nombre]) {
        this.errorForm.set(`El campo "${campo.label}" es requerido`);
        return;
      }
    }
    this.guardando.set(true);
    this.errorForm.set('');
    const obs$: Observable<any> = this.modoEdicion()
      ? this.svc.actualizar(this.config.apiRuta, this.editandoId()!, this.formData)
      : this.svc.crear(this.config.apiRuta, this.formData);
    obs$.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarForm();
        this.successMsg.set(this.modoEdicion() ? 'Registro actualizado' : 'Registro creado correctamente');
        setTimeout(() => this.successMsg.set(''), 3000);
        this.cargar();
      },
      error: (err: any) => {
        this.guardando.set(false);
        this.errorForm.set(err.message || 'Error al guardar');
      },
    });
  }

  async toggleActivo(item: any) {
    const estado = item.activo ? 'desactivar' : 'activar';
    const label = this.getLabel(item);
    if (!await confirmar(`¿Deseas <b>${estado}</b> "${label}"?`, { btnConfirmar: `Sí, ${estado}` })) return;
    this.svc.toggle(this.config.apiRuta, item[this.config.pk]).subscribe({
      next: () => this.cargar(),
      error: (err: any) => this.error.set(err.message || 'Error al cambiar estado'),
    });
  }

  async eliminar(item: any) {
    const label = this.getLabel(item);
    if (!await confirmar(`¿Eliminar <b>"${label}"</b>?<br>Esta acción no se puede deshacer.`, { peligro: true })) return;
    this.svc.eliminar(this.config.apiRuta, item[this.config.pk]).subscribe({
      next: () => {
        this.successMsg.set('Registro eliminado');
        setTimeout(() => this.successMsg.set(''), 3000);
        this.cargar();
      },
      error: (err: any) => this.error.set(err.message || 'Error al eliminar'),
    });
  }

  getDisplayValue(item: any, campo: CampoConfig): string {
    const val = item[campo.columnaTabla ?? campo.nombre];
    if (val == null || val === '') return '—';
    if (campo.tipo === 'datetime-local') {
      return String(val).replace('T', ' ').slice(0, 16);
    }
    if (campo.tipo === 'decimal') {
      return parseFloat(val).toLocaleString('es-GT', { minimumFractionDigits: 2 });
    }
    return String(val);
  }

  colSpan(): number {
    return this.config.campos.length + (this.config.tieneActivo ? 1 : 0) + 1;
  }

  private getLabel(item: any): string {
    const primer = this.config.campos[0];
    return String(item[primer.columnaTabla ?? primer.nombre] ?? item[this.config.pk]);
  }
}
