import {
  Component, ElementRef, HostListener, OnDestroy, computed, effect, inject, signal, untracked, viewChild,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { ArchivoVisor, TipoVista, VisorArchivosService, iconoArchivo, mimeDe, tipoVista } from './visor-archivos.service';

const VELOCIDADES = [0.5, 0.75, 1, 1.25, 1.5, 2];

/**
 * Visor modal de archivos: PDF (visor del navegador), imágenes (zoom, giro y
 * arrastre), reproductor de audio (MP3, M4A, WAV, OGG…), video y texto.
 * Se coloca una sola vez en la raíz (App) y se controla con VisorArchivosService.
 */
@Component({
  selector: 'app-visor-archivos',
  standalone: true,
  template: `
@if (svc.abierto() && actual(); as a) {
  <div class="va-fondo" (click)="clickFondo($event)">
    <header class="va-barra" (click)="$event.stopPropagation()">
      <span class="va-icono">{{ icono() }}</span>
      <span class="va-nombre" [title]="a.nombre">{{ a.nombre }}</span>
      @if (svc.lista().length > 1) {
        <span class="va-contador">{{ svc.indice() + 1 }} / {{ svc.lista().length }}</span>
      }
      <span class="va-sep"></span>
      @if (tipo() === 'imagen' && objUrl()) {
        <button type="button" class="va-btn" (click)="zoomar(-1)" title="Alejar (−)">−</button>
        <button type="button" class="va-btn va-zoom" (click)="ajustar()" title="Ajustar a la pantalla (0)">{{ porcentaje() }}</button>
        <button type="button" class="va-btn" (click)="zoomar(1)" title="Acercar (+)">+</button>
        <button type="button" class="va-btn" (click)="girar()" title="Girar (R)">⟳</button>
      }
      @if (objUrl() || a.url) {
        <button type="button" class="va-btn" (click)="nuevaPestana()" title="Abrir en una pestaña nueva">↗</button>
      }
      <button type="button" class="va-btn" (click)="descargar()" [disabled]="descargando()" title="Descargar">⬇</button>
      <button type="button" class="va-btn va-cerrar" (click)="svc.cerrar()" title="Cerrar (Esc)">✕</button>
    </header>

    <main class="va-cuerpo">
      @if (svc.lista().length > 1) {
        <button type="button" class="va-nav va-prev" (click)="mover(-1); $event.stopPropagation()" [disabled]="svc.indice() === 0" title="Anterior (←)">‹</button>
        <button type="button" class="va-nav va-next" (click)="mover(1); $event.stopPropagation()" [disabled]="svc.indice() === svc.lista().length - 1" title="Siguiente (→)">›</button>
      }

      @if (cargando()) {
        <div class="va-msg"><span class="va-spinner"></span> Cargando…</div>
      } @else if (error()) {
        <div class="va-msg va-card" (click)="$event.stopPropagation()">
          <div class="va-msg-icono">⚠️</div>
          <div>{{ error() }}</div>
        </div>
      } @else {
        @switch (tipo()) {
          @case ('pdf') {
            <iframe class="va-pdf" [src]="pdfSeguro()" title="Vista previa PDF" (click)="$event.stopPropagation()"></iframe>
          }
          @case ('imagen') {
            <div #lienzo class="va-lienzo" [class.va-movible]="zoom() > 1"
                 (wheel)="rueda($event)" (pointerdown)="iniciarArrastre($event)"
                 (pointermove)="arrastrar($event)" (pointerup)="finArrastre()" (pointercancel)="finArrastre()"
                 (dblclick)="dobleClic()">
              <img class="va-img" [src]="objUrl()" [alt]="a.nombre" draggable="false"
                   [style.transform]="transformacion()" (click)="$event.stopPropagation()" />
            </div>
          }
          @case ('audio') {
            <div class="va-audio va-card" (click)="$event.stopPropagation()">
              <div class="va-disco" [class.va-girando]="reproduciendo()">🎵</div>
              <div class="va-audio-titulo" [title]="a.nombre">{{ a.nombre }}</div>
              <input class="va-progreso" type="range" min="0" [max]="duracion() || 0" step="0.1"
                     [value]="tiempo()" (input)="buscar($event)" [style.--p]="progresoPct() + '%'" />
              <div class="va-tiempos"><span>{{ fmt(tiempo()) }}</span><span>{{ fmt(duracion()) }}</span></div>
              <div class="va-controles">
                <button type="button" class="va-ctl" (click)="saltar(-10)" title="Atrás 10 s">⏪<small>10</small></button>
                <button type="button" class="va-ctl va-play" (click)="alternarAudio()" [title]="reproduciendo() ? 'Pausa (espacio)' : 'Reproducir (espacio)'">
                  {{ reproduciendo() ? '❚❚' : '▶' }}
                </button>
                <button type="button" class="va-ctl" (click)="saltar(10)" title="Adelante 10 s">⏩<small>10</small></button>
              </div>
              <div class="va-extra">
                <button type="button" class="va-chip" [class.va-on]="repetir()" (click)="alternarRepetir()" title="Repetir">🔁 Repetir</button>
                <button type="button" class="va-chip" (click)="cambiarVelocidad()" title="Velocidad">{{ velocidad() }}×</button>
                <label class="va-vol" title="Volumen">
                  <span (click)="silenciar()">{{ volumen() === 0 ? '🔇' : '🔊' }}</span>
                  <input type="range" min="0" max="1" step="0.05" [value]="volumen()" (input)="cambiarVolumen($event)" />
                </label>
              </div>
              <audio #audio [src]="fuenteMedia()" preload="metadata"
                     (loadedmetadata)="alCargarMeta()" (durationchange)="alCargarMeta()" (timeupdate)="alAvanzar()"
                     (play)="reproduciendo.set(true)" (pause)="reproduciendo.set(false)" (ended)="alTerminar()"
                     (error)="errorMedia()"></audio>
            </div>
          }
          @case ('video') {
            <video class="va-video" [src]="fuenteMedia()" controls autoplay playsinline
                   (click)="$event.stopPropagation()" (error)="errorMedia()"></video>
          }
          @case ('texto') {
            <pre class="va-texto va-card" (click)="$event.stopPropagation()">{{ texto() }}</pre>
          }
          @default {
            <div class="va-msg va-card" (click)="$event.stopPropagation()">
              <div class="va-msg-icono">{{ icono() }}</div>
              <div>No hay vista previa para este tipo de archivo.</div>
              <button type="button" class="va-boton" (click)="descargar()">⬇ Descargar</button>
            </div>
          }
        }
      }
    </main>
  </div>
}
  `,
  styles: [`
    .va-fondo { position: fixed; inset: 0; z-index: 3000; background: rgba(20,16,26,.92); display: flex; flex-direction: column; animation: va-in .15s ease-out; }
    @keyframes va-in { from { opacity: 0; } }
    .va-barra { display: flex; align-items: center; gap: .35rem; padding: .5rem .75rem; color: #fff; background: rgba(0,0,0,.35); min-height: 52px; }
    .va-icono { font-size: 1.2rem; }
    .va-nombre { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; flex: 0 1 auto; }
    .va-contador { font-size: .8rem; opacity: .7; white-space: nowrap; margin-left: .25rem; }
    .va-sep { flex: 1; }
    .va-btn { background: rgba(255,255,255,.1); color: #fff; border: 0; border-radius: 8px; min-width: 36px; height: 36px; padding: 0 .5rem; font-size: 1.05rem; cursor: pointer; flex-shrink: 0; }
    .va-btn:hover:not(:disabled) { background: rgba(255,255,255,.22); }
    .va-btn:disabled { opacity: .45; cursor: default; }
    .va-zoom { font-size: .8rem; min-width: 56px; }
    .va-cerrar:hover { background: #c62828 !important; }
    .va-cuerpo { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: .75rem; }
    .va-nav { position: absolute; top: 50%; transform: translateY(-50%); z-index: 2; width: 44px; height: 64px; border: 0; border-radius: 10px; background: rgba(255,255,255,.12); color: #fff; font-size: 2rem; cursor: pointer; }
    .va-nav:hover:not(:disabled) { background: rgba(255,255,255,.25); }
    .va-nav:disabled { opacity: .2; cursor: default; }
    .va-prev { left: .5rem; } .va-next { right: .5rem; }
    .va-msg { color: #fff; display: flex; flex-direction: column; align-items: center; gap: .75rem; text-align: center; }
    .va-msg-icono { font-size: 3rem; }
    .va-card { background: #2a2333; border-radius: 14px; padding: 1.5rem; box-shadow: 0 10px 40px rgba(0,0,0,.4); color: #fff; }
    .va-boton { background: var(--primary-light, #836AA3); color: #fff; border: 0; border-radius: 8px; padding: .55rem 1.1rem; cursor: pointer; font-weight: 600; }
    .va-spinner { width: 28px; height: 28px; border: 3px solid rgba(255,255,255,.25); border-top-color: #fff; border-radius: 50%; animation: va-giro .8s linear infinite; }
    @keyframes va-giro { to { transform: rotate(360deg); } }
    .va-pdf { width: min(1100px, 100%); height: 100%; border: 0; border-radius: 8px; background: #fff; }
    .va-lienzo { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; touch-action: none; user-select: none; }
    .va-movible { cursor: grab; }
    .va-movible:active { cursor: grabbing; }
    .va-img { max-width: 100%; max-height: 100%; object-fit: contain; transition: transform .12s ease-out; box-shadow: 0 6px 30px rgba(0,0,0,.5); background: repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 0 0 / 16px 16px; }
    .va-video { max-width: 100%; max-height: 100%; border-radius: 8px; background: #000; }
    .va-texto { width: min(900px, 100%); max-height: 100%; overflow: auto; margin: 0; white-space: pre-wrap; word-break: break-word; font-size: .85rem; text-align: left; }
    .va-audio { width: min(440px, 100%); display: flex; flex-direction: column; align-items: center; gap: .6rem; }
    .va-disco { width: 140px; height: 140px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 3.5rem;
      background: radial-gradient(circle, #2a2333 0 18%, transparent 19%), conic-gradient(from 0deg, #57446C, #53819A, #40996D, #836AA3, #57446C); box-shadow: 0 6px 24px rgba(0,0,0,.45); }
    .va-girando { animation: va-giro 6s linear infinite; }
    .va-audio-titulo { font-weight: 600; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .va-progreso { width: 100%; accent-color: #A688BF; cursor: pointer; }
    .va-tiempos { width: 100%; display: flex; justify-content: space-between; font-size: .78rem; opacity: .75; font-variant-numeric: tabular-nums; }
    .va-controles { display: flex; align-items: center; gap: 1.1rem; }
    .va-ctl { background: rgba(255,255,255,.1); border: 0; color: #fff; width: 48px; height: 48px; border-radius: 50%; cursor: pointer; font-size: 1rem; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1; }
    .va-ctl small { font-size: .6rem; opacity: .8; }
    .va-ctl:hover { background: rgba(255,255,255,.22); }
    .va-play { width: 64px; height: 64px; font-size: 1.4rem; background: var(--primary-light, #836AA3); }
    .va-play:hover { background: var(--purple-lighter, #A688BF); }
    .va-extra { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; justify-content: center; margin-top: .25rem; }
    .va-chip { background: rgba(255,255,255,.1); border: 1px solid transparent; color: #fff; border-radius: 999px; padding: .3rem .75rem; cursor: pointer; font-size: .8rem; }
    .va-on { border-color: #A688BF; background: rgba(166,136,191,.3); }
    .va-vol { display: flex; align-items: center; gap: .35rem; font-size: .95rem; cursor: pointer; }
    .va-vol input { width: 90px; accent-color: #A688BF; }
    @media (max-width: 640px) {
      .va-barra { flex-wrap: wrap; }
      .va-nombre { flex: 1 1 60%; }
      .va-cuerpo { padding: .25rem; }
      .va-nav { width: 36px; height: 52px; font-size: 1.6rem; }
    }
  `],
})
export class VisorArchivosComponent implements OnDestroy {
  readonly svc = inject(VisorArchivosService);
  private sanitizer = inject(DomSanitizer);

  private audioRef  = viewChild<ElementRef<HTMLAudioElement>>('audio');
  private lienzoRef = viewChild<ElementRef<HTMLDivElement>>('lienzo');

  actual = computed<ArchivoVisor | null>(() => this.svc.lista()[this.svc.indice()] ?? null);
  tipo   = computed<TipoVista>(() => { const a = this.actual(); return a ? tipoVista(a.nombre, a.mime) : 'otro'; });
  icono  = computed(() => { const a = this.actual(); return a ? iconoArchivo(a.nombre, a.mime) : '📎'; });

  cargando    = signal(false);
  error       = signal('');
  descargando = signal(false);
  objUrl      = signal<string | null>(null);
  texto       = signal('');
  private blob: Blob | null = null;
  private carga = 0;

  /** URL de la que se reproduce audio/video: streaming directo si hay `url`, si no el blob. */
  fuenteMedia = computed(() => this.objUrl() || this.actual()?.url || '');
  pdfSeguro   = computed<SafeResourceUrl | null>(() => {
    const u = this.objUrl();
    return u ? this.sanitizer.bypassSecurityTrustResourceUrl(u + '#view=FitH') : null;
  });

  // Imagen
  zoom    = signal(1);
  giro    = signal(0);
  despX   = signal(0);
  despY   = signal(0);
  porcentaje     = computed(() => `${Math.round(this.zoom() * 100)}%`);
  transformacion = computed(() => `translate(${this.despX()}px, ${this.despY()}px) scale(${this.zoom()}) rotate(${this.giro()}deg)`);
  private arrastre: { x: number; y: number; dx: number; dy: number } | null = null;

  // Audio
  reproduciendo = signal(false);
  tiempo        = signal(0);
  duracion      = signal(0);
  volumen       = signal(1);
  velocidad     = signal(1);
  repetir       = signal(false);
  progresoPct   = computed(() => this.duracion() ? (this.tiempo() / this.duracion()) * 100 : 0);
  private volumenPrevio = 1;

  constructor() {
    effect(() => {
      const a = this.actual();
      const abierto = this.svc.abierto();
      untracked(() => (abierto && a) ? this.cargar(a) : this.limpiar());
    });
    effect(() => {
      // Bloquea el scroll de la página mientras el visor está abierto
      document.body.style.overflow = this.svc.abierto() ? 'hidden' : '';
    });
  }

  ngOnDestroy() { this.limpiar(); document.body.style.overflow = ''; }

  private limpiar() {
    this.carga++;
    const u = this.objUrl();
    if (u) URL.revokeObjectURL(u);
    this.objUrl.set(null);
    this.blob = null;
    this.texto.set('');
    this.error.set('');
    this.cargando.set(false);
    this.zoom.set(1); this.giro.set(0); this.despX.set(0); this.despY.set(0);
    this.reproduciendo.set(false); this.tiempo.set(0); this.duracion.set(0);
  }

  private async cargar(a: ArchivoVisor) {
    this.limpiar();
    const id = this.carga;
    const tipo = tipoVista(a.nombre, a.mime);
    // Audio y video con URL directa se reproducen por streaming (sin descargar todo)
    if ((tipo === 'audio' || tipo === 'video') && a.url) return;
    if (tipo === 'otro') return;

    this.cargando.set(true);
    try {
      const blob = await this.obtenerBlob(a);
      if (id !== this.carga) return;
      this.blob = blob;
      if (tipo === 'texto') {
        this.texto.set(blob.size > 2_000_000 ? (await blob.slice(0, 2_000_000).text()) + '\n…' : await blob.text());
      } else {
        this.objUrl.set(URL.createObjectURL(blob));
      }
    } catch {
      if (id === this.carga) this.error.set('No se pudo cargar el archivo. Verifique su conexión o sus permisos.');
    } finally {
      if (id === this.carga) this.cargando.set(false);
    }
  }

  /** Descarga el contenido y lo devuelve como Blob con el MIME correcto (necesario para el visor PDF). */
  private async obtenerBlob(a: ArchivoVisor): Promise<Blob> {
    let blob: Blob;
    if (a.obtener) blob = await firstValueFrom(a.obtener());
    else if (a.url) {
      const r = await fetch(a.url);
      if (!r.ok) throw new Error(String(r.status));
      blob = await r.blob();
    } else throw new Error('Sin origen');
    const mime = mimeDe(a.nombre, a.mime || blob.type);
    return blob.type === mime ? blob : new Blob([blob], { type: mime });
  }

  // ── Barra ──────────────────────────────────────────────────
  async descargar() {
    const a = this.actual();
    if (!a || this.descargando()) return;
    this.descargando.set(true);
    try {
      const blob = this.blob ?? await this.obtenerBlob(a);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = a.nombre;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      this.error.set('No se pudo descargar el archivo.');
    } finally {
      this.descargando.set(false);
    }
  }

  nuevaPestana() {
    const u = this.objUrl() || this.actual()?.url;
    if (u) window.open(u, '_blank', 'noopener');
  }

  mover(d: number) {
    const n = this.svc.indice() + d;
    if (n >= 0 && n < this.svc.lista().length) this.svc.indice.set(n);
  }

  clickFondo(e: MouseEvent) {
    // Cerrar al hacer clic fuera del contenido (no sobre el lienzo de imagen con zoom)
    const t = e.target as HTMLElement;
    if (t.classList.contains('va-cuerpo') || t.classList.contains('va-fondo') || (t.classList.contains('va-lienzo') && this.zoom() <= 1)) {
      this.svc.cerrar();
    }
  }

  @HostListener('document:keydown', ['$event'])
  teclado(e: KeyboardEvent) {
    if (!this.svc.abierto()) return;
    const enCampo = (e.target as HTMLElement)?.tagName === 'INPUT';
    switch (e.key) {
      case 'Escape': this.svc.cerrar(); break;
      case 'ArrowLeft':  if (!enCampo) { this.mover(-1); e.preventDefault(); } break;
      case 'ArrowRight': if (!enCampo) { this.mover(1); e.preventDefault(); } break;
      case ' ':
        if (this.tipo() === 'audio' && !enCampo) { this.alternarAudio(); e.preventDefault(); }
        break;
      case '+': case '=': if (this.tipo() === 'imagen') this.zoomar(1); break;
      case '-': if (this.tipo() === 'imagen') this.zoomar(-1); break;
      case '0': if (this.tipo() === 'imagen') this.ajustar(); break;
      case 'r': case 'R': if (this.tipo() === 'imagen') this.girar(); break;
    }
  }

  // ── Imagen ────────────────────────────────────────────────
  zoomar(d: number) {
    const z = Math.min(8, Math.max(0.25, +(this.zoom() * (d > 0 ? 1.25 : 0.8)).toFixed(3)));
    this.zoom.set(z);
    if (z <= 1) { this.despX.set(0); this.despY.set(0); }
  }
  ajustar() { this.zoom.set(1); this.despX.set(0); this.despY.set(0); }
  girar() { this.giro.update(g => (g + 90) % 360); }
  dobleClic() { this.zoom() > 1 ? this.ajustar() : this.zoom.set(2.5); }
  rueda(e: WheelEvent) { e.preventDefault(); this.zoomar(e.deltaY < 0 ? 1 : -1); }

  iniciarArrastre(e: PointerEvent) {
    if (this.zoom() <= 1) return;
    this.arrastre = { x: e.clientX, y: e.clientY, dx: this.despX(), dy: this.despY() };
    this.lienzoRef()?.nativeElement.setPointerCapture(e.pointerId);
  }
  arrastrar(e: PointerEvent) {
    if (!this.arrastre) return;
    this.despX.set(this.arrastre.dx + e.clientX - this.arrastre.x);
    this.despY.set(this.arrastre.dy + e.clientY - this.arrastre.y);
  }
  finArrastre() { this.arrastre = null; }

  // ── Audio ─────────────────────────────────────────────────
  private get audio() { return this.audioRef()?.nativeElement; }

  alternarAudio() {
    const a = this.audio;
    if (!a) return;
    a.paused ? a.play().catch(() => this.errorMedia()) : a.pause();
  }
  saltar(s: number) {
    const a = this.audio;
    if (a) a.currentTime = Math.min(Math.max(0, a.currentTime + s), a.duration || 0);
  }
  buscar(e: Event) {
    const a = this.audio;
    if (a) a.currentTime = +(e.target as HTMLInputElement).value;
  }
  alCargarMeta() {
    const a = this.audio;
    if (!a) return;
    this.duracion.set(isFinite(a.duration) ? a.duration : 0);
    a.volume = this.volumen();
    a.playbackRate = this.velocidad();
    a.loop = this.repetir();
  }
  alAvanzar() { this.tiempo.set(this.audio?.currentTime ?? 0); }
  alTerminar() {
    this.reproduciendo.set(false);
    // En una lista, pasa al siguiente audio automáticamente
    const sig = this.svc.lista()[this.svc.indice() + 1];
    if (sig && tipoVista(sig.nombre, sig.mime) === 'audio') this.mover(1);
  }
  cambiarVolumen(e: Event) {
    const v = +(e.target as HTMLInputElement).value;
    this.volumen.set(v);
    if (this.audio) this.audio.volume = v;
  }
  silenciar() {
    if (this.volumen() > 0) { this.volumenPrevio = this.volumen(); this.volumen.set(0); }
    else this.volumen.set(this.volumenPrevio || 1);
    if (this.audio) this.audio.volume = this.volumen();
  }
  cambiarVelocidad() {
    const i = VELOCIDADES.indexOf(this.velocidad());
    const v = VELOCIDADES[(i + 1) % VELOCIDADES.length];
    this.velocidad.set(v);
    if (this.audio) this.audio.playbackRate = v;
  }
  alternarRepetir() {
    this.repetir.update(r => !r);
    if (this.audio) this.audio.loop = this.repetir();
  }
  errorMedia() { this.error.set('No se pudo reproducir el archivo. Puede que el formato no sea compatible con este navegador.'); }

  fmt(s: number) {
    if (!s || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60), ss = Math.floor(s % 60);
    return `${m}:${ss.toString().padStart(2, '0')}`;
  }
}
