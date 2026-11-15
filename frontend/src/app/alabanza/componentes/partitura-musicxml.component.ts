import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Partitura MusicXML / MXL (lo que exportan MuseScore, Finale, Sibelius...)
 * dibujada con OpenSheetMusicDisplay. La librería se carga solo al abrirla.
 */
@Component({
  selector: 'app-partitura-musicxml',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (cargando()) { <div class="mx-estado">Dibujando partitura...</div> }
    @if (error()) { <div class="alert alert-warning">{{ error() }}</div> }
    <div class="mx-zoom" [class.oculto]="cargando() || !!error()">
      <button type="button" (click)="zoom(-0.1)">−</button>
      <span>{{ (nivel() * 100).toFixed(0) }}%</span>
      <button type="button" (click)="zoom(0.1)">+</button>
    </div>
    <div #papel class="mx-papel"></div>
  `,
  styles: [`
    :host { display: block; }
    .mx-papel { background: #fff; border-radius: 8px; overflow-x: auto; }
    .mx-estado { color: var(--text-muted); font-size: 13px; padding: 10px; }
    .mx-zoom { display: flex; gap: 6px; align-items: center; justify-content: flex-end; margin-bottom: 6px; font-size: 12px; color: var(--text-muted);
      button { border: 1px solid var(--border); background: #fff; border-radius: 6px; width: 28px; height: 26px; cursor: pointer; font-weight: 800; color: var(--primary); } }
    .oculto { display: none; }
  `],
})
export class PartituraMusicXmlComponent implements AfterViewInit, OnDestroy {
  /** URL (con token) del archivo .musicxml / .mxl / .xml */
  url = input.required<string>();

  @ViewChild('papel', { static: true }) papel!: ElementRef<HTMLDivElement>;
  cargando = signal(true);
  error    = signal('');
  nivel    = signal(1);
  private osmd: any = null;

  async ngAfterViewInit() {
    try {
      const [mod, resp]: [any, Response] = await Promise.all([
        import('opensheetmusicdisplay'),
        fetch(this.url()),
      ]);
      // La librería se publica como CommonJS: la clase puede venir directa o dentro de `default`
      const OpenSheetMusicDisplay = mod.OpenSheetMusicDisplay ?? mod.default?.OpenSheetMusicDisplay;
      if (!resp.ok) throw new Error(`No se pudo descargar el archivo (${resp.status})`);
      const blob = await resp.blob();
      this.osmd = new OpenSheetMusicDisplay(this.papel.nativeElement, {
        autoResize: true, drawTitle: true, drawPartNames: true, backend: 'svg',
      });
      await this.osmd.load(blob);
      this.osmd.render();
    } catch (e: any) {
      this.error.set('No se pudo dibujar la partitura MusicXML: ' + (e?.message || e));
    } finally {
      this.cargando.set(false);
    }
  }

  zoom(delta: number) {
    if (!this.osmd) return;
    this.nivel.set(Math.min(2, Math.max(0.4, Math.round((this.nivel() + delta) * 10) / 10)));
    this.osmd.zoom = this.nivel();
    this.osmd.render();
  }

  ngOnDestroy() { try { this.osmd?.clear(); } catch {} }
}
