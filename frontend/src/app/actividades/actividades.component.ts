import { Component, OnInit, signal, computed, inject, NgZone } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { FormsModule }    from '@angular/forms';
import { HttpClient }     from '@angular/common/http';
import { Observable }     from 'rxjs';
import {
  ActividadesService, Actividad, AdjuntoInfo,
  CategoriaLookup, LugarLookup, GrupoLookup,
  AsistenciaPersona, Visitante, AsistenciaResumen,
  ActividadTesoreriaResumen,
} from './actividades.service';
import { TesoreriaService, Tesoreria, TipoMovimientoLookup } from '../tesoreria/tesoreria.service';
import { PermisosService } from '../core/services/permisos.service';
import { environment }     from '../../environments/environment';
import { confirmar }       from '../shared/confirmar.util';
import { CamaraAsistenciaComponent } from './camara-asistencia.component';

interface FilaMovimientoTesoreria {
  tipo:              'ingreso' | 'egreso';
  concepto:          string;
  monto:             number;
  idtipo_movimiento: string;
  fecha:             string;
}

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

interface ReporteActividadDetalle {
  idactividades:    number;
  nombre:           string;
  logo:             string | null;
  fecha_inicio:     string;
  fecha_fin:        string;
  hora_inicio:      string | null;
  hora_fin:         string | null;
  categoria:        string | null;
  categoria_color:  string | null;
  lugar:            string | null;
  total_asistentes: number;
  total_personas:   number;
  total_visitantes: number;
  grupos:           { idgrupos: number; grupo: string; total_asistentes: number }[];
  por_edad:         { bebes: number; ninos: number; adolescentes: number; jovenes: number; adultos: number; adultos_mayores: number; sin_fecha: number };
  por_genero:       { hombres: number; mujeres: number; sin_dato: number };
  asistentes:       { idpersonas: number; nombre_completo: string; grupos_nombres: string | null }[];
  visitantes:       { idactividades_asistentes: number; nombre_completo: string; telefono: string | null; comentarios: string | null }[];
  tesoreria?: {
    movimientos: { idtesoreria_movimientos: number; tesoreria: string; fecha: string; concepto: string;
                    credito: number; debito: number; tipo_movimiento: string | null }[];
    totales: { ingresos: number; egresos: number; saldo: number };
  };
}

@Component({
  selector:    'app-actividades',
  standalone:  true,
  imports:     [CommonModule, FormsModule, CamaraAsistenciaComponent],
  templateUrl: './actividades.component.html',
  styleUrl:    './actividades.component.scss',
})
export class ActividadesComponent implements OnInit {
  private svc    = inject(ActividadesService);
  private tesoreriaSvc = inject(TesoreriaService);
  private http   = inject(HttpClient);
  public permisos = inject(PermisosService);

  readonly DAY_WIDTH = 32;

  // ── UI state ─────────────────────────────────────────────────
  vista      = signal<'calendar' | 'gantt' | 'tabla'>('calendar');
  cargando   = signal(false);
  error      = signal('');

  // ── Drag & Drop (calendario) ──────────────────────────────────
  arrastrando      = signal<Actividad | null>(null);
  diaArrastreSobre = signal<number | null>(null);
  guardandoDrag    = signal(false);
  successMsg = signal('');

  // ── Data ─────────────────────────────────────────────────────
  actividades = signal<Actividad[]>([]);
  categorias  = signal<CategoriaLookup[]>([]);
  lugares     = signal<LugarLookup[]>([]);
  grupos      = signal<GrupoLookup[]>([]);

  // ── Paginación tabla ─────────────────────────────────────────
  readonly LIMITE_TABLA = 25;
  tabPagina     = signal(1);
  tabTotalPag   = computed(() => Math.ceil(this.actividades().length / this.LIMITE_TABLA));
  tabPaginados  = computed(() => {
    const start = (this.tabPagina() - 1) * this.LIMITE_TABLA;
    return this.actividades().slice(start, start + this.LIMITE_TABLA);
  });
  tabPaginas    = computed(() => {
    const total = this.tabTotalPag(); const actual = this.tabPagina();
    if (total <= 1) return [];
    const rango: (number | '...')[] = [];
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= actual - 2 && i <= actual + 2)) rango.push(i);
      else if (rango[rango.length - 1] !== '...') rango.push('...');
    }
    return rango;
  });
  tabIrPagina(p: number | '...') {
    if (p === '...' || (p as number) < 1 || (p as number) > this.tabTotalPag()) return;
    this.tabPagina.set(p as number);
  }

  // ── Grupos involucrados ────────────────────────────────────────
  gruposSeleccionados    = signal<number[]>([]);
  todosGruposSeleccionados = computed(() => {
    const total = this.grupos().length;
    return total > 0 && this.gruposSeleccionados().length === total;
  });

  // ── Calendar ─────────────────────────────────────────────────
  mesActual = signal(new Date());

  // ── Form actividad ────────────────────────────────────────────
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

  // ── Asistencia ────────────────────────────────────────────────
  mostrarCamara        = signal(false);
  cargandoAsistencia   = signal(false);
  asistenciaData       = signal<AsistenciaResumen | null>(null);
  busquedaAsistencia   = signal('');
  mostrarFormVisitante = signal(false);
  guardandoVisitante    = signal(false);
  errorAsistencia       = signal('');
  visitanteExpandido    = signal<number | null>(null);
  gruposDisponiblesExpandidos = signal<Set<string>>(new Set());

  formVisitante = { nombre_completo: '', telefono: '', comentarios: '' };

  // ── Tesorería de actividad ──────────────────────────────────────
  cargandoTesoreria     = signal(false);
  guardandoTesoreria    = signal(false);
  errorTesoreria        = signal('');
  tesoreriaResumen      = signal<ActividadTesoreriaResumen | null>(null);
  tesoreriasAccesibles  = signal<Tesoreria[]>([]);
  tiposMovimiento       = signal<TipoMovimientoLookup[]>([]);
  formTesoreriaIdtesoreria = '';
  filasTesoreria: FilaMovimientoTesoreria[] = [];

  puedeOfrecerTesoreria = computed(() =>
    this.permisos.puede('tesoreria', 'S') && this.tesoreriasAccesibles().length > 0
  );
  puedeAgregarMovimientoTesoreria = computed(() => this.permisos.puede('tesoreria_movimientos', 'A'));

  // ── Gestión unificada de actividad (fichas: datos / asistencia / tesorería) ──
  mostrarGestion   = signal(false);
  tabGestion       = signal<'datos' | 'asistencia' | 'tesoreria'>('datos');
  actividadGestion = signal<Actividad | null>(null);

  anchoGestion = computed(() => {
    switch (this.tabGestion()) {
      case 'asistencia': return '960px';
      case 'tesoreria':  return '760px';
      default:           return '560px';
    }
  });

  // ── Menú contextual ───────────────────────────────────────────
  menuAct = signal<{ act: Actividad; x: number; y: number } | null>(null);

  private ngZone = inject(NgZone);

  // ── Reporte de actividad individual ──────────────────────────
  mostrarReporte  = signal(false);
  reporteAct      = signal<Actividad | null>(null);
  reporteData     = signal<ReporteActividadDetalle | null>(null);
  cargandoReporte = signal(false);
  generandoPdf    = signal(false);

  // Drag & Drop dentro del modal de asistencia
  arrastandoPersona    = signal<AsistenciaPersona | null>(null);
  sobreZonaAsistentes  = signal(false);
  sobreZonaDisponibles = signal(false);

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

  // ── Computed: gantt ───────────────────────────────────────────
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

  // ── Computed: asistencia ──────────────────────────────────────
  personasFiltradas = computed<AsistenciaPersona[]>(() => {
    const data = this.asistenciaData();
    if (!data) return [];
    const q = this.busquedaAsistencia().toLowerCase().trim();
    if (!q) return data.personas;
    return data.personas.filter(p => p.nombre_completo.toLowerCase().includes(q));
  });

  personasAsistentes = computed<AsistenciaPersona[]>(() =>
    this.personasFiltradas().filter(p => p.asiste)
  );

  // ── Paginación asistentes confirmados ──────────────────────────
  readonly LIMITE_ASISTENTES = 30;
  asistPagina    = signal(1);
  asistTotalPag  = computed(() => Math.max(1, Math.ceil(this.personasAsistentes().length / this.LIMITE_ASISTENTES)));
  asistPaginados = computed<AsistenciaPersona[]>(() => {
    const pag   = Math.min(this.asistPagina(), this.asistTotalPag());
    const start = (pag - 1) * this.LIMITE_ASISTENTES;
    return this.personasAsistentes().slice(start, start + this.LIMITE_ASISTENTES);
  });
  asistPaginas = computed(() => {
    const total = this.asistTotalPag(); const actual = Math.min(this.asistPagina(), total);
    if (total <= 1) return [];
    const rango: (number | '...')[] = [];
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= actual - 2 && i <= actual + 2)) rango.push(i);
      else if (rango[rango.length - 1] !== '...') rango.push('...');
    }
    return rango;
  });
  asistIrPagina(p: number | '...') {
    if (p === '...' || (p as number) < 1 || (p as number) > this.asistTotalPag()) return;
    this.asistPagina.set(p as number);
  }

  personasDisponibles = computed<AsistenciaPersona[]>(() =>
    this.personasFiltradas().filter(p => !p.asiste)
  );

  personasDisponiblesPorGrupo = computed<{ grupo: string; personas: AsistenciaPersona[] }[]>(() => {
    const mapa = new Map<string, AsistenciaPersona[]>();
    for (const p of this.personasDisponibles()) {
      const grupos = p.grupos_nombres
        ? p.grupos_nombres.split(',').map(g => g.trim()).filter(Boolean)
        : ['Sin grupo'];
      for (const g of grupos) {
        const arr = mapa.get(g);
        if (arr) arr.push(p); else mapa.set(g, [p]);
      }
    }
    return Array.from(mapa.entries())
      .map(([grupo, personas]) => ({ grupo, personas }))
      .sort((a, b) => a.grupo === 'Sin grupo' ? 1 : b.grupo === 'Sin grupo' ? -1
        : a.grupo.localeCompare(b.grupo, 'es'));
  });

  buscarAsistencia(valor: string) {
    this.busquedaAsistencia.set(valor);
    this.asistPagina.set(1);
  }

  grupoDisponibleExpandido(grupo: string): boolean {
    return !!this.busquedaAsistencia() || this.gruposDisponiblesExpandidos().has(grupo);
  }

  toggleGrupoDisponible(grupo: string) {
    const set = new Set(this.gruposDisponiblesExpandidos());
    if (set.has(grupo)) set.delete(grupo); else set.add(grupo);
    this.gruposDisponiblesExpandidos.set(set);
  }

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
    this.svc.listarGruposDisponibles()
      .subscribe({ next: d => this.grupos.set(d) });
    if (this.permisos.puede('tesoreria', 'S')) {
      this.tesoreriaSvc.listar().subscribe({ next: d => this.tesoreriasAccesibles.set(d) });
    }
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

  // ── Formulario actividad ──────────────────────────────────────
  private _resetForm(fechaInicio: string, fechaFin: string) {
    this.form = { idcategorias: '', nombre: '', descripcion: '',
                  fecha_inicio: fechaInicio, fecha_fin: fechaFin,
                  hora_inicio: '', hora_fin: '', idlugares: '' };
    this.logoFile = null; this.logoPreview = null;
    this.logoActual = null; this.eliminarLogo = false;
    this.adjuntosNuevos = []; this.adjuntosActuales = [];
    this.gruposSeleccionados.set([]);
    this.errorForm.set('');
  }

  private _poblarForm(act: Actividad) {
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
    this.gruposSeleccionados.set([]);
    this.errorForm.set('');
    // Cargar grupos previamente asignados
    this.svc.listarGruposActividad(act.idactividades).subscribe({
      next: ids => this.gruposSeleccionados.set(ids),
    });
  }

  toggleGrupo(id: number) {
    const cur = this.gruposSeleccionados();
    this.gruposSeleccionados.set(
      cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]
    );
  }

  toggleTodosGrupos() {
    this.gruposSeleccionados.set(
      this.todosGruposSeleccionados() ? [] : this.grupos().map(g => g.id)
    );
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
    fd.append('grupos', JSON.stringify(this.gruposSeleccionados()));

    if (this.modoEdicion()) {
      fd.append('adjuntos_existentes', JSON.stringify(this.adjuntosActuales.map(a => a.filename)));
    }

    this.guardando.set(true); this.errorForm.set('');
    const fueCreacion = !this.modoEdicion();
    const op$: Observable<any> = fueCreacion
      ? this.svc.crear(fd)
      : this.svc.actualizar(this.editandoId()!, fd);

    op$.subscribe({
      next: (res: any) => {
        this.guardando.set(false);
        this.successMsg.set(fueCreacion ? 'Actividad creada' : 'Actividad actualizada');
        setTimeout(() => this.successMsg.set(''), 3000);
        this.cargar(); this.cargarLookups();
        if (fueCreacion && res?.id) {
          this.svc.obtener(res.id).subscribe({
            next: act => {
              this.actividadGestion.set(act);
              this.modoEdicion.set(true); this.editandoId.set(act.idactividades);
              this.seleccionarTab('asistencia');
            },
          });
        } else if (this.editandoId()) {
          this.svc.obtener(this.editandoId()!).subscribe({ next: act => this.actividadGestion.set(act) });
        }
      },
      error: (e: any) => {
        this.guardando.set(false);
        this.errorForm.set(e.message || 'Error al guardar');
      },
    });
  }

  async eliminar(act: Actividad) {
    if (!await confirmar(`¿Eliminar <b>"${act.nombre}"</b>?<br>Esta acción no se puede deshacer.`, { peligro: true })) return;
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

  // ── Gestión unificada de actividad (fichas: datos / asistencia / tesorería) ──
  abrirNuevo() {
    this.abrirGestion('datos', null);
  }

  abrirNuevoEnFecha(fecha: Date) {
    if (this.mostrarGestion()) return;
    this.abrirGestion('datos', null);
    const iso = fecha.toISOString().slice(0, 10);
    this.form.fecha_inicio = iso; this.form.fecha_fin = iso;
  }

  abrirGestion(tab: 'datos' | 'asistencia' | 'tesoreria', act: Actividad | null, event?: Event) {
    event?.stopPropagation();
    this.mostrarGestion.set(true);
    this.actividadGestion.set(act);
    this.asistenciaData.set(null);
    this.busquedaAsistencia.set('');
    this.asistPagina.set(1);
    this.mostrarFormVisitante.set(false);
    this.formVisitante = { nombre_completo: '', telefono: '', comentarios: '' };
    this.errorAsistencia.set('');
    this.visitanteExpandido.set(null);
    this.gruposDisponiblesExpandidos.set(new Set());
    this.errorTesoreria.set('');
    this.tesoreriaResumen.set(null);
    if (act) {
      this._poblarForm(act);
      this._resetFilasTesoreria(act);
      this.modoEdicion.set(true); this.editandoId.set(act.idactividades);
    } else {
      this._resetForm('', '');
      this.modoEdicion.set(false); this.editandoId.set(null);
    }
    this.tabGestion.set('datos');
    this.seleccionarTab(tab);
  }

  seleccionarTab(tab: 'datos' | 'asistencia' | 'tesoreria') {
    const act = this.actividadGestion();
    if (tab !== 'datos' && !act) return;
    this.tabGestion.set(tab);
    if (!act) return;
    if (tab === 'asistencia' && this.asistenciaData() === null) {
      this._cargarAsistencia(act.idactividades);
    }
    if (tab === 'tesoreria' && this.tesoreriaResumen() === null) {
      this.cargandoTesoreria.set(true);
      this.svc.listarTesoreria(act.idactividades).subscribe({
        next:  d => { this.tesoreriaResumen.set(d); this.cargandoTesoreria.set(false); },
        error: (e: any) => {
          this.errorTesoreria.set(e.message || 'Error al cargar la tesorería de la actividad');
          this.cargandoTesoreria.set(false);
        },
      });
      if (!this.tiposMovimiento().length) {
        this.tesoreriaSvc.lookupTiposMovimiento().subscribe({ next: d => this.tiposMovimiento.set(d) });
      }
      if (!this.tesoreriasAccesibles().length) {
        this.tesoreriaSvc.listar().subscribe({ next: d => this.tesoreriasAccesibles.set(d) });
      }
    }
  }

  cerrarGestion() {
    this.mostrarGestion.set(false);
    this.mostrarCamara.set(false);
    this.actividadGestion.set(null);
    this.asistenciaData.set(null);
    this.busquedaAsistencia.set('');
    this.mostrarFormVisitante.set(false);
    this.visitanteExpandido.set(null);
    this.tesoreriaResumen.set(null);
    this.logoPreview = null; this.adjuntosNuevos = [];
  }

  private _resetFilasTesoreria(act: Actividad) {
    const accesibles = this.tesoreriasAccesibles();
    this.formTesoreriaIdtesoreria = accesibles.length === 1 ? String(accesibles[0].idtesoreria) : '';
    const fecha = String(act.fecha_inicio).slice(0, 10);
    this.filasTesoreria = [{ tipo: 'ingreso', concepto: '', monto: 0, idtipo_movimiento: '', fecha }];
  }

  agregarFilaTesoreria() {
    const act = this.actividadGestion();
    const fecha = act ? String(act.fecha_inicio).slice(0, 10) : '';
    this.filasTesoreria = [
      ...this.filasTesoreria,
      { tipo: 'ingreso', concepto: '', monto: 0, idtipo_movimiento: '', fecha },
    ];
  }

  quitarFilaTesoreria(i: number) {
    if (this.filasTesoreria.length <= 1) return;
    this.filasTesoreria = this.filasTesoreria.filter((_, idx) => idx !== i);
  }

  guardarTesoreria() {
    const act = this.actividadGestion();
    if (!act) return;
    if (!this.formTesoreriaIdtesoreria) { this.errorTesoreria.set('Selecciona una tesorería'); return; }
    for (const f of this.filasTesoreria) {
      if (!f.concepto.trim())        { this.errorTesoreria.set('Todos los movimientos requieren un concepto'); return; }
      if (!f.monto || f.monto <= 0)  { this.errorTesoreria.set('El monto debe ser mayor a 0'); return; }
    }

    this.guardandoTesoreria.set(true);
    this.errorTesoreria.set('');
    const movimientos = this.filasTesoreria.map(f => ({
      tipo:              f.tipo,
      concepto:          f.concepto.trim(),
      monto:             f.monto,
      idtipo_movimiento: f.idtipo_movimiento || undefined,
      fecha:             f.fecha || undefined,
    }));

    this.svc.registrarTesoreria(act.idactividades, +this.formTesoreriaIdtesoreria, movimientos).subscribe({
      next: () => {
        this.guardandoTesoreria.set(false);
        this._resetFilasTesoreria(act);
        this.successMsg.set('Movimiento(s) de tesorería registrados');
        setTimeout(() => this.successMsg.set(''), 3000);
        this.svc.listarTesoreria(act.idactividades).subscribe({ next: d => this.tesoreriaResumen.set(d) });
      },
      error: (e: any) => {
        this.guardandoTesoreria.set(false);
        this.errorTesoreria.set(e.message || 'Error al guardar la tesorería');
      },
    });
  }

  formatQ(val: number | string | null | undefined): string {
    if (val == null) return 'Q 0.00';
    const n = parseFloat(String(val));
    return 'Q ' + (isNaN(n) ? '0.00' : n.toLocaleString('es-GT', {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }));
  }

  // ── Menú contextual ──────────────────────────────────────────
  abrirMenu(event: MouseEvent, act: Actividad) {
    event.stopPropagation();
    const mw = 195, mh = 225;
    const x = Math.min(event.clientX, window.innerWidth  - mw - 8);
    const y = Math.min(event.clientY, window.innerHeight - mh - 8);
    this.menuAct.set({ act, x, y });
  }

  cerrarMenu() { this.menuAct.set(null); }

  menuEditar()     { const a = this.menuAct()!.act; this.cerrarMenu(); this.abrirGestion('datos', a); }
  menuAsistencia() { const a = this.menuAct()!.act; this.cerrarMenu(); this.abrirGestion('asistencia', a); }
  menuTesoreria()  { const a = this.menuAct()!.act; this.cerrarMenu(); this.abrirGestion('tesoreria', a); }
  menuEliminar()   { const a = this.menuAct()!.act; this.cerrarMenu(); this.eliminar(a); }

  // ── Reporte de actividad ─────────────────────────────────────
  abrirReporte(act: Actividad) {
    this.cerrarMenu();
    this.reporteAct.set(act);
    this.reporteData.set(null);
    this.mostrarReporte.set(true);
    this.cargandoReporte.set(true);
    this.http.get<ReporteActividadDetalle>(`${environment.apiUrl}/reportes/actividades/${act.idactividades}`)
      .subscribe({
        next:  d => { this.reporteData.set(d); this.cargandoReporte.set(false); },
        error: () => { this.cargandoReporte.set(false); },
      });
  }

  cerrarReporte() { this.mostrarReporte.set(false); }

  imprimirReporte() { window.print(); }

  async descargarPDFReporte() {
    const act = this.reporteAct();
    if (!act) return;
    this.generandoPdf.set(true);

    const contenedor = document.getElementById('reporte-act-contenido')!;
    // Mostrar el encabezado de impresión en el PDF
    const printHeader = contenedor.querySelector<HTMLElement>('.reporte-print-header');
    if (printHeader) printHeader.style.setProperty('display', 'flex', 'important');

    try {
      await this.ngZone.runOutsideAngular(async () => {
        const html2pdf = ((await import('html2pdf.js')) as any).default;
        await html2pdf().set({
          margin:      [14, 18, 14, 18],
          filename:    `reporte-${act.nombre.replace(/\s+/g, '-').toLowerCase()}.pdf`,
          image:       { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
        }).from(contenedor).save();
      });
    } finally {
      if (printHeader) printHeader.style.removeProperty('display');
      this.generandoPdf.set(false);
    }
  }

  toggleCamara() {
    this.mostrarCamara.update(v => !v);
  }

  onAsistenciaActualizadaPorCamara() {
    const act = this.actividadGestion();
    if (act) this._cargarAsistencia(act.idactividades);
  }

  toggleDetalleVisitante(id: number) {
    this.visitanteExpandido.set(this.visitanteExpandido() === id ? null : id);
  }

  private _cargarAsistencia(idActividad: number) {
    this.cargandoAsistencia.set(true);
    this.errorAsistencia.set('');
    this.svc.listarAsistencia(idActividad).subscribe({
      next:  d => { this.asistenciaData.set(d); this.cargandoAsistencia.set(false); },
      error: (e: any) => {
        this.errorAsistencia.set(e.message || 'Error al cargar asistencia');
        this.cargandoAsistencia.set(false);
      },
    });
  }

  toggleAsistente(persona: AsistenciaPersona) {
    const act = this.actividadGestion();
    if (!act) return;

    if (persona.asiste) {
      if (!this.permisos.puede('actividades_asistentes', 'D')) return;
      this.svc.eliminarAsistente(act.idactividades, persona.idactividades_asistentes!).subscribe({
        next:  () => this._cargarAsistencia(act.idactividades),
        error: (e: any) => this.errorAsistencia.set(e.message || 'Error al quitar asistente'),
      });
    } else {
      if (!this.permisos.puede('actividades_asistentes', 'A')) return;
      this.svc.agregarAsistente(act.idactividades, { idpersonas: persona.idpersonas }).subscribe({
        next:  () => this._cargarAsistencia(act.idactividades),
        error: (e: any) => this.errorAsistencia.set(e.message || 'Error al agregar asistente'),
      });
    }
  }

  agregarVisitante() {
    const act = this.actividadGestion();
    if (!act || !this.formVisitante.nombre_completo.trim()) return;
    this.guardandoVisitante.set(true);
    this.svc.agregarAsistente(act.idactividades, {
      nombre_completo: this.formVisitante.nombre_completo.trim(),
      telefono:        this.formVisitante.telefono || undefined,
      comentarios:     this.formVisitante.comentarios || undefined,
    }).subscribe({
      next: () => {
        this.guardandoVisitante.set(false);
        this.formVisitante = { nombre_completo: '', telefono: '', comentarios: '' };
        this.mostrarFormVisitante.set(false);
        this._cargarAsistencia(act.idactividades);
      },
      error: (e: any) => {
        this.guardandoVisitante.set(false);
        this.errorAsistencia.set(e.message || 'Error al agregar visitante');
      },
    });
  }

  eliminarVisitante(idAsistente: number) {
    const act = this.actividadGestion();
    if (!act) return;
    this.svc.eliminarAsistente(act.idactividades, idAsistente).subscribe({
      next:  () => this._cargarAsistencia(act.idactividades),
      error: (e: any) => this.errorAsistencia.set(e.message || 'Error al eliminar visitante'),
    });
  }

  // Drag & Drop dentro del modal de asistencia
  onPersonaDragStart(event: DragEvent, p: AsistenciaPersona) {
    event.dataTransfer!.effectAllowed = 'move';
    this.arrastandoPersona.set(p);
  }

  onPersonaDragEnd() {
    this.arrastandoPersona.set(null);
    this.sobreZonaAsistentes.set(false);
    this.sobreZonaDisponibles.set(false);
  }

  onZonaDragOver(event: DragEvent, zona: 'asistentes' | 'disponibles') {
    if (!this.arrastandoPersona()) return;
    event.preventDefault();
    this.sobreZonaAsistentes.set(zona === 'asistentes');
    this.sobreZonaDisponibles.set(zona === 'disponibles');
  }

  onZonaDrop(event: DragEvent, zona: 'asistentes' | 'disponibles') {
    event.preventDefault();
    const p = this.arrastandoPersona();
    this.arrastandoPersona.set(null);
    this.sobreZonaAsistentes.set(false);
    this.sobreZonaDisponibles.set(false);
    if (!p) return;
    // Solo actuar si se está moviendo a la zona contraria
    if (zona === 'asistentes' && !p.asiste) this.toggleAsistente(p);
    if (zona === 'disponibles' && p.asiste)  this.toggleAsistente(p);
  }

  inicialAsistencia(nombre: string): string {
    return nombre?.charAt(0)?.toUpperCase() || '?';
  }

  // ── Helpers ───────────────────────────────────────────────────
  urlLogo(filename: string)        { return this.svc.urlLogo(filename); }
  urlFotoPersona(filename: string) { return this.svc.urlFotoPersona(filename); }

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

  // ── Drag & Drop (calendario) ──────────────────────────────────
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

    const isoInicioAnterior = String(act.fecha_inicio).slice(0, 10);
    const isoFinAnterior    = String(act.fecha_fin).slice(0, 10);
    if (diaDestino.toISOString().slice(0, 10) === isoInicioAnterior) return;

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
    // No enviar grupos en drag&drop para no borrar los existentes; omitir el campo
    // (el backend solo sincroniza si grupos !== undefined)

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
