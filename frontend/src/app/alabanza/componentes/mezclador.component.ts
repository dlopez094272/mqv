import { Component, ElementRef, OnDestroy, QueryList, ViewChildren, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface PistaMezclador { id: number; nombre: string; url: string; }

interface EstadoPista { volumen: number; mute: boolean; solo: boolean; }

/**
 * Mezclador multipista: reproduce todas las pistas de una canción a la vez,
 * sincronizadas. Cada músico puede silenciar su instrumento (o dejar solo uno)
 * y tocar encima de la banda. Velocidad ajustable para practicar.
 */
@Component({
  selector: 'app-mezclador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mezclador">
      <div class="mez-transporte">
        <button class="mez-play" (click)="alternar()" [disabled]="!pistas().length">{{ reproduciendo() ? '⏸' : '▶' }}</button>
        <button class="mez-btn" (click)="irA(0)" title="Al inicio">⏮</button>
        <button class="mez-btn" (click)="irA(tiempo() - 10)" title="Atrás 10 s">-10s</button>
        <button class="mez-btn" (click)="irA(tiempo() + 10)" title="Adelante 10 s">+10s</button>
        <span class="mez-tiempo">{{ fmt(tiempo()) }} / {{ fmt(duracion()) }}</span>
        <label class="mez-vel" title="Velocidad de práctica (sin cambiar el tono)">
          🐢
          <select [ngModel]="velocidad()" (ngModelChange)="cambiarVelocidad($event)">
            @for (v of velocidades; track v) { <option [ngValue]="v">{{ v * 100 }}%</option> }
          </select>
        </label>
        <label class="mez-loop"><input type="checkbox" [(ngModel)]="repetir" /> 🔁 Repetir</label>
      </div>
      <input type="range" class="mez-progreso" min="0" [max]="duracion() || 0" step="0.1"
             [ngModel]="tiempo()" (ngModelChange)="irA($event)" />

      @for (p of pistas(); track p.id; let i = $index) {
        <div class="mez-pista" [class.silenciada]="!suena(i)">
          <span class="mez-nombre" [title]="p.nombre">{{ p.nombre }}</span>
          @if (pistas().length > 1) {
            <button class="mez-tag" [class.on]="estado()[i]?.mute" (click)="toggle(i, 'mute')" title="Silenciar">M</button>
            <button class="mez-tag solo" [class.on]="estado()[i]?.solo" (click)="toggle(i, 'solo')" title="Solo esta pista">S</button>
          }
          <input type="range" min="0" max="1" step="0.05" [ngModel]="estado()[i]?.volumen ?? 1"
                 (ngModelChange)="volumen(i, $event)" />
          <audio #audio [src]="p.url" preload="metadata"
                 (loadedmetadata)="alCargar()" (timeupdate)="i === 0 && alAvanzar()" (ended)="i === 0 && alTerminar()"></audio>
        </div>
      }
      @if (pistas().length > 1) {
        <div class="mez-ayuda">M = silenciar · S = escuchar solo esa pista. Silencia tu instrumento y toca con la banda.</div>
      }
    </div>
  `,
  styles: [`
    .mezclador { background: linear-gradient(160deg, #214351 0%, #332940 100%); color: #fff; border-radius: 12px; padding: 14px 16px; }
    .mez-transporte { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .mez-play { width: 46px; height: 46px; border-radius: 50%; border: none; background: #fff; color: var(--primary); font-size: 20px; cursor: pointer; }
    .mez-btn { background: rgba(255,255,255,.12); color: #fff; border: none; border-radius: 6px; padding: 6px 9px; cursor: pointer; font-size: 12px; }
    .mez-tiempo { font-variant-numeric: tabular-nums; font-size: 13px; opacity: .85; margin-left: 4px; }
    .mez-vel, .mez-loop { font-size: 13px; display: inline-flex; align-items: center; gap: 4px; margin-left: auto; }
    .mez-loop { margin-left: 8px; }
    .mez-vel select { background: rgba(255,255,255,.15); color: #fff; border: none; border-radius: 6px; padding: 4px; }
    .mez-vel option { color: #000; }
    .mez-progreso { width: 100%; margin: 10px 0 6px; accent-color: #ffd166; }
    .mez-pista { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-top: 1px solid rgba(255,255,255,.08); }
    .mez-pista.silenciada { opacity: .45; }
    .mez-nombre { flex: 0 0 110px; font-weight: 700; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mez-pista input[type=range] { flex: 1; accent-color: #50B8D4; }
    .mez-tag { width: 28px; height: 26px; border-radius: 5px; border: 1px solid rgba(255,255,255,.3); background: transparent; color: #fff; font-weight: 800; cursor: pointer; font-size: 12px; }
    .mez-tag.on { background: #ef5350; border-color: #ef5350; }
    .mez-tag.solo.on { background: #ffd166; border-color: #ffd166; color: #332940; }
    .mez-ayuda { font-size: 11px; opacity: .7; margin-top: 6px; }
    audio { display: none; }
  `],
})
export class MezcladorComponent implements OnDestroy {
  pistas = input<PistaMezclador[]>([]);
  @ViewChildren('audio') audios!: QueryList<ElementRef<HTMLAudioElement>>;

  reproduciendo = signal(false);
  tiempo        = signal(0);
  duracion      = signal(0);
  velocidad     = signal(1);
  repetir       = false;
  readonly velocidades = [0.5, 0.75, 0.9, 1];
  private estados = signal<EstadoPista[]>([]);
  estado = computed(() => {
    const n = this.pistas().length;
    const e = this.estados();
    return Array.from({ length: n }, (_, i) => e[i] ?? { volumen: 1, mute: false, solo: false });
  });

  private get els() { return this.audios?.map(a => a.nativeElement) ?? []; }

  ngOnDestroy() { this.els.forEach(a => a.pause()); }

  suena(i: number) {
    const e = this.estado();
    const haySolo = e.some(x => x.solo);
    return haySolo ? e[i].solo : !e[i].mute;
  }

  private aplicarVolumenes() {
    this.els.forEach((a, i) => { a.volume = this.suena(i) ? this.estado()[i].volumen : 0; });
  }

  toggle(i: number, campo: 'mute' | 'solo') {
    const e = [...this.estado()];
    e[i] = { ...e[i], [campo]: !e[i][campo] };
    this.estados.set(e);
    this.aplicarVolumenes();
  }

  volumen(i: number, v: number) {
    const e = [...this.estado()];
    e[i] = { ...e[i], volumen: Number(v) };
    this.estados.set(e);
    this.aplicarVolumenes();
  }

  cambiarVelocidad(v: number) {
    this.velocidad.set(v);
    this.els.forEach(a => { a.playbackRate = v; (a as any).preservesPitch = true; });
  }

  alCargar() {
    this.duracion.set(Math.max(0, ...this.els.map(a => a.duration || 0)));
    this.aplicarVolumenes();
  }

  async alternar() {
    if (this.reproduciendo()) {
      this.els.forEach(a => a.pause());
      this.reproduciendo.set(false);
      return;
    }
    const t = this.els[0]?.currentTime ?? 0;
    this.els.forEach(a => { a.currentTime = t; a.playbackRate = this.velocidad(); });
    this.aplicarVolumenes();
    try {
      await Promise.all(this.els.map(a => a.play()));
      this.reproduciendo.set(true);
    } catch {
      this.els.forEach(a => a.pause());
    }
  }

  irA(seg: number) {
    const t = Math.max(0, Math.min(Number(seg) || 0, this.duracion() || 0));
    this.els.forEach(a => { a.currentTime = t; });
    this.tiempo.set(t);
  }

  alAvanzar() {
    const [maestro, ...resto] = this.els;
    if (!maestro) return;
    this.tiempo.set(maestro.currentTime);
    // Corrige desfases mayores a 80 ms entre pistas
    if (this.reproduciendo()) {
      resto.forEach(a => { if (Math.abs(a.currentTime - maestro.currentTime) > 0.08) a.currentTime = maestro.currentTime; });
    }
  }

  alTerminar() {
    if (this.repetir) { this.irA(0); this.reproduciendo.set(false); this.alternar(); return; }
    this.els.forEach(a => a.pause());
    this.reproduciendo.set(false);
  }

  fmt(s: number) {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  }
}
