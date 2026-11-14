import { Component, input, output, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormulariosService } from './formularios.service';

/** Modal con la URL del formulario y su código QR (descargable como PNG). */
@Component({
  selector:   'app-formulario-compartir',
  standalone: true,
  imports:    [CommonModule],
  template: `
    <div class="modal-overlay" (click)="cerrar.emit()">
      <div class="modal compartir-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Compartir formulario</h3>
          <button class="btn-close" (click)="cerrar.emit()" title="Cerrar">✕</button>
        </div>
        <div class="modal-body">
          <div class="compartir-titulo">{{ titulo() }}</div>
          <div class="compartir-visibilidad" [class.publico]="publico()">
            {{ publico() ? '🌐 Público: cualquiera con el enlace puede responder'
                         : '🔒 Privado: solo usuarios del sistema (deben iniciar sesión)' }}
          </div>

          <label class="compartir-label">Enlace</label>
          <div class="compartir-url">
            <input type="text" readonly [value]="url()" (focus)="$any($event.target).select()" />
            <button class="btn btn-secondary btn-sm" (click)="copiar()">{{ copiado() ? '✓ Copiado' : 'Copiar' }}</button>
          </div>
          <a class="compartir-abrir" [href]="url()" target="_blank" rel="noopener">Abrir formulario ↗</a>

          <div class="compartir-qr">
            @if (qrDataUrl(); as qr) {
              <img [src]="qr" alt="Código QR del formulario" />
            } @else {
              <div class="text-muted">Generando código QR…</div>
            }
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline btn-sm" (click)="cerrar.emit()">Cerrar</button>
          <button class="btn btn-secondary btn-sm" (click)="descargarQr()" [disabled]="!qrDataUrl()">⬇ Descargar QR</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .compartir-modal { max-width: 440px; }
    .compartir-titulo { font-weight: 800; font-size: 17px; color: var(--primary); margin-bottom: 6px; }
    .compartir-visibilidad {
      font-size: 13px; padding: 6px 10px; border-radius: var(--radius-sm);
      background: #fff8e1; color: #8a5a00; margin-bottom: 14px;
      &.publico { background: #e8f5f0; color: var(--success); }
    }
    .compartir-label { display:block; font-weight:700; font-size:12px; color:var(--gray); text-transform:uppercase; letter-spacing:.6px; margin-bottom:6px; }
    .compartir-url { display: flex; gap: 8px;
      input { flex: 1; min-width: 0; padding: 8px 10px; border: 2px solid var(--border); border-radius: var(--radius-sm); font-family: inherit; font-size: 13px; background: #fafafa; }
    }
    .compartir-abrir { display: inline-block; margin-top: 8px; font-size: 13px; font-weight: 700; }
    .compartir-qr { display: flex; justify-content: center; margin-top: 16px;
      img { width: 260px; height: 260px; image-rendering: pixelated; border: 1px solid var(--border); border-radius: var(--radius-sm); }
    }
  `],
})
export class FormularioCompartirComponent {
  private svc = inject(FormulariosService);

  token   = input.required<string>();
  titulo  = input<string>('');
  publico = input<boolean>(false);
  cerrar  = output<void>();

  qrDataUrl = signal<string | null>(null);
  copiado   = signal(false);

  url = () => this.svc.urlPublica(this.token());

  constructor() {
    effect(() => {
      const url = this.url();
      this.qrDataUrl.set(null);
      import('qrcode').then(QR => QR.toDataURL(url, { width: 1024, margin: 2, errorCorrectionLevel: 'M' }))
        .then(d => this.qrDataUrl.set(d))
        .catch(() => this.qrDataUrl.set(null));
    });
  }

  async copiar() {
    try {
      await navigator.clipboard.writeText(this.url());
    } catch {
      const ta = document.createElement('textarea');
      ta.value = this.url(); document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
    this.copiado.set(true);
    setTimeout(() => this.copiado.set(false), 2000);
  }

  descargarQr() {
    const qr = this.qrDataUrl();
    if (!qr) return;
    const a = document.createElement('a');
    a.href = qr;
    a.download = `qr-${(this.titulo() || 'formulario').replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ]+/g, '-').toLowerCase()}.png`;
    a.click();
  }
}
