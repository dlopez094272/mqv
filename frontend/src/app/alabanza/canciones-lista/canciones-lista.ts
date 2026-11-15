import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AlabanzaService, CancionResumen, ETIQUETA_TIPO, EstadisticasAlabanza, TipoCancion } from '../alabanza.service';
import { PermisosService } from '../../core/services/permisos.service';
import { confirmar } from '../../shared/confirmar.util';

const normalizar = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

@Component({
  selector: 'app-canciones-lista',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './canciones-lista.html',
  styleUrl: './canciones-lista.scss',
})
export class CancionesListaComponent implements OnInit {
  private svc    = inject(AlabanzaService);
  private router = inject(Router);
  permisos       = inject(PermisosService);

  canciones = signal<CancionResumen[]>([]);
  stats     = signal<EstadisticasAlabanza | null>(null);
  cargando  = signal(true);
  error     = signal('');
  exito     = signal('');
  busqueda  = signal('');
  filtroTipo = signal<'' | TipoCancion>('');
  filtroRecurso = signal<'' | 'acordes' | 'partitura' | 'audio'>('');
  readonly etiquetaTipo = ETIQUETA_TIPO;

  filtradas = computed(() => {
    const q = normalizar(this.busqueda().trim());
    const t = this.filtroTipo();
    const r = this.filtroRecurso();
    return this.canciones().filter(c =>
      (!t || c.tipo === t) &&
      (!r || (r === 'acordes' ? c.tiene_acordes : r === 'partitura' ? (c.tiene_partitura || c.total_partituras) : c.total_audios)) &&
      (!q || normalizar(`${c.titulo} ${c.autor} ${c.categoria} ${c.etiquetas}`).includes(q)));
  });

  readonly LIMITE = 25;
  pagina      = signal(1);
  totalPag    = computed(() => Math.max(1, Math.ceil(this.filtradas().length / this.LIMITE)));
  paginadas   = computed(() => this.filtradas().slice((this.pagina() - 1) * this.LIMITE, this.pagina() * this.LIMITE));

  ngOnInit() {
    this.cargar();
    this.svc.estadisticas().subscribe({ next: s => this.stats.set(s), error: () => {} });
  }

  cargar() {
    this.cargando.set(true);
    this.svc.listar().subscribe({
      next: d => { this.canciones.set(d); this.cargando.set(false); },
      error: e => { this.error.set(e.message || 'Error al cargar canciones'); this.cargando.set(false); },
    });
  }

  buscar(v: string) { this.busqueda.set(v); this.pagina.set(1); }
  setTipo(t: '' | TipoCancion) { this.filtroTipo.set(t); this.pagina.set(1); }
  setRecurso(r: '' | 'acordes' | 'partitura' | 'audio') { this.filtroRecurso.set(this.filtroRecurso() === r ? '' : r); this.pagina.set(1); }

  ver(c: { idcanciones: number }) { this.router.navigate(['/alabanza', c.idcanciones]); }
  editar(c: CancionResumen, ev: Event) { ev.stopPropagation(); this.router.navigate(['/alabanza', c.idcanciones, 'editar']); }
  nueva() { this.router.navigate(['/alabanza/nueva']); }

  async eliminar(c: CancionResumen, ev: Event) {
    ev.stopPropagation();
    const extra = c.veces ? `<br><small>Está en ${c.veces} programa(s); allí quedará sin canción.</small>` : '';
    if (!(await confirmar(`Se eliminará <b>${c.titulo}</b> con sus pistas y partituras.${extra}`, { peligro: true }))) return;
    this.svc.eliminar(c.idcanciones).subscribe({
      next: () => { this.exito.set('Canción eliminada'); this.cargar(); setTimeout(() => this.exito.set(''), 3000); },
      error: e => this.error.set(e.message || 'No se pudo eliminar'),
    });
  }

  hace(fecha: string | null) {
    if (!fecha) return 'Nunca';
    const dias = Math.floor((Date.now() - new Date(fecha + 'T00:00:00').getTime()) / 86400000);
    if (dias <= 0) return 'Hoy';
    if (dias < 7) return `Hace ${dias} día(s)`;
    if (dias < 60) return `Hace ${Math.floor(dias / 7)} sem.`;
    return `Hace ${Math.floor(dias / 30)} meses`;
  }
}
