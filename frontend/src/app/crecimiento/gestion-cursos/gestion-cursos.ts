import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CrecimientoService, Curso, AsignacionItem, UsuarioLookup, EditorItem } from '../crecimiento.service';
import { PermisosService } from '../../core/services/permisos.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-gestion-cursos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-cursos.html',
  styleUrl: './gestion-cursos.scss',
})
export class GestionCursosComponent implements OnInit {
  cursos       = signal<Curso[]>([]);
  filtrados    = signal<Curso[]>([]);
  cargando     = signal(false);
  error        = signal('');
  exito        = signal('');
  busqueda     = '';

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

  // ── Modal de asignaciones ────────────────────────────────────
  modalAsig       = signal(false);
  cursoAsig       = signal<Curso | null>(null);
  asignaciones    = signal<AsignacionItem[]>([]);
  disponibles     = signal<UsuarioLookup[]>([]);
  seleccionados   = signal<Set<string>>(new Set());
  cargandoAsig    = signal(false);
  errorAsig       = signal('');

  // ── Modal de editores ────────────────────────────────────────
  modalEditores      = signal(false);
  cursoEditores      = signal<Curso | null>(null);
  editores            = signal<EditorItem[]>([]);
  disponiblesEditor   = signal<UsuarioLookup[]>([]);
  seleccionadosEditor = signal<Set<string>>(new Set());
  cargandoEditores    = signal(false);
  errorEditores       = signal('');

  constructor(
    private svc:     CrecimientoService,
    public  permisos: PermisosService,
    public  auth:    AuthService,
    private router:  Router,
  ) {}

  ngOnInit() { this.cargar(); }

  cargar() {
    this.cargando.set(true);
    this.error.set('');
    this.svc.listarCursos().subscribe({
      next: data => { this.cursos.set(data); this.filtrar(); this.cargando.set(false); },
      error: (e: any) => { this.error.set(e.message || 'Error al cargar'); this.cargando.set(false); },
    });
  }

  filtrar() {
    const q = this.busqueda.toLowerCase().trim();
    this.filtrados.set(q
      ? this.cursos().filter(c => c.nombre.toLowerCase().includes(q))
      : [...this.cursos()]
    );
    this.paginaActual.set(1);
  }

  nuevo()         { this.router.navigate(['/crecimiento/cursos/nuevo']); }
  editar(c: Curso){ this.router.navigate(['/crecimiento/cursos', c.idcursos, 'editar']); }

  toggle(c: Curso) {
    this.svc.toggleCurso(c.idcursos).subscribe({
      next: r => { this.mostrarExito(r.message); this.cargar(); },
      error: (e: any) => this.error.set(e.message || 'Error'),
    });
  }

  // ── Asignaciones ─────────────────────────────────────────────
  abrirAsig(c: Curso) {
    this.cursoAsig.set(c);
    this.seleccionados.set(new Set());
    this.errorAsig.set('');
    this.cargandoAsig.set(true);
    this.modalAsig.set(true);
    this.svc.listarAsignaciones(c.idcursos).subscribe({
      next: a => { this.asignaciones.set(a); this.cargarDisponibles(c.idcursos); },
      error: () => this.cargandoAsig.set(false),
    });
  }

  cargarDisponibles(id: number) {
    this.svc.usuariosDisponibles(id).subscribe({
      next: d => { this.disponibles.set(d); this.cargandoAsig.set(false); },
      error: () => this.cargandoAsig.set(false),
    });
  }

  toggleSeleccion(usuario: string) {
    const s = new Set(this.seleccionados());
    s.has(usuario) ? s.delete(usuario) : s.add(usuario);
    this.seleccionados.set(s);
  }

  guardarAsig() {
    const c = this.cursoAsig();
    if (!c || !this.seleccionados().size) { this.errorAsig.set('Selecciona al menos un usuario'); return; }
    this.errorAsig.set('');
    this.svc.asignarUsuarios(c.idcursos, [...this.seleccionados()]).subscribe({
      next: r => {
        this.mostrarExito(r.message);
        this.seleccionados.set(new Set());
        this.svc.listarAsignaciones(c.idcursos).subscribe({ next: a => this.asignaciones.set(a) });
        this.cargarDisponibles(c.idcursos);
        this.cargar();
      },
      error: (e: any) => this.errorAsig.set(e.message || 'Error al asignar'),
    });
  }

  quitarAsig(a: AsignacionItem) {
    this.svc.quitarAsignacion(a.idasignacion).subscribe({
      next: () => {
        const c = this.cursoAsig();
        if (c) {
          this.svc.listarAsignaciones(c.idcursos).subscribe({ next: d => this.asignaciones.set(d) });
          this.cargarDisponibles(c.idcursos);
          this.cargar();
        }
      },
      error: (e: any) => this.errorAsig.set(e.message || 'Error'),
    });
  }

  cerrarAsig() { this.modalAsig.set(false); }

  // ── Editores ──────────────────────────────────────────────────
  puedeGestionarEditores(c: Curso) {
    return this.auth.superadmin() || !!c.es_propietario;
  }

  abrirEditores(c: Curso) {
    this.cursoEditores.set(c);
    this.seleccionadosEditor.set(new Set());
    this.errorEditores.set('');
    this.cargandoEditores.set(true);
    this.modalEditores.set(true);
    this.svc.listarEditores(c.idcursos).subscribe({
      next: e => { this.editores.set(e); this.cargarDisponiblesEditor(c.idcursos); },
      error: () => this.cargandoEditores.set(false),
    });
  }

  cargarDisponiblesEditor(id: number) {
    this.svc.usuariosDisponiblesEditor(id).subscribe({
      next: d => { this.disponiblesEditor.set(d); this.cargandoEditores.set(false); },
      error: () => this.cargandoEditores.set(false),
    });
  }

  toggleSeleccionEditor(usuario: string) {
    const s = new Set(this.seleccionadosEditor());
    s.has(usuario) ? s.delete(usuario) : s.add(usuario);
    this.seleccionadosEditor.set(s);
  }

  guardarEditores() {
    const c = this.cursoEditores();
    if (!c || !this.seleccionadosEditor().size) { this.errorEditores.set('Selecciona al menos un usuario'); return; }
    this.errorEditores.set('');
    this.svc.agregarEditores(c.idcursos, [...this.seleccionadosEditor()]).subscribe({
      next: r => {
        this.mostrarExito(r.message);
        this.seleccionadosEditor.set(new Set());
        this.svc.listarEditores(c.idcursos).subscribe({ next: e => this.editores.set(e) });
        this.cargarDisponiblesEditor(c.idcursos);
      },
      error: (e: any) => this.errorEditores.set(e.message || 'Error al agregar editor'),
    });
  }

  quitarEditor(e: EditorItem) {
    this.svc.quitarEditor(e.ideditor).subscribe({
      next: () => {
        const c = this.cursoEditores();
        if (c) {
          this.svc.listarEditores(c.idcursos).subscribe({ next: d => this.editores.set(d) });
          this.cargarDisponiblesEditor(c.idcursos);
        }
      },
      error: (err: any) => this.errorEditores.set(err.message || 'Error'),
    });
  }

  cerrarEditores() { this.modalEditores.set(false); }

  private mostrarExito(msg: string) {
    this.exito.set(msg);
    setTimeout(() => this.exito.set(''), 3000);
  }

  logoUrl(filename: string) { return this.svc.logoUrl(filename); }
}
