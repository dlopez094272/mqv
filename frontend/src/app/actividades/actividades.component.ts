import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';
import { HttpClient }     from '@angular/common/http';
import { Observable }     from 'rxjs';
import {
  ActividadesService, Actividad, AdjuntoInfo,
  CategoriaLookup, LugarLookup,
} from './actividades.service';
import { PermisosService } from '../core/services/permisos.service';
import { environment }     from '../../environments/environment';

interface DiaCalendario {
  fecha:        Date;
  esMesActual:  boolean;
  esHoy:        boolean;
  actividades:  Actividad[];
}

interface ActGantt extends Actividad {
  leftPx:  number;
  widthPx: number;
}

@Component({
  selector:    'app-actividades',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './actividades.component.html',
  styleUrl:    './actividades.component.scss',
})
export class ActividadesComponent implements OnInit {
  private svc    = inject(ActividadesService);
  private http   = inject(HttpClient);
  public permisos = inject(PermisosService);

  readonly DAY_WIDTH = 32;

  // ── UI state ─────────────────────────────────────────────────
  vista      = signal<'calendar' | 'gantt' | 'tabla'>('calendar');
  cargando   = signal(false);
  error      = signal('');

  // ── Drag & Drop ───────────────────────────────────────────────
  arrastrando      = signal<Actividad | null>(null);
  diaArrastreSobre = signal<number | null>(null); // timestamp del día destino
  guardandoDrag    = signal(false);
  successMsg = signal('');

  // ── Data ─────────────────────────────────────────────────────
  actividades = signal<Actividad[]>([]);
  categorias  = signal<CategoriaLookup[]>([]);
  lugares     = signal<LugarLookup[]>([]);

  // ── Calendar ─────────────────────────────────────────────────
  mesActual = signal(new Date());

  // ── Form ─────────────────────────────────────────────────────
  mostrarForm = signal(false);
  modoEdicion = signal(false);
  editandoId  = signal<number | null>(null);
  guardando   = signal(false);
  errorForm   = signal('');

  form = {
    idcategorias: '',
    nombre:       '',
    descripcion:  '',
    fecha_inicio: '',
    fecha_fin:    '',
    hora_inicio:  '',
    hora_fin:     '',
    idlugares:    '',
  };

  logoFile:     File | null = null;
  logoPreview:  string | null = null;
  logoActual:   string | null = null;
  eliminarLogo  = false;

  adjuntosNuevos:   File[]        = [];
  adjuntosActuales: AdjuntoInfo[] = [];

  // ── Computed: calendario ──────────────────────────────────────
  diasCalendario = computed<DiaCalendario[]>(() => {
    const hoy    = new Date(); hoy.setHours(0, 0, 0, 0);
    const mes    = this.mesActual();
    const inicio = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const start  = new Date(inicio);
    start.setDate(start.getDate() - start.getDay());

    const dias: DiaCalendario[] = [];
    const d = new Date(start);
    for (let i = 0; i < 42; i++) {
      const fecha = new Date(d); fecha.setHours(0, 0, 0, 0);
      const actsDelDia = this.actividades().filter(a => {
        const fi = new Date(String(a.fecha_inicio).slice(0, 10) + 'T00:00:00');
        const ff = new Date(String(a.fecha_fin).slice(0, 10) + 'T00:00:00');
        return fecha >= fi && fecha <= ff;
      });
      dias.push({
        fecha,
        esMesActual: fecha.getMonth() === inicio.getMonth(),
        esHoy:       fecha.getTime() === hoy.getTime(),
        actividades: actsDelDia,
      });
      d.setDate(d.getDate() + 1);
    }
    return dias;
  });

  // ── Computed: gantt rango ─────────────────────────────────────
  ganttRango = computed<{ inicio: Date; fin: Date; dias: Date[] }>(() => {
    const acts = this.actividades();
    let inicio: Date;
    let fin: Date;

    if (!acts.length) {
      inicio = new Date(); inicio.setHours(0, 0, 0, 0);
      fin    = new Date(inicio); fin.setDate(fin.getDate() + 30);
    } else {
      const starts = acts.map(a => new Date(String(a.fecha_inicio).slice(0, 10) + 'T00:00:00').getTime());
      const ends   = acts.map(a => new Date(String(a.fecha_fin).slice(0, 10)    + 'T00:00:00').getTime());
      inicio = new Date(Math.min(...starts)); inicio.setDate(inicio.getDate() - 2);
      fin    = new Date(Math.max(...ends));   fin.setDate(fin.getDate() + 2);
    }

    const dias: Date[] = [];
    const d = new Date(inicio);
    while (d <= fin) { dias.push(new Date(d)); d.setDate(d.getDate() + 1); }
    return { inicio, fin, dias };
  });

  ganttMeses = computed<{ label: string; dias: number }[]>(() => {
    const { inicio, fin, dias } = this.ganttRango();
    const meses: { label: string; dias: number }[] = [];
    const d = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    while (d <= fin) {
      const yr = d.getFullYear(), mo = d.getMonth();
      const count = dias.filter(dia => dia.getFullYear() === yr && dia.getMonth() === mo).length;
      if (count > 0) {
        meses.push({ label: d.toLocaleDateString('es-GT', { month: 'short', year: 'numeric' }), dias: count });
      }
      d.setMonth(d.getMonth() + 1);
    }
    return meses;
  });

  ganttTotalWidth = computed(() => this.ganttRango().dias.length * this.DAY_WIDTH);

  actividadesConGantt = computed<ActGantt[]>(() => {
    const { inicio } = this.ganttRango();
    const t0 = inicio.getTime();
    return this.actividades().map(a => {
      const fi = new Date(String(a.fecha_inicio).slice(0, 10) + 'T00:00:00').getTime();
      const ff = new Date(String(a.fecha_fin).slice(0, 10)    + 'T00:00:00').getTime();
      const leftPx  = Math.max(0, (fi - t0) / 86400000) * this.DAY_WIDTH;
      const widthPx = Math.max(this.DAY_WIDTH, ((ff - fi) / 86400000 + 1) * this.DAY_WIDTH);
      return { ...a, leftPx, widthPx };
    });
  });

  // ── Lifecycle ─────────────────────────────────────────────────
  ngOnInit() {
    this.cargarLookups();
    this.cargar();
  }

  cargarLookups() {
    this.http.get<CategoriaLookup[]>(`${environment.apiUrl}/catalogos/lookup/actividades-categorias`)
      .subscribe({ next: d => this.categorias.set(d) });
    this.http.get<LugarLookup[]>(`${environment.apiUrl}/catalogos/lookup/lugares`)
      .subscribe({ next: d => this.lugares.set(d) });
  }

  cargar() {
    this.cargando.set(true);
    this.svc.listar().subscribe({
      next:  d => { this.actividades.set(d); this.cargando.set(false); },
      error: (e: any) => { this.error.set(e.message || 'Error al cargar'); this.cargando.set(false); },
    });
  }

  // ── Calendario: navegación ────────────────────────────────────
  mesNombre(): string {
    const s = this.mesActual().toLocaleDateString('es-GT', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  prevMes() { const m = this.mesActual(); this.mesActual.set(new Date(m.getFullYear(), m.getMonth() - 1, 1)); }
  nextMes() { const m = this.mesActual(); this.mesActual.set(new Date(m.getFullYear(), m.getMonth() + 1, 1)); }
  hoyMes()  { this.mesActual.set(new Date()); }

  // ── Formulario ────────────────────────────────────────────────
  abrirNuevo() {
    this._resetForm('', '');
  }

  abrirNuevoEnFecha(fecha: Date) {
    if (this.mostrarForm()) return; // ya hay un form abierto
    const iso = fecha.toISOString().slice(0, 10);
    this._resetForm(iso, iso);
  }

  private _resetForm(fechaInicio: string, fechaFin: string) {
    this.form = { idcategorias: '', nombre: '', descripcion: '',
                  fecha_inicio: fechaInicio, fecha_fin: fechaFin,
                  hora_inicio: '', hora_fin: '', idlugares: '' };
    this.logoFile = null; this.logoPreview = null;
    this.logoActual = null; this.eliminarLogo = false;
    this.adjuntosNuevos = []; this.adjuntosActuales = [];
    this.modoEdicion.set(false); this.editandoId.set(null);
    this.errorForm.set(''); this.mostrarForm.set(true);
  }

  abrirEditar(act: Actividad) {
    this.form = {
      idcategorias: act.idcategorias?.toString() || '',
      nombre:       act.nombre,
      descripcion:  act.descripcion || '',
      fecha_inicio: String(act.fecha_inicio).slice(0, 10),
      fecha_fin:    String(act.fecha_fin).slice(0, 10),
      hora_inicio:  act.hora_inicio ? String(act.hora_inicio).slice(0, 5) : '',
      hora_fin:     act.hora_fin    ? String(act.hora_fin).slice(0, 5)    : '',
      idlugares:    act.idlugares?.toString() || '',
    };
    this.logoFile = null; this.logoPreview = null;
    this.logoActual = act.logo; this.eliminarLogo = false;
    this.adjuntosNuevos = [];
    this.adjuntosActuales = this.parseAdjuntos(act.adjuntos);
    this.modoEdicion.set(true); this.editandoId.set(act.idactividades);
    this.errorForm.set(''); this.mostrarForm.set(true);
  }

  cerrarForm() {
    this.mostrarForm.set(false);
    this.logoPreview = null; this.adjuntosNuevos = [];
  }

  onLogoChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.errorForm.set('El logo debe ser una imagen (jpg, png, gif, webp...)');
      return;
    }
    this.logoFile = file; this.eliminarLogo = false;
    const reader = new FileReader();
    reader.onload = e => { this.logoPreview = e.target?.result as string; };
    reader.readAsDataURL(file);
  }

  quitarLogo() {
    this.logoFile = null; this.logoPreview = null;
    this.logoActual = null; this.eliminarLogo = true;
  }

  onAdjuntosChange(event: Event) {
    const files = Array.from((event.target as HTMLInputElement).files || []);
    this.adjuntosNuevos = [...this.adjuntosNuevos, ...files];
    (event.target as HTMLInputElement).value = '';
  }

  quitarAdjuntoNuevo(i: number)   { this.adjuntosNuevos.splice(i, 1); }
  quitarAdjuntoActual(i: number)  { this.adjuntosActuales.splice(i, 1); }

  guardar() {
    if (!this.form.nombre.trim())  { this.errorForm.set('El nombre es requerido');           return; }
    if (!this.form.fecha_inicio)   { this.errorForm.set('La fecha de inicio es requerida'); return; }
    if (!this.form.fecha_fin)      { this.errorForm.set('La fecha de fin es requerida');    return; }
    if (!this.form.hora_inicio)    { this.errorForm.set('La hora de inicio es requerida');  return; }
    if (!this.form.hora_fin)       { this.errorForm.set('La hora de fin es requerida');     return; }

    const fd = new FormData();
    if (this.form.idcategorias) fd.append('idcategorias', this.form.idcategorias);
    fd.append('nombre',       this.form.nombre.trim());
    fd.append('descripcion',  this.form.descripcion);
    fd.append('fecha_inicio', this.form.fecha_inicio);
    fd.append('fecha_fin',    this.form.fecha_fin);
    if (this.form.hora_inicio) fd.append('hora_inicio', this.form.hora_inicio);
    if (this.form.hora_fin)    fd.append('hora_fin',    this.form.hora_fin);
    if (this.form.idlugares)   fd.append('idlugares',   this.form.idlugares);
    if (this.logoFile)         fd.append('logo',        this.logoFile);
    if (this.eliminarLogo)     fd.append('eliminar_logo', 'true');
    for (const f of this.adjuntosNuevos) fd.append('adjuntos', f);

    if (this.modoEdicion()) {
      fd.append('adjuntos_existentes', JSON.stringify(this.adjuntosActuales.map(a => a.filename)));
    }

    this.guardando.set(true); this.errorForm.set('');
    const op$: Observable<any> = this.modoEdicion()
      ? this.svc.actualizar(this.editandoId()!, fd)
      : this.svc.crear(fd);

    op$.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarForm();
        this.successMsg.set(this.modoEdicion() ? 'Actividad actualizada' : 'Actividad creada');
        setTimeout(() => this.successMsg.set(''), 3000);
        this.cargar(); this.cargarLookups();
      },
      error: (e: any) => {
        this.guardando.set(false);
        this.errorForm.set(e.message || 'Error al guardar');
      },
    });
  }

  eliminar(act: Actividad) {
    if (!confirm(`¿Eliminar "${act.nombre}"? Esta acción no se puede deshacer.`)) return;
    this.svc.eliminar(act.idactividades).subscribe({
      next: () => {
        this.successMsg.set('Actividad eliminada');
        setTimeout(() => this.successMsg.set(''), 3000);
        this.cargar();
      },
      error: (e: any) => this.error.set(e.message || 'Error al eliminar'),
    });
  }

  descargar(adj: AdjuntoInfo) {
    this.svc.descargarAdjunto(adj.filename, adj.originalname);
  }

  // ── Helpers ───────────────────────────────────────────────────
  urlLogo(filename: string)   { return this.svc.urlLogo(filename); }

  parseAdjuntos(raw: any): AdjuntoInfo[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try { return JSON.parse(raw); } catch { return []; }
  }

  formatBytes(b: number): string {
    if (b < 1024)        return b + ' B';
    if (b < 1048576)     return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  formatFecha(s: string): string {
    if (!s) return '';
    return new Date(String(s).slice(0, 10) + 'T00:00:00')
      .toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  categoriaColor(id: string | number | null): string {
    if (!id) return '#9e9e9e';
    const cat = this.categorias().find(c => c.id === +id);
    return cat?.color || '#9e9e9e';
  }

  // ── Drag & Drop ───────────────────────────────────────────────
  onDragStart(event: DragEvent, act: Actividad) {
    if (!this.permisos.puede('actividades', 'E')) {
      event.preventDefault();
      return;
    }
    event.dataTransfer!.effectAllowed = 'move';
    this.arrastrando.set(act);
  }

  onDragEnd() {
    this.arrastrando.set(null);
    this.diaArrastreSobre.set(null);
  }

  onDragOver(event: DragEvent, fecha: Date) {
    if (!this.arrastrando()) return;
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    this.diaArrastreSobre.set(fecha.getTime());
  }

  onDragLeave(event: DragEvent) {
    // Solo limpia si el cursor sale realmente de la celda (no a un hijo)
    const related = event.relatedTarget as Element | null;
    if (!related || !(event.currentTarget as Element).contains(related)) {
      this.diaArrastreSobre.set(null);
    }
  }

  onDrop(event: DragEvent, diaDestino: Date) {
    event.preventDefault();
    event.stopPropagation();
    const act = this.arrastrando();
    this.arrastrando.set(null);
    this.diaArrastreSobre.set(null);
    if (!act || this.guardandoDrag()) return;

    // Calcular nuevas fechas manteniendo la duración
    const isoInicioAnterior = String(act.fecha_inicio).slice(0, 10);
    const isoFinAnterior    = String(act.fecha_fin).slice(0, 10);
    if (diaDestino.toISOString().slice(0, 10) === isoInicioAnterior) return; // sin cambio

    const msInicio  = new Date(isoInicioAnterior + 'T00:00:00').getTime();
    const msFin     = new Date(isoFinAnterior    + 'T00:00:00').getTime();
    const duracion  = msFin - msInicio;

    const nuevaInicio = new Date(diaDestino); nuevaInicio.setHours(0, 0, 0, 0);
    const nuevaFin    = new Date(nuevaInicio.getTime() + duracion);

    const isoInicio = nuevaInicio.toISOString().slice(0, 10);
    const isoFin    = nuevaFin.toISOString().slice(0, 10);

    const fd = new FormData();
    if (act.idcategorias) fd.append('idcategorias', String(act.idcategorias));
    fd.append('nombre',       act.nombre);
    if (act.descripcion) fd.append('descripcion', act.descripcion);
    fd.append('fecha_inicio', isoInicio);
    fd.append('fecha_fin',    isoFin);
    if (act.hora_inicio) fd.append('hora_inicio', String(act.hora_inicio).slice(0, 5));
    if (act.hora_fin)    fd.append('hora_fin',    String(act.hora_fin).slice(0, 5));
    if (act.idlugares)   fd.append('idlugares',   String(act.idlugares));
    fd.append('adjuntos_existentes',
      JSON.stringify(this.parseAdjuntos(act.adjuntos).map(a => a.filename)));

    this.guardandoDrag.set(true);
    this.svc.actualizar(act.idactividades, fd).subscribe({
      next: () => {
        this.guardandoDrag.set(false);
        this.successMsg.set(`"${act.nombre}" movida al ${this.formatFecha(isoInicio)}`);
        setTimeout(() => this.successMsg.set(''), 3000);
        this.cargar();
      },
      error: (e: any) => {
        this.guardandoDrag.set(false);
        this.error.set(e.message || 'Error al mover la actividad');
      },
    });
  }
}
