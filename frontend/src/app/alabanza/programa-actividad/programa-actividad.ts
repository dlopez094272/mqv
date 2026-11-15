import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  AlabanzaService, CancionResumen, ElementoPrograma, INSTRUMENTOS, MOMENTOS_SUGERIDOS,
  MusicoActividad, ProgramaActividad,
} from '../alabanza.service';
import { TONALIDADES } from '../chordpro';
import { PermisosService } from '../../core/services/permisos.service';
import { confirmar } from '../../shared/confirmar.util';

const normalizar = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const escapar = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/**
 * Programa (orden del culto) de una actividad: momentos (Bienvenida, Oración...)
 * intercalados con canciones de la biblioteca de Alabanza, y el equipo de músicos.
 */
@Component({
  selector: 'app-programa-actividad',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './programa-actividad.html',
  styleUrl: './programa-actividad.scss',
})
export class ProgramaActividadComponent implements OnInit {
  idactividades = input.required<number>();

  private svc    = inject(AlabanzaService);
  private router = inject(Router);
  permisos       = inject(PermisosService);

  readonly momentos     = MOMENTOS_SUGERIDOS;
  readonly instrumentos = INSTRUMENTOS;
  readonly tonalidades  = TONALIDADES;

  cargando  = signal(true);
  guardando = signal(false);
  error     = signal('');
  exito     = signal('');
  sucio     = signal(false);

  datos     = signal<ProgramaActividad | null>(null);
  items     = signal<ElementoPrograma[]>([]);
  musicos   = signal<MusicoActividad[]>([]);
  canciones = signal<CancionResumen[]>([]);
  sinBiblioteca = signal(false);
  personas  = signal<{ id: number; nombre: string }[]>([]);
  recientes = signal<{ idactividades: number; nombre: string; fecha_inicio: string; elementos: number }[]>([]);

  expandido = signal<number | null>(null);
  // Buscador de canciones
  buscando  = signal(false);
  busqueda  = signal('');
  resultados = computed(() => {
    const q = normalizar(this.busqueda().trim());
    return this.canciones()
      .filter(c => c.activo && (!q || normalizar(`${c.titulo} ${c.autor} ${c.categoria} ${c.etiquetas}`).includes(q)))
      .slice(0, 30);
  });
  // Nuevo músico
  nuevoMusico = { idpersonas: null as number | null, instrumento: '' };
  busquedaPersona = signal('');
  personasFiltradas = computed(() => {
    const q = normalizar(this.busquedaPersona().trim());
    if (!q) return [];
    return this.personas().filter(p => normalizar(p.nombre).includes(q)).slice(0, 12);
  });

  puedeEditar = computed(() => this.permisos.puede('actividades', 'E'));

  /** Hora estimada de cada elemento: la propia o la acumulada desde la hora de inicio. */
  horas = computed(() => {
    const inicio = this.datos()?.actividad.hora_inicio;
    let min = inicio ? this.aMinutos(inicio) : null;
    return this.items().map(it => {
      if (it.hora) min = this.aMinutos(it.hora);
      const h = min === null ? null : this.deMinutos(min);
      if (min !== null) min += Number(it.duracion_min) || 0;
      return { hora: h, estimada: !it.hora };
    });
  });
  duracionTotal = computed(() => this.items().reduce((s, i) => s + (Number(i.duracion_min) || 0), 0));
  totalCanciones = computed(() => this.items().filter(i => i.tipo === 'cancion').length);

  private arrastrando: number | null = null;

  ngOnInit() {
    this.cargar();
    this.svc.listar().subscribe({ next: c => this.canciones.set(c), error: () => this.sinBiblioteca.set(true) });
    if (this.puedeEditar()) {
      this.svc.personas().subscribe({ next: p => this.personas.set(p), error: () => {} });
      this.svc.programasRecientes().subscribe({
        next: r => this.recientes.set(r.filter(x => x.idactividades !== this.idactividades())), error: () => {},
      });
    }
  }

  private cargar() {
    this.cargando.set(true);
    this.svc.programa(this.idactividades()).subscribe({
      next: d => { this.aplicar(d); this.cargando.set(false); },
      error: e => { this.error.set(e.message || 'No se pudo cargar el programa'); this.cargando.set(false); },
    });
  }

  private aplicar(d: ProgramaActividad) {
    this.datos.set(d);
    this.items.set(d.programa.map(p => ({ ...p })));
    this.musicos.set(d.musicos.map(m => ({ ...m })));
    this.sucio.set(false);
  }

  private cambiar(fn: (l: ElementoPrograma[]) => ElementoPrograma[]) {
    this.items.set(fn([...this.items()]));
    this.sucio.set(true);
  }

  /* ── Agregar ──────────────────────────────────── */
  agregarMomento(titulo: string) {
    this.cambiar(l => [...l, { tipo: 'momento', titulo, idcanciones: null, tonalidad: null, responsable: null, hora: null, duracion_min: null, notas: null }]);
  }

  momentoPersonalizado() {
    this.agregarMomento('Nuevo momento');
    this.expandido.set(this.items().length - 1);
  }

  agregarCancion(c: CancionResumen) {
    this.cambiar(l => [...l, {
      tipo: 'cancion', titulo: null, idcanciones: c.idcanciones, tonalidad: c.tonalidad, responsable: null,
      hora: null, duracion_min: null, notas: null,
      cancion_titulo: c.titulo, cancion_autor: c.autor, cancion_tonalidad: c.tonalidad, cancion_bpm: c.bpm,
      tiene_acordes: c.tiene_acordes, total_audios: c.total_audios,
    }]);
    this.busqueda.set('');
    this.exito.set(`"${c.titulo}" agregada`);
    setTimeout(() => this.exito.set(''), 1800);
  }

  /** Bloque típico: Bienvenida, Oración, 3 canciones (vacías para elegir), Ofrenda, Predicación, Bendición. */
  plantillaCulto() {
    ['Bienvenida', 'Oración', 'Alabanza y adoración', 'Diezmos y ofrendas', 'Anuncios', 'Predicación', 'Bendición final']
      .forEach(t => this.agregarMomento(t));
  }

  copiarDe(idact: number) {
    if (!idact) return;
    this.svc.programa(idact).subscribe(d => {
      this.cambiar(l => [...l, ...d.programa.map(p => ({ ...p, idprograma: undefined }))]);
      this.exito.set(`Se copiaron ${d.programa.length} elemento(s). Revisa y guarda.`);
      setTimeout(() => this.exito.set(''), 3500);
    });
  }

  /* ── Editar / ordenar ─────────────────────────── */
  quitar(i: number) {
    this.cambiar(l => { l.splice(i, 1); return l; });
    if (this.expandido() === i) this.expandido.set(null);
  }

  mover(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= this.items().length) return;
    this.cambiar(l => { [l[i], l[j]] = [l[j], l[i]]; return l; });
    if (this.expandido() === i) this.expandido.set(j);
  }

  actualizar(i: number, campo: keyof ElementoPrograma, valor: any) {
    this.cambiar(l => { l[i] = { ...l[i], [campo]: valor === '' ? null : valor }; return l; });
  }

  alternar(i: number) { this.expandido.set(this.expandido() === i ? null : i); }

  dragStart(i: number) { this.arrastrando = i; }
  dragOver(ev: DragEvent) { ev.preventDefault(); }
  drop(i: number) {
    const desde = this.arrastrando;
    this.arrastrando = null;
    if (desde === null || desde === i) return;
    this.cambiar(l => { const [x] = l.splice(desde, 1); l.splice(i, 0, x); return l; });
  }

  /* ── Músicos ──────────────────────────────────── */
  elegirPersona(p: { id: number; nombre: string }) {
    this.nuevoMusico.idpersonas = p.id;
    this.busquedaPersona.set(p.nombre);
  }

  agregarMusico() {
    const id = this.nuevoMusico.idpersonas;
    if (!id) return;
    const nombre = this.personas().find(p => p.id === id)?.nombre;
    this.musicos.set([...this.musicos(), { idpersonas: id, instrumento: this.nuevoMusico.instrumento || null, nombre }]);
    this.nuevoMusico = { idpersonas: null, instrumento: this.nuevoMusico.instrumento };
    this.busquedaPersona.set('');
    this.sucio.set(true);
  }

  quitarMusico(i: number) {
    const l = [...this.musicos()]; l.splice(i, 1);
    this.musicos.set(l); this.sucio.set(true);
  }

  /* ── Guardar ──────────────────────────────────── */
  guardar() {
    this.error.set('');
    const sinCancion = this.items().findIndex(i => i.tipo === 'cancion' && !i.idcanciones);
    if (sinCancion >= 0) { this.error.set(`El elemento ${sinCancion + 1} no tiene canción.`); return; }
    this.guardando.set(true);
    const id = this.idactividades();
    this.svc.guardarPrograma(id, this.items()).subscribe({
      next: () => this.svc.guardarMusicos(id, this.musicos()).subscribe({
        next: d => { this.aplicar(d); this.guardando.set(false); this.exito.set('Programa guardado ✔'); setTimeout(() => this.exito.set(''), 3000); },
        error: e => { this.guardando.set(false); this.error.set(e.message || 'Error al guardar los músicos'); },
      }),
      error: e => { this.guardando.set(false); this.error.set(e.message || 'Error al guardar el programa'); },
    });
  }

  async descartar() {
    if (await confirmar('Se perderán los cambios sin guardar.', { titulo: '¿Descartar cambios?' })) this.cargar();
  }

  verCancion(it: ElementoPrograma) {
    if (!it.idcanciones) return;
    const qp: any = { act: this.idactividades() };
    if (it.tonalidad) qp.tono = it.tonalidad;
    this.router.navigate(['/alabanza', it.idcanciones], { queryParams: qp });
  }

  /* ── Imprimir ─────────────────────────────────── */
  imprimir() {
    const d = this.datos(); if (!d) return;
    const horas = this.horas();
    const filas = this.items().map((it, i) => `
      <tr>
        <td class="h">${horas[i].hora ?? ''}</td>
        <td>${it.tipo === 'cancion'
          ? `<b>🎵 ${escapar(it.cancion_titulo)}</b>${it.tonalidad ? ` <span class="k">${escapar(it.tonalidad)}</span>` : ''}`
          : `<b>${escapar(it.titulo)}</b>`}
          ${it.notas ? `<div class="n">${escapar(it.notas)}</div>` : ''}</td>
        <td>${escapar(it.responsable)}</td>
        <td class="h">${it.duracion_min ? it.duracion_min + ' min' : ''}</td>
      </tr>`).join('');
    const mus = this.musicos().map(m => `<li><b>${escapar(m.instrumento || '—')}:</b> ${escapar(m.nombre)}</li>`).join('');
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Programa · ${escapar(d.actividad.nombre)}</title>
      <style>body{font-family:Segoe UI,Arial,sans-serif;color:#333;padding:24px}h1{color:#57446C;margin:0}
      .sub{color:#777;margin-bottom:18px}table{width:100%;border-collapse:collapse}td{padding:9px 8px;border-bottom:1px solid #ddd;vertical-align:top}
      .h{white-space:nowrap;color:#57446C;font-weight:700;width:1%}.k{background:#57446C;color:#fff;border-radius:4px;padding:1px 6px;font-size:12px}
      .n{color:#777;font-size:13px;margin-top:3px}h3{color:#57446C;margin-top:24px}ul{columns:2}</style></head><body>
      <h1>${escapar(d.actividad.nombre)}</h1>
      <div class="sub">${escapar(d.actividad.fecha_inicio)}${d.actividad.hora_inicio ? ' · ' + d.actividad.hora_inicio : ''}${d.actividad.lugar ? ' · ' + escapar(d.actividad.lugar) : ''}</div>
      <table>${filas}</table>${mus ? `<h3>Equipo de alabanza</h3><ul>${mus}</ul>` : ''}
      <script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  }

  icono(it: ElementoPrograma) {
    if (it.tipo === 'cancion') return '🎵';
    return this.momentos.find(m => m.titulo === it.titulo)?.icono ?? '📌';
  }

  private aMinutos(h: string) { const [a, b] = h.split(':').map(Number); return a * 60 + (b || 0); }
  private deMinutos(m: number) { const h = Math.floor(m / 60) % 24; return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }
}
