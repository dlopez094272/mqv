import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TesoreriaService, Tesoreria, Movimiento } from '../tesoreria.service';

interface FilaConSaldo extends Movimiento { saldo_acumulado: number; }
interface RubroItem   { tipo: string; ingresos: number; egresos: number; }
interface MesItem     { ym: string; label: string; ingresos: number; egresos: number; neto: number; }

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

@Component({
  selector: 'app-tesoreria-reporte',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tesoreria-reporte.html',
  styleUrl: './tesoreria-reporte.scss',
})
export class TesoreriaReporteComponent implements OnInit {
  private svc   = inject(TesoreriaService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  idtesoreria    = 0;
  desde          = '';
  hasta          = '';

  tesoreria    = signal<Tesoreria | null>(null);
  movimientos  = signal<Movimiento[]>([]);
  saldoInicial = signal(0);
  cargando     = signal(true);
  error        = signal('');

  fechaGeneracion = new Date();

  // ── Activos (no anulados) ─────────────────────────────────────
  activos = computed(() => this.movimientos().filter(m => !m.anulado));

  // ── Filas con saldo acumulado ─────────────────────────────────
  filasConSaldo = computed<FilaConSaldo[]>(() => {
    let saldo = this.saldoInicial();
    return this.movimientos().map(m => {
      if (!m.anulado) {
        saldo += parseFloat(String(m.debito  || 0))
               - parseFloat(String(m.credito || 0));
      }
      return { ...m, saldo_acumulado: saldo };
    });
  });

  // ── Resumen por tipo de movimiento ────────────────────────────
  private rubros = computed<RubroItem[]>(() => {
    const map = new Map<string, RubroItem>();
    for (const m of this.activos()) {
      const tipo = m.tipo_movimiento || 'Sin tipo';
      const curr = map.get(tipo) ?? { tipo, ingresos: 0, egresos: 0 };
      curr.ingresos += parseFloat(String(m.debito  || 0));
      curr.egresos  += parseFloat(String(m.credito || 0));
      map.set(tipo, curr);
    }
    return Array.from(map.values());
  });

  rubrosIngresos = computed(() =>
    this.rubros().filter(r => r.ingresos > 0).sort((a, b) => b.ingresos - a.ingresos)
  );
  rubrosEgresos = computed(() =>
    this.rubros().filter(r => r.egresos > 0).sort((a, b) => b.egresos - a.egresos)
  );

  // ── Resumen por mes ────────────────────────────────────────────
  resumenMeses = computed<MesItem[]>(() => {
    const map = new Map<string, { ingresos: number; egresos: number }>();
    for (const m of this.activos()) {
      const ym   = (m.fecha || '').substring(0, 7);
      const curr = map.get(ym) ?? { ingresos: 0, egresos: 0 };
      curr.ingresos += parseFloat(String(m.debito  || 0));
      curr.egresos  += parseFloat(String(m.credito || 0));
      map.set(ym, curr);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, v]) => ({
        ym,
        label:    this.labelMes(ym),
        ingresos: v.ingresos,
        egresos:  v.egresos,
        neto:     v.ingresos - v.egresos,
      }));
  });

  // ── Totales ───────────────────────────────────────────────────
  totalIngresos = computed(() =>
    this.activos().reduce((s, m) => s + parseFloat(String(m.debito  || 0)), 0)
  );
  totalEgresos = computed(() =>
    this.activos().reduce((s, m) => s + parseFloat(String(m.credito || 0)), 0)
  );
  saldoFinal = computed(() =>
    this.saldoInicial() + this.totalIngresos() - this.totalEgresos()
  );

  // ── Init ──────────────────────────────────────────────────────
  ngOnInit() {
    this.idtesoreria = parseInt(this.route.snapshot.params['id'], 10);
    this.desde       = this.route.snapshot.queryParams['desde'] || '';
    this.hasta       = this.route.snapshot.queryParams['hasta'] || '';
    this.cargar();
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
          adjuntos: null, // no se necesita en el reporte
        })));
        this.cargando.set(false);
      },
      error: (err: any) => {
        this.error.set(err.message || 'Error al cargar datos');
        this.cargando.set(false);
      },
    });
  }

  imprimir() { window.print(); }
  cerrar()   { window.close(); }

  // ── Helpers de formato ─────────────────────────────────────────
  formatQ(val: number | string | null): string {
    if (val == null) return 'Q 0.00';
    const n = parseFloat(String(val));
    return 'Q ' + (isNaN(n) ? '0.00' : n.toLocaleString('es-GT', {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }));
  }

  formatFecha(f: string | null | undefined): string {
    if (!f) return '—';
    const clean = (f || '').split('T')[0];
    const [y, m, d] = clean.split('-');
    if (!y || !m || !d) return f;
    return `${d}/${m}/${y}`;
  }

  formatFechaHora(date: Date): string {
    const d  = String(date.getDate()).padStart(2, '0');
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const y  = date.getFullYear();
    const h  = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    return `${d}/${mo}/${y} ${h}:${mi}`;
  }

  labelMes(ym: string): string {
    const [y, m] = ym.split('-');
    return `${MESES[parseInt(m, 10) - 1]} ${y}`;
  }
}
