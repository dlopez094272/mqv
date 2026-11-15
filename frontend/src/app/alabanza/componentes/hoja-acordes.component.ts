import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { acordeVisible, parsearChordPro, OpcionesVista } from '../chordpro';

/** Dibuja una letra ChordPro con los acordes encima de la sílaba exacta. */
@Component({
  selector: 'app-hoja-acordes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="hoja" [class.hoja--oscura]="oscuro()" [style.font-size.px]="tamano()">
      @for (l of cancion().lineas; track $index) {
        @switch (l.tipo) {
          @case ('seccion') {
            <div class="hoja-seccion" [attr.data-clase]="l.clase">{{ l.nombre }}</div>
          }
          @case ('comentario') { <div class="hoja-comentario">{{ l.texto }}</div> }
          @case ('vacia') { <div class="hoja-vacia"></div> }
          @case ('letra') {
            <div class="hoja-linea" [class.solo-acordes]="l.soloAcordes">
              @for (s of l.segmentos; track $index) {
                <span class="seg">
                  @if (mostrarAcordes()) {
                    <span class="acorde">{{ s.acorde ? ver(s.acorde) : '' }}</span>
                  }
                  <span class="texto">{{ s.texto || (s.acorde && mostrarAcordes() ? ' ' : '') }}</span>
                </span>
              }
            </div>
          }
        }
      } @empty {
        <div class="hoja-vacia-msg">Sin letra ni acordes todavía.</div>
      }
    </div>
  `,
  styles: [`
    .hoja { font-family: 'Segoe UI', Roboto, sans-serif; line-height: 1.25; color: var(--text); }
    .hoja-linea { display: flex; flex-wrap: wrap; align-items: flex-end; margin-bottom: 4px; }
    .seg { display: inline-flex; flex-direction: column; white-space: pre; }
    .acorde { color: var(--primary); font-weight: 800; font-size: .92em; min-height: 1.2em; padding-right: .35em; }
    .solo-acordes .texto { display: none; }
    .solo-acordes .acorde { padding-right: 1em; }
    .hoja-seccion {
      display: inline-block; margin: 14px 0 6px; padding: 2px 10px; border-radius: 12px;
      font-size: .72em; font-weight: 800; letter-spacing: .6px; text-transform: uppercase;
      background: #efeaf5; color: var(--primary);
    }
    .hoja-seccion[data-clase="coro"]   { background: #e3f1f6; color: var(--blue-dark); }
    .hoja-seccion[data-clase="puente"] { background: #fff3e0; color: #b45309; }
    .hoja-seccion[data-clase="intro"]  { background: #e8f5f0; color: var(--success); }
    .hoja-comentario { font-style: italic; color: var(--text-muted); font-size: .85em; margin: 4px 0; }
    .hoja-vacia { height: .8em; }
    .hoja-vacia-msg { color: var(--text-muted); font-style: italic; }
    .hoja--oscura { color: #f1f1f1; }
    .hoja--oscura .acorde { color: #ffd166; }
    .hoja--oscura .hoja-seccion { background: rgba(255,255,255,.12); color: #fff; }
    .hoja--oscura .hoja-comentario { color: #bbb; }
  `],
})
export class HojaAcordesComponent {
  texto          = input<string | null>('');
  semitonos      = input(0);
  bemoles        = input(false);
  nashville      = input(false);
  tonalidad      = input<string | null>(null);
  tamano         = input(17);
  oscuro         = input(false);
  mostrarAcordes = input(true);

  cancion = computed(() => parsearChordPro(this.texto()));
  private opciones = computed<OpcionesVista>(() => ({
    semitonos: this.semitonos(), bemoles: this.bemoles(),
    nashville: this.nashville(), tonalidad: this.tonalidad(),
  }));

  ver(acorde: string) { return acordeVisible(acorde, this.opciones()); }
}
