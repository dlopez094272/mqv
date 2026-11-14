import { Component, signal, computed, inject, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface GrupoDisponible {
  idgrupos: number;
  grupo:    string;
}

interface CategoriaActividad {
  id:     number;
  nombre: string;
}

interface Inasistente {
  idpersonas:          number;
  nombre_completo:     string;
  foto:                string | null;
  telefono:            string | null;
  celular:             string | null;
  email:               string | null;
  direccion_domicilio: string | null;
  zona_domicilio:      string | null;
  grupos:              string | null;
  ultima_asistencia:   string | null;
  dias_sin_asistir:    number | null;
}

@Component({
  selector:    'app-reportes-inasistentes',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './reportes-inasistentes.html',
  styleUrl:    './reportes-inasistentes.scss',
})
export class ReportesInasistentesComponent implements OnInit {
  private http   = inject(HttpClient);
  private ngZone = inject(NgZone);

  filtro = {
    idgrupo: null as number | null,
    idcategoria: null as number | null,
    incluirNuncaAsistieron: true,
  };

  cargando          = signal(false);
  error             = signal('');
  generado          = signal(false);
  generandoPdf      = signal(false);
  personas          = signal<Inasistente[]>([]);
  gruposDisponibles = signal<GrupoDisponible[]>([]);
  categorias        = signal<CategoriaActividad[]>([]);

  totalPersonas   = computed(() => this.personas().length);
  nuncaAsistieron = computed(() => this.personas().filter(p => !p.ultima_asistencia).length);

  nombreGrupoSeleccionado = computed<string>(() => {
    if (!this.filtro.idgrupo) return '';
    return this.gruposDisponibles().find(g => g.idgrupos === this.filtro.idgrupo)?.grupo ?? '';
  });

  nombreCategoriaSeleccionada = computed<string>(() => {
    if (!this.filtro.idcategoria) return '';
    return this.categorias().find(c => c.id === this.filtro.idcategoria)?.nombre ?? '';
  });

  ngOnInit() {
    this.http.get<{ grupos: GrupoDisponible[] }>(`${environment.apiUrl}/reportes/grupos-disponibles`)
      .subscribe({ next: d => this.gruposDisponibles.set(d.grupos) });
    this.http.get<CategoriaActividad[]>(`${environment.apiUrl}/catalogos/lookup/actividades-categorias`)
      .subscribe({ next: d => this.categorias.set(d) });
  }

  generar() {
    this.cargando.set(true);
    this.error.set('');
    this.generado.set(false);

    const params: string[] = [];
    if (this.filtro.idgrupo)     params.push(`idgrupo=${this.filtro.idgrupo}`);
    if (this.filtro.idcategoria) params.push(`idcategoria=${this.filtro.idcategoria}`);
    if (!this.filtro.incluirNuncaAsistieron) params.push(`incluir_nunca_asistieron=0`);

    const url = `${environment.apiUrl}/reportes/inasistentes` + (params.length ? `?${params.join('&')}` : '');

    this.http.get<{ personas: Inasistente[] }>(url).subscribe({
      next: d => {
        this.personas.set(d.personas);
        this.generado.set(true);
        this.cargando.set(false);
      },
      error: (e: any) => {
        this.error.set(e.message || 'Error al generar el reporte');
        this.cargando.set(false);
      },
    });
  }

  imprimir() {
    window.print();
  }

  async descargarPDF() {
    this.generandoPdf.set(true);
    const contenedor = document.getElementById('reporte-contenido')!;

    const printOnly = contenedor.querySelectorAll<HTMLElement>('.print-only');
    const noPrint   = contenedor.querySelectorAll<HTMLElement>('.no-print');
    printOnly.forEach(el => el.style.setProperty('display', 'flex', 'important'));
    noPrint.forEach(el => el.style.setProperty('display', 'none', 'important'));

    try {
      await this.ngZone.runOutsideAngular(async () => {
        const html2pdf = ((await import('html2pdf.js')) as any).default;
        await html2pdf().set({
          margin:      [14, 14, 14, 14],
          filename:    'reporte-inasistentes.pdf',
          image:       { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
        }).from(contenedor).save();
      });
    } finally {
      printOnly.forEach(el => el.style.removeProperty('display'));
      noPrint.forEach(el => el.style.removeProperty('display'));
      this.generandoPdf.set(false);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────
  fotoUrl(filename: string): string { return `/api/uploads/personas/${filename}`; }

  direccionCompleta(p: Inasistente): string {
    const partes = [
      p.zona_domicilio ? `Zona ${p.zona_domicilio}` : '',
      p.direccion_domicilio || '',
    ].filter(Boolean);
    return partes.join(', ') || '—';
  }

  tiempoSinAsistir(p: Inasistente): string {
    if (!p.ultima_asistencia || p.dias_sin_asistir == null) return 'Nunca ha asistido';
    const dias = p.dias_sin_asistir;
    if (dias < 1) return 'Hoy';
    const anios       = Math.floor(dias / 365);
    const mesesRestoD = dias - anios * 365;
    const meses       = Math.floor(mesesRestoD / 30);
    const diasResto   = Math.floor(mesesRestoD - meses * 30);

    const partes: string[] = [];
    if (anios)  partes.push(`${anios} año${anios !== 1 ? 's' : ''}`);
    if (meses)  partes.push(`${meses} mes${meses !== 1 ? 'es' : ''}`);
    if (!anios && !meses) partes.push(`${diasResto} día${diasResto !== 1 ? 's' : ''}`);
    return partes.join(', ');
  }

  formatFecha(s: string | null): string {
    if (!s) return '—';
    return new Date(String(s).slice(0, 10) + 'T00:00:00')
      .toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
