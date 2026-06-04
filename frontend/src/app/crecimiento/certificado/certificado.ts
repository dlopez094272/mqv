import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CrecimientoService, CertificadoData } from '../crecimiento.service';

@Component({
  selector: 'app-certificado',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './certificado.html',
  styleUrl: './certificado.scss',
})
export class CertificadoComponent implements OnInit {
  datos    = signal<CertificadoData | null>(null);
  cargando = signal(true);
  error    = signal('');
  hoy      = new Date();

  constructor(private svc: CrecimientoService, private route: ActivatedRoute) {}

  ngOnInit() {
    const id = parseInt(this.route.snapshot.params['id']);
    this.svc.datosCertificado(id).subscribe({
      next: d => {
        this.datos.set(d);
        this.cargando.set(false);
        setTimeout(() => window.print(), 800);
      },
      error: (e: any) => { this.error.set(e.message || 'Error al cargar datos del certificado'); this.cargando.set(false); },
    });
  }

  imprimir() { window.print(); }
  cerrar()   { window.close(); }

  logoUrl(filename: string)    { return this.svc.logoUrl(filename); }

  formatFecha(f: string): string {
    const d = new Date(f);
    return d.toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  formatHoy(): string {
    return this.hoy.toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}
