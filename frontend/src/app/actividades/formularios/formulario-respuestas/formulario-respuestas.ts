import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import * as XLSX from 'xlsx';
import {
  FormulariosService, ReporteRespuestas, Pregunta, RespuestaFila, textoRespuesta, tieneValor,
} from '../formularios.service';
import { PermisosService } from '../../../core/services/permisos.service';
import { FormularioCompartirComponent } from '../formulario-compartir.component';
import { confirmar } from '../../../shared/confirmar.util';

interface ResumenPregunta {
  q:      Pregunta;
  total:  number;
  barras: { etiqueta: string; cantidad: number; pct: number }[];
}

@Component({
  selector:    'app-formulario-respuestas',
  standalone:  true,
  imports:     [CommonModule, FormsModule, RouterModule, FormularioCompartirComponent],
  templateUrl: './formulario-respuestas.html',
  styleUrl:    './formulario-respuestas.scss',
})
export class FormularioRespuestasComponent implements OnInit {
  private svc    = inject(FormulariosService);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  permisos       = inject(PermisosService);

  id        = 0;
  cargando  = signal(true);
  error     = signal('');
  exito     = signal('');
  data      = signal<ReporteRespuestas | null>(null);
  busqueda  = signal('');
  vista     = signal<'tabla' | 'resumen'>('tabla');
  mostrarCompartir = signal(false);
  registrando = signal<string | null>(null);

  readonly LIMITE = 25;
  pagina = signal(1);

  /** Preguntas que tienen columna (todas menos títulos de sección) */
  columnas = computed(() => (this.data()?.formulario.preguntas || []).filter(q => q.tipo !== 'seccion'));

  filtradas = computed<RespuestaFila[]>(() => {
    const d = this.data();
    if (!d) return [];
    const t = this.busqueda().toLowerCase().trim();
    if (!t) return d.respuestas;
    return d.respuestas.filter(r =>
      this.columnas().some(q => this.texto(q, r).toLowerCase().includes(t)) ||
      (r.usuario || '').toLowerCase().includes(t));
  });

  totalPaginas = computed(() => Math.max(1, Math.ceil(this.filtradas().length / this.LIMITE)));
  paginadas = computed(() => {
    const p = Math.min(this.pagina(), this.totalPaginas());
    return this.filtradas().slice((p - 1) * this.LIMITE, p * this.LIMITE);
  });

  /** Conteos por opción (respuesta única / múltiple) y persona registrada vs nueva */
  resumen = computed<ResumenPregunta[]>(() => {
    const d = this.data();
    if (!d) return [];
    const out: ResumenPregunta[] = [];
    for (const q of this.columnas()) {
      const vals = d.respuestas.map(r => r.respuestas[q.clave]).filter(tieneValor);
      let etiquetas: string[]; let contar: (e: string) => number;
      if (['unica', 'lista', 'multiple'].includes(q.tipo)) {
        etiquetas = [...q.opciones];
        // Valores que ya no existen como opción (el formulario se editó)
        for (const v of vals) for (const x of (Array.isArray(v) ? v : [v])) if (!etiquetas.includes(x)) etiquetas.push(x);
        contar = e => vals.filter(v => Array.isArray(v) ? v.includes(e) : v === e).length;
      } else if (q.tipo === 'persona') {
        etiquetas = ['Persona registrada', 'Persona nueva'];
        contar = e => vals.filter(v => (v.modo === 'registrada') === (e === 'Persona registrada')).length;
      } else {
        continue;
      }
      const total = vals.length;
      out.push({
        q, total,
        barras: etiquetas.map(e => {
          const cantidad = contar(e);
          return { etiqueta: e, cantidad, pct: total ? Math.round((cantidad / total) * 100) : 0 };
        }),
      });
    }
    return out;
  });

  ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.svc.respuestas(this.id).subscribe({
      next:  d => { this.data.set(d); this.cargando.set(false); },
      error: (e: any) => { this.error.set(e.message); this.cargando.set(false); },
    });
  }

  buscar(v: string) { this.busqueda.set(v); this.pagina.set(1); }
  irPagina(p: number) { if (p >= 1 && p <= this.totalPaginas()) this.pagina.set(p); }

  texto(q: Pregunta, r: RespuestaFila): string {
    return textoRespuesta(q, r.respuestas[q.clave], this.data()?.personas);
  }
  valor(q: Pregunta, r: RespuestaFila): any { return r.respuestas[q.clave]; }
  fotoPersona(v: any): string | null {
    return v?.modo === 'registrada' ? this.data()?.personas[v.idpersonas]?.foto || null : null;
  }

  formatFechaHora(s: string): string {
    return new Date(s).toLocaleString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  async eliminar(r: RespuestaFila) {
    if (!await confirmar('¿Eliminar esta respuesta?<br>Esta acción no se puede deshacer.', { peligro: true })) return;
    this.svc.eliminarRespuesta(this.id, r.id).subscribe({
      next:  () => this.cargar(),
      error: (e: any) => this.error.set(e.message),
    });
  }

  async registrarPersona(q: Pregunta, r: RespuestaFila) {
    const nombre = this.texto(q, r);
    if (!await confirmar(`Se creará a <b>${nombre}</b> en el módulo de Personas con los datos de esta respuesta.`,
                         { titulo: '¿Registrar persona?', btnConfirmar: 'Sí, registrar' })) return;
    this.registrando.set(`${r.id}-${q.clave}`);
    this.svc.registrarPersona(this.id, r.id, q.clave).subscribe({
      next: () => {
        this.registrando.set(null);
        this.exito.set(`${nombre} fue registrada en Personas`);
        setTimeout(() => this.exito.set(''), 4000);
        this.cargar();
      },
      error: (e: any) => { this.registrando.set(null); this.error.set(e.message); },
    });
  }

  exportarExcel() {
    const d = this.data();
    if (!d) return;
    const cols = this.columnas();
    const encabezado = ['#', 'Fecha', 'Usuario'];
    for (const q of cols) {
      encabezado.push(q.etiqueta);
      if (q.tipo === 'persona') encabezado.push(`${q.etiqueta} (tipo)`);
    }
    const filas = this.filtradas().map((r, i) => {
      const fila: (string | number)[] = [i + 1, this.formatFechaHora(r.created_at), r.usuario || ''];
      for (const q of cols) {
        const v = r.respuestas[q.clave];
        fila.push(q.tipo === 'numero' && tieneValor(v) ? Number(v) : this.texto(q, r));
        if (q.tipo === 'persona') fila.push(!tieneValor(v) ? '' : v.modo === 'registrada' ? 'Registrada' : 'Nueva');
      }
      return fila;
    });

    const ws = XLSX.utils.aoa_to_sheet([encabezado, ...filas]);
    ws['!cols'] = encabezado.map(h => ({ wch: Math.min(Math.max(String(h).length + 2, 12), 45) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Respuestas');

    // Hoja de resumen
    const res: (string | number)[][] = [['Pregunta', 'Opción', 'Cantidad', '%']];
    for (const r of this.resumen()) {
      for (const b of r.barras) res.push([r.q.etiqueta, b.etiqueta, b.cantidad, b.pct]);
    }
    if (res.length > 1) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(res), 'Resumen');

    const nombre = d.formulario.titulo.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ]+/g, '_').slice(0, 60);
    XLSX.writeFile(wb, `respuestas_${nombre}.xlsx`);
  }

  volver() {
    const idAct = this.data()?.formulario.idactividades;
    if (idAct) this.router.navigate(['/actividades', idAct, 'gestion'], { queryParams: { tab: 'formularios' } });
    else this.router.navigate(['/actividades']);
  }

  urlLogo(f: string) { return this.svc.urlLogo(f); }
  urlFoto(f: string) { return this.svc.urlFotoPersona(f); }
  inicial(n: string) { return (n || '?').charAt(0).toUpperCase(); }
}
