import { Injectable, signal, OnDestroy, inject } from '@angular/core';
import { NgZone } from '@angular/core';

export type EstadoSesion = 'activo' | 'advertencia' | 'bloqueado';

const INACTIVIDAD_MS  = 15 * 60 * 1000; // 15 minutos
const ADVERTENCIA_SEG = 60;              // 60 segundos de aviso antes de bloquear

@Injectable({ providedIn: 'root' })
export class InactividadService implements OnDestroy {
  private zone = inject(NgZone);

  readonly estado             = signal<EstadoSesion>('activo');
  readonly segundosRestantes  = signal(ADVERTENCIA_SEG);

  private ultimaActividad = Date.now();
  private checkTimer?: ReturnType<typeof setInterval>;
  private countdownTimer?: ReturnType<typeof setInterval>;

  private readonly EVENTOS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
  private readonly onActividad = () => this.registrarActividad();

  constructor() {
    this.iniciar();
  }

  iniciar() {
    this.ultimaActividad = Date.now();
    this.EVENTOS.forEach(ev =>
      document.addEventListener(ev, this.onActividad, { passive: true })
    );
    // Verificar cada 10 segundos fuera de la zona para no disparar change detection
    this.zone.runOutsideAngular(() => {
      this.checkTimer = setInterval(() => this.verificar(), 10_000);
    });
  }

  detener() {
    this.EVENTOS.forEach(ev => document.removeEventListener(ev, this.onActividad));
    clearInterval(this.checkTimer);
    this.pararCountdown();
    this.zone.run(() => this.estado.set('activo'));
  }

  continuar() {
    this.zone.run(() => {
      this.ultimaActividad = Date.now();
      this.estado.set('activo');
      this.pararCountdown();
    });
  }

  desbloquear() {
    this.continuar();
  }

  private registrarActividad() {
    if (this.estado() === 'bloqueado') return;
    this.ultimaActividad = Date.now();
    if (this.estado() === 'advertencia') {
      this.zone.run(() => {
        this.estado.set('activo');
        this.pararCountdown();
      });
    }
  }

  private verificar() {
    if (this.estado() === 'bloqueado') return;
    if (this.estado() === 'advertencia') return;
    const inactivo = Date.now() - this.ultimaActividad;
    if (inactivo >= INACTIVIDAD_MS) {
      this.zone.run(() => this.mostrarAdvertencia());
    }
  }

  private mostrarAdvertencia() {
    this.estado.set('advertencia');
    this.segundosRestantes.set(ADVERTENCIA_SEG);
    this.zone.runOutsideAngular(() => {
      this.countdownTimer = setInterval(() => {
        this.zone.run(() => {
          const restantes = this.segundosRestantes() - 1;
          if (restantes <= 0) {
            this.pararCountdown();
            this.estado.set('bloqueado');
          } else {
            this.segundosRestantes.set(restantes);
          }
        });
      }, 1000);
    });
  }

  private pararCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = undefined;
    }
  }

  ngOnDestroy() {
    this.detener();
  }
}
