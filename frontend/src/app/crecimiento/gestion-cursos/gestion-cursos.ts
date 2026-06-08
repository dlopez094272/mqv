import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CrecimientoService, Curso, AsignacionItem, UsuarioLookup } from '../crecimiento.service';
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

  private mostrarExito(msg: string) {
    this.exito.set(msg);
    setTimeout(() => this.exito.set(''), 3000);
  }

  logoUrl(filename: string) { return this.svc.logoUrl(filename); }
}
