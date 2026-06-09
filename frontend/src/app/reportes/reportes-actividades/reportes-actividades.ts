import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ActividadesService } from '../../actividades/actividades.service';

interface GrupoActividad {
  idgrupos:          number;
  grupo:             string;
  total_asistentes:  number;
}

interface PorEdad {
  bebes:           number;
  ninos:           number;
  adolescentes:    number;
  jovenes:         number;
  adultos:         number;
  adultos_mayores: number;
  sin_fecha:       number;
}

interface PorGenero {
  hombres:  number;
  mujeres:  number;
  sin_dato: number;
}

interface ReporteActividad {
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
  grupos:           GrupoActividad[];
  por_edad:         PorEdad;
  por_genero:       PorGenero;
}

@Component({
  selector:    'app-reportes-actividades',
  standalone:  true,
  imports:     [CommonModule, FormsModule, NgTemplateOutlet],
  templateUrl: './reportes-actividades.html',
  styleUrl:    './reportes-actividades.scss',
})
export class ReportesActividadesComponent {
  private http = inject(HttpClient);
  private svc  = inject(ActividadesService);

  // ── Filtros ───────────────────────────────────────────────────
  filtro = {
    fecha_inicio: this._primerDiaMes(),
    fecha_fin:    this._hoy(),
  };

  // ── Estado ───────────────────────────────────────────────────
  cargando  = signal(false);
  error     = signal('');
  generado  = signal(false);
  actividades = signal<ReporteActividad[]>([]);

  // ── Totales globales ─────────────────────────────────────────
  totalPersonas   = computed(() => this.actividades().reduce((s, a) => s + a.total_personas, 0));
  totalVisitantes = computed(() => this.actividades().reduce((s, a) => s + a.total_visitantes, 0));
  totalAsistentes = computed(() => this.actividades().reduce((s, a) => s + a.total_asistentes, 0));

  totalEdad = computed<PorEdad>(() => {
    const acts = this.actividades();
    return {
      bebes:           acts.reduce((s, a) => s + a.por_edad.bebes, 0),
      ninos:           acts.reduce((s, a) => s + a.por_edad.ninos, 0),
      adolescentes:    acts.reduce((s, a) => s + a.por_edad.adolescentes, 0),
      jovenes:         acts.reduce((s, a) => s + a.por_edad.jovenes, 0),
      adultos:         acts.reduce((s, a) => s + a.por_edad.adultos, 0),
      adultos_mayores: acts.reduce((s, a) => s + a.por_edad.adultos_mayores, 0),
      sin_fecha:       acts.reduce((s, a) => s + a.por_edad.sin_fecha, 0),
    };
  });

  totalGenero = computed<PorGenero>(() => {
    const acts = this.actividades();
    return {
      hombres:  acts.reduce((s, a) => s + a.por_genero.hombres, 0),
      mujeres:  acts.reduce((s, a) => s + a.por_genero.mujeres, 0),
      sin_dato: acts.reduce((s, a) => s + a.por_genero.sin_dato, 0),
    };
  });

  // ── Todos los grupos que aparecen en el reporte ───────────────
  todosLosGrupos = computed<string[]>(() => {
    const set = new Set<string>();
    this.actividades().forEach(a => a.grupos.forEach(g => set.add(g.grupo)));
    return Array.from(set).sort();
  });

  // ── Acciones ─────────────────────────────────────────────────
  imprimir() {
    window.print();
  }

  generar() {
    if (!this.filtro.fecha_inicio || !this.filtro.fecha_fin) {
      this.error.set('Selecciona el rango de fechas');
      return;
    }
    this.cargando.set(true);
    this.error.set('');
    this.generado.set(false);

    const url = `${environment.apiUrl}/reportes/actividades`
      + `?fecha_inicio=${this.filtro.fecha_inicio}&fecha_fin=${this.filtro.fecha_fin}`;

    this.http.get<{ actividades: ReporteActividad[] }>(url).subscribe({
      next: d => {
        this.actividades.set(d.actividades);
        this.generado.set(true);
        this.cargando.set(false);
      },
      error: (e: any) => {
        this.error.set(e.message || 'Error al generar el reporte');
        this.cargando.set(false);
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────
  urlLogo(filename: string) { return this.svc.urlLogo(filename); }

  formatFecha(s: string): string {
    if (!s) return '';
    return new Date(String(s).slice(0, 10) + 'T00:00:00')
      .toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  asistentesDeGrupo(act: ReporteActividad, grupo: string): number {
    return act.grupos.find(g => g.grupo === grupo)?.total_asistentes ?? 0;
  }

  private _hoy(): string {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  }

  private _primerDiaMes(): string {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`;
  }
}
