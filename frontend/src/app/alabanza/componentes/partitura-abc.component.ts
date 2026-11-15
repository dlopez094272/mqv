import {
  AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, input, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Partitura interactiva (notación ABC) con abcjs:
 * se dibuja, se reproduce en el navegador y resalta la nota que suena.
 * abcjs se carga solo cuando se abre una partitura.
 */
@Component({
  selector: 'app-partitura-abc',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (error()) { <div class="alert alert-warning">{{ error() }}</div> }
    <div #papel class="partitura-papel"></div>
    @if (reproducible()) {
      <div #controles class="partitura-controles"></div>
      <div class="partitura-ayuda">▶ Reproduce la melodía · 🐢 cambia la velocidad para practicar · la nota que suena se resalta.</div>
    }
  `,
  styles: [`
    :host { display: block; }
    .partitura-papel { background: #fff; border-radius: 8px; overflow-x: auto; }
    .partitura-controles { margin-top: 10px; }
    .partitura-ayuda { font-size: 12px; color: var(--text-muted); margin-top: 6px; }
    :host ::ng-deep .abcjs-highlight { fill: #c62828 !important; }
    :host ::ng-deep .abcjs-cursor { stroke: #c62828; }
  `],
})
export class PartituraAbcComponent implements AfterViewInit, OnDestroy {
  abc          = input<string | null>('');
  semitonos    = input(0);
  reproducible = input(true);

  @ViewChild('papel', { static: true }) papel!: ElementRef<HTMLDivElement>;
  @ViewChild('controles') controles?: ElementRef<HTMLDivElement>;

  error = signal('');
  private abcjs: any = null;
  private synth: any = null;
  private listo = false;

  constructor() {
    effect(() => {
      // Redibujar al cambiar el texto o la transposición
      this.abc(); this.semitonos();
      if (this.listo) this.dibujar();
    });
  }

  async ngAfterViewInit() {
    try {
      const mod: any = await import('abcjs');
      this.abcjs = mod.default ?? mod;
      this.listo = true;
      this.dibujar();
    } catch {
      this.error.set('No se pudo cargar el motor de partituras.');
    }
  }

  ngOnDestroy() {
    try { this.synth?.pause(); } catch {}
  }

  private dibujar() {
    const texto = (this.abc() || '').trim();
    this.error.set('');
    if (!texto) { this.papel.nativeElement.innerHTML = ''; return; }
    const visual = this.abcjs.renderAbc(this.papel.nativeElement, texto, {
      responsive: 'resize',
      add_classes: true,
      visualTranspose: this.semitonos(),
      paddingtop: 10, paddingbottom: 10, paddingleft: 10, paddingright: 10,
    });
    const tune = visual?.[0];
    if (tune?.warnings?.length) this.error.set('Revisa la notación ABC: ' + String(tune.warnings[0]).replace(/<[^>]+>/g, ''));
    if (!this.reproducible() || !tune || !this.controles) return;
    if (!this.abcjs.synth.supportsAudio()) { this.error.set('Este navegador no puede reproducir audio.'); return; }

    if (!this.synth) {
      this.synth = new this.abcjs.synth.SynthController();
      const papel = this.papel.nativeElement;
      const cursor = {
        onEvent: (ev: any) => {
          papel.querySelectorAll('.abcjs-highlight').forEach(e => e.classList.remove('abcjs-highlight'));
          (ev.elements || []).flat().forEach((e: Element) => e.classList.add('abcjs-highlight'));
        },
        onFinished: () => papel.querySelectorAll('.abcjs-highlight').forEach(e => e.classList.remove('abcjs-highlight')),
      };
      this.synth.load(this.controles.nativeElement, cursor, {
        displayLoop: true, displayRestart: true, displayPlay: true, displayProgress: true, displayWarp: true,
      });
    }
    this.synth.setTune(tune, false, { chordsOff: false }).catch(() => {
      this.error.set('No se pudo preparar el audio de la partitura.');
    });
  }
}
