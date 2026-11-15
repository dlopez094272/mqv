import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlabanzaService, ArchivoCancion, Cancion, PISTAS, TipoCancion,
} from '../alabanza.service';
import { TONALIDADES, convertirAcordesArriba } from '../chordpro';
import { HojaAcordesComponent } from '../componentes/hoja-acordes.component';
import { PartituraAbcComponent } from '../componentes/partitura-abc.component';
import { confirmar } from '../../shared/confirmar.util';

type Seccion = 'datos' | 'letra' | 'partitura' | 'archivos';

const EJEMPLO_CHORDPRO = `{start_of_verse: Estrofa 1}
[G]Escribe la letra y pon cada a[C]corde
entre corchetes justo [D]antes de la sí[G]laba
{end_of_verse}

{start_of_chorus}
[C]Este es el [G]coro
[Am]se resalta con [D]otro color
{end_of_chorus}

{comment: Repetir el coro 2 veces}`;

const EJEMPLO_ABC = `X:1
T:Título de la melodía
M:4/4
L:1/4
Q:1/4=80
K:G
D | G G B d | c B A2 | B c d B | A3 :|`;

@Component({
  selector: 'app-cancion-form',
  standalone: true,
  imports: [CommonModule, FormsModule, HojaAcordesComponent, PartituraAbcComponent],
  templateUrl: './cancion-form.html',
  styleUrl: './cancion-form.scss',
})
export class CancionFormComponent implements OnInit {
  private svc    = inject(AlabanzaService);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  readonly tonalidades = TONALIDADES;
  readonly pistasSugeridas = PISTAS;
  readonly categorias = ['Adoración', 'Júbilo', 'Santa Cena', 'Ofrenda', 'Navidad', 'Semana Santa', 'Infantil', 'Bautismo', 'Misiones'];

  id        = signal<number | null>(null);
  seccion   = signal<Seccion>('datos');
  cargando  = signal(false);
  guardando = signal(false);
  error     = signal('');
  exito     = signal('');
  archivos  = signal<ArchivoCancion[]>([]);
  subiendo  = signal(false);

  form: Partial<Cancion> & { tipo: TipoCancion } = this.vacio();

  // Subida de pistas
  pendientes: { file: File; pista: string }[] = [];

  // Tap tempo
  private taps: number[] = [];

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const sec = this.route.snapshot.queryParamMap.get('seccion') as Seccion | null;
    if (sec) this.seccion.set(sec);
    if (id) {
      this.id.set(id);
      this.cargando.set(true);
      this.svc.obtener(id).subscribe({
        next: c => {
          this.form = { ...c, tipo: c.tipo || 'cancion' };
          this.archivos.set(c.archivos || []);
          this.cargando.set(false);
        },
        error: e => { this.error.set(e.message || 'No se pudo cargar la canción'); this.cargando.set(false); },
      });
    }
  }

  private vacio() {
    return {
      titulo: '', autor: '', tipo: 'cancion' as TipoCancion, tonalidad: null, bpm: null, compas: '4/4',
      categoria: '', etiquetas: '', letra_acordes: '', partitura_abc: '', youtube_url: '', spotify_url: '',
      notas: '', dominio_publico: 0, ccli: '', activo: 1,
    };
  }

  guardar() {
    this.error.set('');
    if (!this.form.titulo?.trim()) { this.error.set('El título es requerido'); this.seccion.set('datos'); return; }
    this.guardando.set(true);
    const id = this.id();
    const req = id ? this.svc.actualizar(id, this.form) : this.svc.crear(this.form);
    req.subscribe({
      next: (r: any) => {
        this.guardando.set(false);
        if (!id) {
          this.router.navigate(['/alabanza', r.idcanciones, 'editar'], { queryParams: { seccion: 'archivos' }, replaceUrl: true })
            .then(() => { this.id.set(r.idcanciones); this.seccion.set('archivos'); this.ok('Canción creada. Ahora puedes subir pistas y partituras.'); });
        } else {
          this.ok('Cambios guardados');
        }
      },
      error: e => { this.guardando.set(false); this.error.set(e.message || 'No se pudo guardar'); },
    });
  }

  verCancion() { if (this.id()) this.router.navigate(['/alabanza', this.id()]); }
  volver() { this.router.navigate(['/alabanza']); }

  private ok(msg: string) { this.exito.set(msg); setTimeout(() => this.exito.set(''), 3500); }

  /* ── Letra ───────────────────────────────────────────── */
  insertarEjemplo() {
    if (!this.form.letra_acordes?.trim()) this.form.letra_acordes = EJEMPLO_CHORDPRO;
  }
  convertir() {
    this.form.letra_acordes = convertirAcordesArriba(this.form.letra_acordes || '');
  }
  insertarEtiqueta(area: HTMLTextAreaElement, inicio: string, fin = '') {
    const v = this.form.letra_acordes || '';
    const a = area.selectionStart, b = area.selectionEnd;
    const sel = v.slice(a, b);
    this.form.letra_acordes = v.slice(0, a) + inicio + sel + fin + v.slice(b);
    setTimeout(() => { area.focus(); area.selectionStart = area.selectionEnd = a + inicio.length + sel.length; });
  }

  /* ── Partitura ───────────────────────────────────────── */
  insertarEjemploAbc() {
    if (!this.form.partitura_abc?.trim()) {
      this.form.partitura_abc = EJEMPLO_ABC.replace('Título de la melodía', this.form.titulo || 'Melodía')
        .replace('K:G', `K:${this.form.tonalidad || 'G'}`)
        .replace('Q:1/4=80', `Q:1/4=${this.form.bpm || 80}`)
        .replace('M:4/4', `M:${this.form.compas || '4/4'}`);
    }
  }

  /* ── Tap tempo ───────────────────────────────────────── */
  tap() {
    const ahora = performance.now();
    if (this.taps.length && ahora - this.taps[this.taps.length - 1] > 2500) this.taps = [];
    this.taps.push(ahora);
    if (this.taps.length > 8) this.taps.shift();
    if (this.taps.length >= 3) {
      const difs = this.taps.slice(1).map((t, i) => t - this.taps[i]);
      const prom = difs.reduce((s, d) => s + d, 0) / difs.length;
      this.form.bpm = Math.round(60000 / prom);
    }
  }

  /* ── Archivos ────────────────────────────────────────── */
  elegirArchivos(ev: Event) {
    const files = Array.from((ev.target as HTMLInputElement).files || []);
    for (const f of files) this.pendientes.push({ file: f, pista: this.adivinarPista(f.name) });
    (ev.target as HTMLInputElement).value = '';
  }

  soltar(ev: DragEvent) {
    ev.preventDefault();
    for (const f of Array.from(ev.dataTransfer?.files || [])) this.pendientes.push({ file: f, pista: this.adivinarPista(f.name) });
  }

  private adivinarPista(nombre: string) {
    const n = nombre.toLowerCase();
    if (/\.(pdf|png|jpe?g|webp)$/.test(n)) return 'Partitura';
    const mapa: [RegExp, string][] = [
      [/click|metr/, 'Click'], [/gu[ií]a|cue/, 'Guía'], [/coro|bgv|backing/, 'Coros'], [/voz|vocal|lead/, 'Voz'],
      [/bajo|bass/, 'Bajo'], [/bater|drum/, 'Batería'], [/guitar/, 'Guitarra'], [/tecla|key|synth|pad/, 'Teclado'],
      [/piano/, 'Piano'], [/cuerda|string|viol/, 'Cuerdas'],
    ];
    return mapa.find(([re]) => re.test(n))?.[1] ?? 'Completa';
  }

  quitarPendiente(i: number) { this.pendientes.splice(i, 1); }

  subir() {
    const id = this.id();
    if (!id || !this.pendientes.length) return;
    this.subiendo.set(true);
    this.svc.subirArchivos(id, this.pendientes.map(p => p.file), 'auto', this.pendientes.map(p => p.pista)).subscribe({
      next: () => { this.pendientes = []; this.subiendo.set(false); this.recargarArchivos(); this.ok('Archivos subidos'); },
      error: e => { this.subiendo.set(false); this.error.set(e.message || 'Error al subir'); },
    });
  }

  private recargarArchivos() {
    const id = this.id();
    if (id) this.svc.obtener(id).subscribe(c => this.archivos.set(c.archivos || []));
  }

  renombrar(a: ArchivoCancion, pista: string) {
    this.svc.renombrarArchivo(a.idarchivos, pista).subscribe(() => this.recargarArchivos());
  }

  async eliminarArchivo(a: ArchivoCancion) {
    if (!(await confirmar(`¿Eliminar <b>${a.nombre_original}</b>?`, { peligro: true }))) return;
    this.svc.eliminarArchivo(a.idarchivos).subscribe(() => this.recargarArchivos());
  }

  url(a: ArchivoCancion) { return this.svc.urlArchivo(a.idarchivos); }
  tamano(b: number | null) { return b ? (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB') : ''; }
}
