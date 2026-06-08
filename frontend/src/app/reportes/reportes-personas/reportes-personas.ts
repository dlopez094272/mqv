import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface PorGenero   { hombres: number; mujeres: number; sin_dato: number; }
interface PorEdad     { bebes: number; ninos: number; adolescentes: number; jovenes: number; adultos: number; adultos_mayores: number; sin_fecha: number; }
interface Eclesial    { convertidos: number; bautizados: number; }
interface ItemMetrica { etiqueta: string; cantidad: number; }

interface EstadisticasPersonas {
  total: number;
  por_genero:          PorGenero;
  por_edad:            PorEdad;
  eclesial:            Eclesial;
  por_nacionalidad:    ItemMetrica[];
  por_anio_asistencia: { anio: number; cantidad: number }[];
  por_departamento:    ItemMetrica[];
  por_profesion:       ItemMetrica[];
}

@Component({
  selector:    'app-reportes-personas',
  standalone:  true,
  imports:     [CommonModule, RouterModule],
  templateUrl: './reportes-personas.html',
  styleUrl:    './reportes-personas.scss',
})
export class ReportesPersonasComponent implements OnInit {
  cargando = signal(true);
  error    = signal('');
  datos    = signal<EstadisticasPersonas | null>(null);

  // ── Computed helpers ─────────────────────────────────────────
  edadRows = computed(() => {
    const e = this.datos()?.por_edad;
    if (!e) return [];
    return [
      { label: 'Bebés',         rango: '0–2 años',  val: e.bebes },
      { label: 'Niños',         rango: '3–12 años', val: e.ninos },
      { label: 'Adolescentes',  rango: '13–17',     val: e.adolescentes },
      { label: 'Jóvenes',       rango: '18–25',     val: e.jovenes },
      { label: 'Adultos',       rango: '26–59',     val: e.adultos },
      { label: 'Ad. Mayores',   rango: '60+',       val: e.adultos_mayores },
      { label: 'Sin fecha nac.',rango: '—',          val: e.sin_fecha },
    ];
  });

  totalEdadConFecha = computed(() => {
    const e = this.datos()?.por_edad;
    if (!e) return 0;
    return e.bebes + e.ninos + e.adolescentes + e.jovenes + e.adultos + e.adultos_mayores;
  });

  maxEdad = computed(() => Math.max(...this.edadRows().map(r => r.val), 1));
  maxNacionalidad = computed(() => Math.max(...(this.datos()?.por_nacionalidad.map(i => i.cantidad) ?? [1])));
  maxDepartamento = computed(() => Math.max(...(this.datos()?.por_departamento.map(i => i.cantidad) ?? [1])));
  maxProfesion    = computed(() => Math.max(...(this.datos()?.por_profesion.map(i => i.cantidad) ?? [1])));
  maxAnio         = computed(() => Math.max(...(this.datos()?.por_anio_asistencia.map(i => i.cantidad) ?? [1])));

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<EstadisticasPersonas>(`${environment.apiUrl}/reportes/personas`).subscribe({
      next: (d) => { this.datos.set(d); this.cargando.set(false); },
      error: (e: any) => { this.error.set(e.message || 'Error al cargar estadísticas'); this.cargando.set(false); },
    });
  }

  barWidth(val: number, max: number): number {
    return max > 0 ? Math.round((val / max) * 100) : 0;
  }

  pct(val: number, total: number): string {
    if (!total) return '0%';
    return (val / total * 100).toFixed(1) + '%';
  }

  imprimir() { window.print(); }
}
