import { Component, DestroyRef, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AlabanzaService, ArchivoCancion, Cancion, ETIQUETA_TIPO, ElementoPrograma, spotifyEmbed, youtubeId } from '../alabanza.service';
import {
  TONALIDADES, aTextoPlano, parsearChordPro, semitonosEntre, sugerenciasCapo, transponerTonalidad, usaBemoles,
} from '../chordpro';
import { HojaAcordesComponent } from '../componentes/hoja-acordes.component';
import { PartituraAbcComponent } from '../componentes/partitura-abc.component';
import { MezcladorComponent, PistaMezclador } from '../componentes/mezclador.component';
import { PartituraMusicXmlComponent } from '../componentes/partitura-musicxml.component';

/** ¿El archivo es una partitura MusicXML (.musicxml / .mxl / .xml)? */
export const esMusicXml = (a: ArchivoCancion) =>
  /\.(musicxml|mxl|xml)$/i.test(a.nombre_original) || /musicxml|recordare/i.test(a.mimetype || '');
import { PermisosService } from '../../core/services/permisos.service';

@Component({
  selector: 'app-cancion-ver',
  standalone: true,
  imports: [CommonModule, FormsModule, HojaAcordesComponent, PartituraAbcComponent, MezcladorComponent, PartituraMusicXmlComponent],
  templateUrl: './cancion-ver.html',
  styleUrl: './cancion-ver.scss',
})
export class CancionVerComponent implements OnInit, OnDestroy {
  private svc       = inject(AlabanzaService);
  private route     = inject(ActivatedRoute);
  private router    = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private destroyRef = inject(DestroyRef);
  permisos          = inject(PermisosService);

  readonly tonalidades = TONALIDADES;
  readonly etiquetaTipo = ETIQUETA_TIPO;

  cancion   = signal<Cancion | null>(null);
  cargando  = signal(true);
  error     = signal('');
  aviso     = signal('');

  semitonos   = signal(0);
  nashville   = signal(false);
  tamano      = signal(18);
  dosColumnas = signal(false);
  soloLetra   = signal(false);
  /** Tonalidad pedida por el programa de la actividad (?tono=A). */
  tonoDelDia  = signal<string | null>(null);
  idActividad = signal<number | null>(null);

  tonalidadActual = computed(() => transponerTonalidad(this.cancion()?.tonalidad, this.semitonos()));
  bemoles         = computed(() => usaBemoles(this.tonalidadActual()));
  capos           = computed(() => sugerenciasCapo(this.tonalidadActual()));
  audios          = computed(() => (this.cancion()?.archivos || []).filter(a => a.tipo === 'audio'));
  documentos      = computed(() => (this.cancion()?.archivos || []).filter(a => a.tipo !== 'audio' && !esMusicXml(a)));
  musicXml        = computed(() => (this.cancion()?.archivos || []).filter(a => a.tipo !== 'audio' && esMusicXml(a)));

  // ── Repertorio del servicio (cuando se llega desde el programa de una actividad) ──
  nombreActividad = signal('');
  repertorio      = signal<ElementoPrograma[]>([]);
  /** Posición (0..n-1) de esta canción dentro del repertorio. */
  posicion        = signal(-1);
  anterior        = computed(() => this.repertorio()[this.posicion() - 1] ?? null);
  siguiente       = computed(() => this.repertorio()[this.posicion() + 1] ?? null);
  pistas          = computed<PistaMezclador[]>(() => this.audios().map(a => ({
    id: a.idarchivos, nombre: a.pista || a.nombre_original, url: this.svc.urlArchivo(a.idarchivos),
  })));
  youtube = computed<SafeResourceUrl | null>(() => {
    const id = youtubeId(this.cancion()?.youtube_url);
    return id ? this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube-nocookie.com/embed/${id}`) : null;
  });
  spotify = computed<SafeResourceUrl | null>(() => {
    const u = spotifyEmbed(this.cancion()?.spotify_url);
    return u ? this.sanitizer.bypassSecurityTrustResourceUrl(u) : null;
  });

  // ── Metrónomo ──
  metronomo = signal(false);
  pulso     = signal(0);
  private metroTimer: any = null;
  private audioCtx: AudioContext | null = null;

  // ── Modo escenario ──
  escenario    = signal(false);
  autoScroll   = signal(false);
  velocidad    = signal(1);
  @ViewChild('escenarioScroll') escenarioScroll?: ElementRef<HTMLDivElement>;
  private scrollRaf = 0;
  private scrollAcum = 0;

  ngOnInit() {
    // El mismo componente se reutiliza al pasar a la canción siguiente: se escuchan los cambios de URL.
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([pm, qp]) => this.cargar(Number(pm.get('id')), qp.get('tono'), Number(qp.get('act')) || null, qp.get('pos')));
  }

  private cargar(id: number, tono: string | null, act: number | null, pos: string | null) {
    this.pararMetronomo();
    this.autoScroll.set(false);
    this.tonoDelDia.set(tono);
    this.semitonos.set(0);
    this.error.set('');
    if (!this.cancion() || this.cancion()!.idcanciones !== id) this.cargando.set(true);

    // Repertorio: se carga una vez por actividad
    if (act && act !== this.idActividad()) {
      this.svc.programa(act).subscribe({
        next: p => {
          this.nombreActividad.set(p.actividad.nombre);
          this.repertorio.set(p.programa.filter(i => i.tipo === 'cancion' && i.idcanciones));
          this.ubicar(id, pos);
        },
        error: () => this.repertorio.set([]),
      });
    } else if (!act) {
      this.repertorio.set([]);
      this.nombreActividad.set('');
    }
    this.idActividad.set(act);
    this.ubicar(id, pos);

    this.svc.obtener(id).subscribe({
      next: c => {
        this.cancion.set(c);
        if (tono && c.tonalidad) this.semitonos.set(semitonosEntre(c.tonalidad, tono));
        this.cargando.set(false);
        this.escenarioScroll?.nativeElement.scrollTo({ top: 0 });
        window.scrollTo({ top: 0 });
      },
      error: e => { this.error.set(e.message || 'No se pudo cargar la canción'); this.cargando.set(false); },
    });
  }

  private ubicar(id: number, pos: string | null) {
    const lista = this.repertorio();
    const p = pos !== null ? Number(pos) : NaN;
    this.posicion.set(lista[p]?.idcanciones === id ? p : lista.findIndex(i => i.idcanciones === id));
  }

  irA(item: ElementoPrograma | null, delta: number) {
    if (!item?.idcanciones) return;
    const qp: any = { act: this.idActividad(), pos: this.posicion() + delta };
    if (item.tonalidad) qp.tono = item.tonalidad;
    this.router.navigate(['/alabanza', item.idcanciones], { queryParams: qp, replaceUrl: true });
  }

  ngOnDestroy() { this.pararMetronomo(); cancelAnimationFrame(this.scrollRaf); }

  /* ── Tonalidad ─────────────────────────────────── */
  subir()  { this.semitonos.set(this.normalizar(this.semitonos() + 1)); }
  bajar()  { this.semitonos.set(this.normalizar(this.semitonos() - 1)); }
  original() { this.semitonos.set(0); }
  irATono(t: string) { this.semitonos.set(semitonosEntre(this.cancion()?.tonalidad, t)); }
  private normalizar(n: number) { return n > 6 ? n - 12 : n < -5 ? n + 12 : n; }
  aplicarCapo(capo: number) { this.semitonos.set(this.normalizar(this.semitonos() - capo)); this.aviso.set(`Capo en traste ${capo}: toca estas formas y sonará en la tonalidad anterior.`); setTimeout(() => this.aviso.set(''), 5000); }

  /* ── Acciones ──────────────────────────────────── */
  async copiar() {
    const c = this.cancion(); if (!c) return;
    const texto = `${c.titulo}${c.autor ? ' - ' + c.autor : ''}\nTono: ${this.tonalidadActual() || '—'}${c.bpm ? ' · ' + c.bpm + ' BPM' : ''}\n\n`
      + aTextoPlano(parsearChordPro(c.letra_acordes), {
        semitonos: this.semitonos(), bemoles: this.bemoles(), nashville: this.nashville(), tonalidad: this.tonalidadActual(),
      });
    try { await navigator.clipboard.writeText(texto); this.aviso.set('Copiado. Pégalo en WhatsApp o donde quieras.'); }
    catch { this.aviso.set('No se pudo copiar'); }
    setTimeout(() => this.aviso.set(''), 3500);
  }

  imprimir() { window.print(); }
  editar() { this.router.navigate(['/alabanza', this.cancion()!.idcanciones, 'editar']); }
  volver() {
    if (this.idActividad()) this.router.navigate(['/actividades', this.idActividad(), 'gestion'], { queryParams: { tab: 'programa' } });
    else this.router.navigate(['/alabanza']);
  }
  urlArchivo(a: ArchivoCancion) { return this.svc.urlArchivo(a.idarchivos); }

  /* ── Metrónomo (click con Web Audio) ───────────── */
  alternarMetronomo() { this.metronomo() ? this.pararMetronomo() : this.iniciarMetronomo(); }

  private iniciarMetronomo() {
    const bpm = this.cancion()?.bpm; if (!bpm) return;
    const tiempos = Number((this.cancion()?.compas || '4/4').split('/')[0]) || 4;
    this.audioCtx ??= new AudioContext();
    this.metronomo.set(true);
    let n = 0;
    const tick = () => {
      const acento = n % tiempos === 0;
      this.pulso.set((n % tiempos) + 1);
      const ctx = this.audioCtx!;
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.frequency.value = acento ? 1500 : 1000;
      g.gain.setValueAtTime(0.25, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(g).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.07);
      n++;
    };
    tick();
    this.metroTimer = setInterval(tick, 60000 / bpm);
  }

  private pararMetronomo() {
    clearInterval(this.metroTimer); this.metroTimer = null;
    this.metronomo.set(false); this.pulso.set(0);
  }

  /* ── Modo escenario ────────────────────────────── */
  abrirEscenario() {
    this.escenario.set(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  }
  cerrarEscenario() {
    this.escenario.set(false); this.autoScroll.set(false);
    cancelAnimationFrame(this.scrollRaf);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
  alternarScroll() {
    this.autoScroll.set(!this.autoScroll());
    if (this.autoScroll()) {
      let ultimo = performance.now();
      const paso = (t: number) => {
        const el = this.escenarioScroll?.nativeElement;
        if (!el || !this.autoScroll()) return;
        // Más rápido en canciones rápidas: ~ (BPM/80) * 18 px/s
        const pxPorSeg = ((this.cancion()?.bpm || 80) / 80) * 18 * this.velocidad();
        this.scrollAcum += pxPorSeg * (t - ultimo) / 1000;
        ultimo = t;
        if (this.scrollAcum >= 1) { el.scrollTop += Math.floor(this.scrollAcum); this.scrollAcum %= 1; }
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) { this.autoScroll.set(false); return; }
        this.scrollRaf = requestAnimationFrame(paso);
      };
      this.scrollRaf = requestAnimationFrame(paso);
    }
  }

  /** Pedales Bluetooth envían Re Pág / Av Pág o flechas: funcionan sin configurar nada. */
  @HostListener('document:keydown', ['$event'])
  teclas(ev: KeyboardEvent) {
    if (!this.escenario()) return;
    const el = this.escenarioScroll?.nativeElement;
    if (!el) return;
    const pagina = el.clientHeight * 0.8;
    switch (ev.key) {
      case 'PageDown': case 'ArrowDown': case 'ArrowRight':
        // Pedal al final de la canción → siguiente canción del repertorio
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4 && this.siguiente()) this.irA(this.siguiente(), 1);
        else el.scrollBy({ top: pagina, behavior: 'smooth' });
        break;
      case 'PageUp': case 'ArrowUp': case 'ArrowLeft':
        if (el.scrollTop <= 2 && this.anterior()) this.irA(this.anterior(), -1);
        else el.scrollBy({ top: -pagina, behavior: 'smooth' });
        break;
      case 'n': case 'N': if (this.siguiente()) this.irA(this.siguiente(), 1); break;
      case 'p': case 'P': if (this.anterior()) this.irA(this.anterior(), -1); break;
      case ' ': this.alternarScroll(); break;
      case '+': case '=': this.tamano.set(Math.min(48, this.tamano() + 2)); break;
      case '-': this.tamano.set(Math.max(12, this.tamano() - 2)); break;
      case 'Escape': this.cerrarEscenario(); return;
      default: return;
    }
    ev.preventDefault();
  }
}
