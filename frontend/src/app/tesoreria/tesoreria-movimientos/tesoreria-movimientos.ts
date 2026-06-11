import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { Observable } from 'rxjs';
import {
  TesoreriaService, Tesoreria, Movimiento, TipoMovimientoLookup,
} from '../tesoreria.service';
import { PermisosService } from '../../core/services/permisos.service';
import { AuthService } from '../../core/services/auth.service';
import { confirmar } from '../../shared/confirmar.util';

interface MovRow extends Movimiento {
  saldo_acumulado: number;
}

@Component({
  selector: 'app-tesoreria-movimientos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tesoreria-movimientos.html',
  styleUrl: './tesoreria-movimientos.scss',
})
export class TesoreriaMovimientosComponent implements OnInit {
  private svc     = inject(TesoreriaService);
  public  permisos = inject(PermisosService);
  public  auth    = inject(AuthService);
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);

  idtesoreria = 0;

  // ── Data ──────────────────────────────────────────────────────
  tesoreria    = signal<Tesoreria | null>(null);
  movimientos  = signal<Movimiento[]>([]);
  saldoInicial = signal(0);
  soloLectura  = signal(false);
  cargando     = signal(false);
  error        = signal('');
  successMsg   = signal('');

  // ── Filtros ───────────────────────────────────────────────────
  desde = '';
  hasta = '';

  // ── Tipos de movimiento lookup ────────────────────────────────
  tiposMovimiento: TipoMovimientoLookup[] = [];

  // ── Formulario de movimiento ──────────────────────────────────
  mostrarForm  = signal(false);
  modoEdicion  = signal(false);
  editandoId   = signal<number | null>(null);
  guardando    = signal(false);
  errorForm    = signal('');
  form = {
    fecha:             '',
    concepto:          '',
    monto:             0,
    tipoMonto:         'ingreso' as 'ingreso' | 'egreso',
    idtipo_movimiento: '',
  };
  archivosNuevos: File[] = [];
  adjuntosActuales: { filename: string; originalname: string }[] = [];

  // ── Computed: filas con saldo acumulado ───────────────────────
  filas = computed<MovRow[]>(() => {
    let saldo = this.saldoInicial();
    return this.movimientos().map(m => {
      if (!m.anulado) {
        saldo = saldo + parseFloat(String(m.debito || 0)) - parseFloat(String(m.credito || 0));
      }
      return { ...m, saldo_acumulado: saldo };
    });
  });

  // ── Paginación ────────────────────────────────────────────────
  readonly LIMITE = 50;
  paginaActual  = signal(1);
  totalPaginas  = computed(() => Math.ceil(this.filas().length / this.LIMITE));
  filasPagina   = computed(() => {
    const start = (this.paginaActual() - 1) * this.LIMITE;
    return this.filas().slice(start, start + this.LIMITE);
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

  // ── Computed: totales ─────────────────────────────────────────
  totalIngresos = computed(() =>
    this.movimientos().filter(m => !m.anulado)
      .reduce((s, m) => s + parseFloat(String(m.debito || 0)), 0)
  );
  totalEgresos = computed(() =>
    this.movimientos().filter(m => !m.anulado)
      .reduce((s, m) => s + parseFloat(String(m.credito || 0)), 0)
  );
  saldoFinal = computed(() =>
    this.saldoInicial() + this.totalIngresos() - this.totalEgresos()
  );
  // Saldo global de la tesorería (SUM ingresos - SUM egresos de todos los movimientos, igual al tesoreria.saldo del backend)
  saldoTotal = computed(() => {
    const t = this.tesoreria();
    return t ? parseFloat(String(t.saldo || 0)) : 0;
  });

  // ── Computed: puede escribir ──────────────────────────────────
  puedeAgregar = computed(() =>
    !this.soloLectura() && this.permisos.puede('tesoreria_movimientos', 'A')
  );
  puedeEditar = computed(() =>
    !this.soloLectura() && this.permisos.puede('tesoreria_movimientos', 'E')
  );

  ngOnInit() {
    this.idtesoreria = parseInt(this.route.snapshot.params['id'], 10);
    this.initFiltros();
    this.svc.lookupTiposMovimiento().subscribe({ next: t => this.tiposMovimiento = t });
    this.cargar();
  }

  private initFiltros() {
    const now = new Date();
    const y   = now.getFullYear();
    const m   = String(now.getMonth() + 1).padStart(2, '0');
    const last = new Date(y, now.getMonth() + 1, 0).getDate();
    this.desde = `${y}-${m}-01`;
    this.hasta = `${y}-${m}-${String(last).padStart(2, '0')}`;
  }

  cargar() {
    this.cargando.set(true);
    this.error.set('');
    this.svc.listarMovimientos(this.idtesoreria, this.desde, this.hasta).subscribe({
      next: r => {
        this.tesoreria.set(r.tesoreria);
        this.saldoInicial.set(parseFloat(String(r.saldo_inicial || 0)));
        this.movimientos.set(r.movimientos.map(m => ({
          ...m,
          adjuntos: this.parseAdjuntos(m.adjuntos),
        })));
        this.soloLectura.set(!!r.solo_lectura);
        this.cargando.set(false);
      },
      error: (err: any) => {
        this.error.set(err.message || 'Error al cargar movimientos');
        this.cargando.set(false);
      },
    });
  }

  private parseAdjuntos(adj: any) {
    if (!adj) return null;
    if (typeof adj === 'string') { try { return JSON.parse(adj); } catch { return null; } }
    return adj;
  }

  // ── Formato ───────────────────────────────────────────────────
  formatQ(val: number | string | null): string {
    if (val == null) return 'Q 0.00';
    const n = parseFloat(String(val));
    return 'Q ' + (isNaN(n) ? '0.00' : n.toLocaleString('es-GT', {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }));
  }

  formatFecha(f: string | Date | null | undefined): string {
    if (!f) return '—';
    if (f instanceof Date) {
      const y  = f.getFullYear();
      const mo = String(f.getMonth() + 1).padStart(2, '0');
      const d  = String(f.getDate()).padStart(2, '0');
      return `${d}/${mo}/${y}`;
    }
    const parts = String(f).split('T')[0].split('-');
    if (parts.length < 3) return String(f);
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  // ── Navegación ────────────────────────────────────────────────
  volver() { this.router.navigate(['/tesoreria']); }

  // ── CRUD de movimientos ───────────────────────────────────────
  abrirNuevo() {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const d = String(hoy.getDate()).padStart(2, '0');
    this.form = { fecha: `${y}-${m}-${d}`, concepto: '', monto: 0, tipoMonto: 'ingreso', idtipo_movimiento: '' };
    this.archivosNuevos = [];
    this.adjuntosActuales = [];
    this.modoEdicion.set(false);
    this.editandoId.set(null);
    this.errorForm.set('');
    this.mostrarForm.set(true);
  }

  abrirEditar(m: Movimiento) {
    const adj = m.adjuntos as any;
    this.adjuntosActuales = Array.isArray(adj) ? adj : [];
    const debitoVal  = parseFloat(String(m.debito  || 0));
    const creditoVal = parseFloat(String(m.credito || 0));
    this.form = {
      fecha:             (() => {
                           const f: any = m.fecha;
                           return f instanceof Date
                             ? f.toISOString().split('T')[0]
                             : (String(f || '')).split('T')[0];
                         })(),
      concepto:          m.concepto,
      monto:             debitoVal > 0 ? debitoVal : creditoVal,
      tipoMonto:         debitoVal > 0 ? 'ingreso' : 'egreso',
      idtipo_movimiento: m.idtipo_movimiento ? String(m.idtipo_movimiento) : '',
    };
    this.archivosNuevos = [];
    this.modoEdicion.set(true);
    this.editandoId.set(m.idtesoreria_movimientos);
    this.errorForm.set('');
    this.mostrarForm.set(true);
  }

  cerrarForm() { this.mostrarForm.set(false); }

  onArchivosCambian(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.archivosNuevos = Array.from(input.files);
    }
  }

  guardar() {
    if (!this.form.fecha)    { this.errorForm.set('La fecha es requerida'); return; }
    if (!this.form.concepto.trim()) { this.errorForm.set('El concepto es requerido'); return; }
    if (this.form.concepto.length > 145) { this.errorForm.set('El concepto supera los 145 caracteres'); return; }
    if (!this.form.monto || this.form.monto <= 0) {
      this.errorForm.set('El monto debe ser mayor a 0'); return;
    }

    const fd = new FormData();
    fd.append('fecha',    this.form.fecha);
    fd.append('concepto', this.form.concepto.trim());
    fd.append('credito',  this.form.tipoMonto === 'egreso'  ? String(this.form.monto) : '0');
    fd.append('debito',   this.form.tipoMonto === 'ingreso' ? String(this.form.monto) : '0');
    if (this.form.idtipo_movimiento) {
      fd.append('idtipo_movimiento', this.form.idtipo_movimiento);
    }
    for (const f of this.archivosNuevos) {
      fd.append('adjuntos', f);
    }

    this.guardando.set(true);
    this.errorForm.set('');

    const obs$: Observable<any> = this.modoEdicion()
      ? this.svc.actualizarMovimiento(this.idtesoreria, this.editandoId()!, fd)
      : this.svc.crearMovimiento(this.idtesoreria, fd);

    obs$.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarForm();
        this.mostrarExito(this.modoEdicion() ? 'Movimiento actualizado' : 'Movimiento registrado');
        this.cargar();
      },
      error: (err: any) => {
        this.guardando.set(false);
        this.errorForm.set(err.message || 'Error al guardar');
      },
    });
  }

  async anular(m: Movimiento) {
    if (!await confirmar(
        `¿Anular el movimiento <b>"${m.concepto}"</b>?<br>Esta acción no se puede deshacer.`,
        { peligro: true, btnConfirmar: 'Sí, anular' })) return;
    this.svc.anularMovimiento(this.idtesoreria, m.idtesoreria_movimientos).subscribe({
      next: () => { this.mostrarExito('Movimiento anulado'); this.cargar(); },
      error: (err: any) => this.error.set(err.message || 'Error al anular'),
    });
  }

  urlAdjunto(filename: string): string { return this.svc.urlAdjunto(filename); }

  // ── Exportar Excel ────────────────────────────────────────────
  exportarExcel() {
    const teso = this.tesoreria();
    const filas = this.filas();
    const nombre = teso?.nombre || 'tesoreria';

    const data: any[][] = [
      ['Tesorería:', nombre],
      ['Período:', `${this.desde} al ${this.hasta}`],
      [],
      ['Fecha', 'Concepto', 'Tipo de movimiento', 'Ingresos (Q)', 'Egresos (Q)', 'Saldo acumulado (Q)', 'Estado'],
      ['-', 'Saldo Inicial', '', '', '', this.saldoInicial(), ''],
      ...filas.map(m => [
        this.formatFecha(m.fecha),
        m.concepto,
        m.tipo_movimiento || '',
        m.anulado ? '' : parseFloat(String(m.debito || 0)),
        m.anulado ? '' : parseFloat(String(m.credito || 0)),
        m.saldo_acumulado,
        m.anulado ? 'Anulado' : 'Activo',
      ]),
      [],
      ['', '', 'Totales', this.totalIngresos(), this.totalEgresos(), this.saldoFinal(), ''],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
    XLSX.writeFile(wb, `movimientos_${nombre.replace(/\s+/g, '_')}_${this.desde}.xlsx`);
  }

  private mostrarExito(msg: string) {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(''), 3000);
  }

  getAdjuntos(m: Movimiento): { filename: string; originalname: string }[] {
    const adj = m.adjuntos as any;
    return Array.isArray(adj) ? adj : [];
  }
}
