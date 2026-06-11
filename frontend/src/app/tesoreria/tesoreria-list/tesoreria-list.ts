import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { Observable, Subscription, filter } from 'rxjs';
import {
  TesoreriaService, Tesoreria, TesoreriaUsuario, UsuarioLookup,
} from '../tesoreria.service';
import { PermisosService } from '../../core/services/permisos.service';
import { AuthService } from '../../core/services/auth.service';
import { confirmar } from '../../shared/confirmar.util';

@Component({
  selector: 'app-tesoreria-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tesoreria-list.html',
  styleUrl: './tesoreria-list.scss',
})
export class TesoreriaListComponent implements OnInit, OnDestroy {
  private routerSub?: Subscription;
  // ── Lista ─────────────────────────────────────────────────────
  tesorerias   = signal<Tesoreria[]>([]);
  filtrados    = signal<Tesoreria[]>([]);
  cargando     = signal(false);
  error        = signal('');
  successMsg   = signal('');
  busqueda     = '';
  mostrarExtra = signal(false);

  readonly LIMITE = 25;
  paginaActual = signal(1);
  totalPaginas = computed(() => Math.ceil(this.filtrados().length / this.LIMITE));
  paginados    = computed(() => {
    const start = (this.paginaActual() - 1) * this.LIMITE;
    return this.filtrados().slice(start, start + this.LIMITE);
  });
  paginas = computed(() => {
    const total = this.totalPaginas(); const actual = this.paginaActual();
    if (total <= 1) return [];
    const rango: (number | '...')[] = [];
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= actual - 2 && i <= actual + 2)) rango.push(i);
      else if (rango[rango.length - 1] !== '...') rango.push('...');
    }
    return rango;
  });
  irPagina(p: number | '...') {
    if (p === '...' || (p as number) < 1 || (p as number) > this.totalPaginas()) return;
    this.paginaActual.set(p as number);
  }

  // ── Formulario de tesorería ───────────────────────────────────
  mostrarForm  = signal(false);
  modoEdicion  = signal(false);
  editandoId   = signal<number | null>(null);
  guardando    = signal(false);
  errorForm    = signal('');
  form = { nombre: '', responsable: '' };

  // ── Modal PDF ─────────────────────────────────────────────────
  mostrarModalPdf  = signal(false);
  tesoParaPdf      = signal<Tesoreria | null>(null);
  pdfDesde         = '';
  pdfHasta         = '';
  errorPdf         = signal('');

  // ── Panel de usuarios ─────────────────────────────────────────
  mostrarUsuarios    = signal(false);
  tesoActiva         = signal<Tesoreria | null>(null);
  usuariosAsignados  = signal<TesoreriaUsuario[]>([]);
  cargandoUsuarios   = signal(false);
  todosUsuarios:       UsuarioLookup[] = [];
  formUsuario = { usuario: '', solo_lectura: false };
  errorUsuario = signal('');

  constructor(
    private svc:     TesoreriaService,
    public  permisos: PermisosService,
    public  auth:    AuthService,
    private router:  Router,
  ) {}

  ngOnInit() {
    this.cargar();
    this.svc.lookupUsuarios().subscribe({ next: u => this.todosUsuarios = u });
    // Recargar saldos al volver desde la página de movimientos (incluso con back del navegador)
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        if (e.url === '/tesoreria') this.cargar();
      });
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
  }

  cargar() {
    this.cargando.set(true);
    this.error.set('');
    this.svc.listar().subscribe({
      next: data => { this.tesorerias.set(data); this.filtrar(); this.cargando.set(false); },
      error: (err: any) => { this.error.set(err.message || 'Error al cargar'); this.cargando.set(false); },
    });
  }

  filtrar() {
    const q = this.busqueda.toLowerCase().trim();
    this.filtrados.set(
      q ? this.tesorerias().filter(t =>
        t.nombre.toLowerCase().includes(q) ||
        (t.responsable || '').toLowerCase().includes(q)
      ) : [...this.tesorerias()]
    );
    this.paginaActual.set(1);
  }

  // ── Formato de moneda ─────────────────────────────────────────
  formatQ(val: number | string | null): string {
    if (val == null || val === '') return 'Q 0.00';
    return 'Q ' + parseFloat(String(val)).toLocaleString('es-GT', {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
  }

  // ── Comprueba si el usuario es responsable de la tesorería ────
  esResponsable(t: Tesoreria): boolean {
    return this.auth.isSuperadmin() || t.responsable === this.auth.usuarioCodigo();
  }

  // ── CRUD tesorería ────────────────────────────────────────────
  abrirNuevo() {
    this.form = { nombre: '', responsable: this.auth.usuarioCodigo() || '' };
    this.modoEdicion.set(false);
    this.editandoId.set(null);
    this.errorForm.set('');
    this.mostrarForm.set(true);
  }

  abrirEditar(t: Tesoreria) {
    this.form = {
      nombre:      t.nombre,
      responsable: t.responsable || '',
    };
    this.modoEdicion.set(true);
    this.editandoId.set(t.idtesoreria);
    this.errorForm.set('');
    this.mostrarForm.set(true);
  }

  cerrarForm() { this.mostrarForm.set(false); }

  guardar() {
    if (!this.form.nombre.trim()) {
      this.errorForm.set('El nombre es requerido');
      return;
    }
    this.guardando.set(true);
    this.errorForm.set('');
    const obs$: Observable<any> = this.modoEdicion()
      ? this.svc.actualizar(this.editandoId()!, {
          nombre: this.form.nombre.trim(),
          responsable: this.form.responsable,
        })
      : this.svc.crear({
          nombre: this.form.nombre.trim(),
          responsable: this.form.responsable,
        });

    obs$.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarForm();
        this.mostrarExito(this.modoEdicion() ? 'Tesorería actualizada' : 'Tesorería creada');
        this.cargar();
      },
      error: (err: any) => {
        this.guardando.set(false);
        this.errorForm.set(err.message || 'Error al guardar');
      },
    });
  }

  async toggleActivo(t: Tesoreria) {
    const accion = t.activo ? 'desactivar' : 'activar';
    if (!await confirmar(`¿Deseas <b>${accion}</b> la tesorería "<b>${t.nombre}</b>"?`,
        { btnConfirmar: `Sí, ${accion}` })) return;
    this.svc.toggle(t.idtesoreria).subscribe({
      next: () => this.cargar(),
      error: (err: any) => this.error.set(err.message || 'Error'),
    });
  }

  async eliminar(t: Tesoreria) {
    if (!await confirmar(
        `¿Eliminar la tesorería <b>"${t.nombre}"</b>?<br>Esta acción no se puede deshacer.`,
        { peligro: true })) return;
    this.svc.eliminar(t.idtesoreria).subscribe({
      next: () => { this.mostrarExito('Tesorería eliminada'); this.cargar(); },
      error: (err: any) => this.error.set(err.message || 'Error al eliminar'),
    });
  }

  // ── Panel de usuarios ─────────────────────────────────────────
  abrirUsuarios(t: Tesoreria) {
    this.tesoActiva.set(t);
    this.formUsuario = { usuario: '', solo_lectura: false };
    this.errorUsuario.set('');
    this.cargarUsuarios();
    this.mostrarUsuarios.set(true);
  }

  cerrarUsuarios() { this.mostrarUsuarios.set(false); }

  cargarUsuarios() {
    const t = this.tesoActiva();
    if (!t) return;
    this.cargandoUsuarios.set(true);
    this.svc.listarUsuarios(t.idtesoreria).subscribe({
      next: u => { this.usuariosAsignados.set(u); this.cargandoUsuarios.set(false); },
      error: () => this.cargandoUsuarios.set(false),
    });
  }

  asignarUsuario() {
    const t = this.tesoActiva();
    if (!t || !this.formUsuario.usuario) {
      this.errorUsuario.set('Selecciona un usuario'); return;
    }
    this.errorUsuario.set('');
    this.svc.asignarUsuario(t.idtesoreria, this.formUsuario.usuario, this.formUsuario.solo_lectura)
      .subscribe({
        next: r => {
          this.mostrarExito(r.message);
          this.formUsuario = { usuario: '', solo_lectura: false };
          this.cargarUsuarios();
        },
        error: (err: any) => this.errorUsuario.set(err.message || 'Error al asignar'),
      });
  }

  async quitarUsuario(u: TesoreriaUsuario) {
    const t = this.tesoActiva();
    if (!t) return;
    if (!await confirmar(`¿Quitar el acceso de <b>${u.nombre_completo}</b>?`,
        { btnConfirmar: 'Sí, quitar' })) return;
    this.svc.quitarUsuario(t.idtesoreria, u.usuario).subscribe({
      next: r => { this.mostrarExito(r.message); this.cargarUsuarios(); },
      error: (err: any) => this.error.set(err.message || 'Error'),
    });
  }

  // ── PDF ───────────────────────────────────────────────────────
  abrirModalPdf(t: Tesoreria) {
    this.tesoParaPdf.set(t);
    this.errorPdf.set('');
    // Mes actual por defecto
    const now  = new Date();
    const y    = now.getFullYear();
    const m    = String(now.getMonth() + 1).padStart(2, '0');
    const last = new Date(y, now.getMonth() + 1, 0).getDate();
    this.pdfDesde = `${y}-${m}-01`;
    this.pdfHasta = `${y}-${m}-${String(last).padStart(2, '0')}`;
    this.mostrarModalPdf.set(true);
  }

  cerrarModalPdf() { this.mostrarModalPdf.set(false); }

  generarPdf() {
    const t = this.tesoParaPdf();
    if (!t) return;
    if (!this.pdfDesde || !this.pdfHasta) {
      this.errorPdf.set('Debe ingresar la fecha de inicio y fin');
      return;
    }
    if (this.pdfDesde > this.pdfHasta) {
      this.errorPdf.set('La fecha de inicio debe ser menor o igual a la fecha fin');
      return;
    }
    const url = `/tesoreria/${t.idtesoreria}/reporte?desde=${this.pdfDesde}&hasta=${this.pdfHasta}`;
    window.open(url, '_blank');
    this.cerrarModalPdf();
  }

  // ── Movimientos ───────────────────────────────────────────────
  verMovimientos(t: Tesoreria) {
    this.router.navigate(['/tesoreria', t.idtesoreria, 'movimientos']);
  }

  // ── Helpers ───────────────────────────────────────────────────
  private mostrarExito(msg: string) {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(''), 3000);
  }

  usuariosDisponibles(): UsuarioLookup[] {
    const asignados = new Set(this.usuariosAsignados().map(u => u.usuario));
    const responsable = this.tesoActiva()?.responsable;
    return this.todosUsuarios.filter(u => !asignados.has(u.usuario) && u.usuario !== responsable);
  }
}
