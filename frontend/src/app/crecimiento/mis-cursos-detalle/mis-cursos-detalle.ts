import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { CrecimientoService, MiCursoDetalle, ContenidoItem } from '../crecimiento.service';

@Component({
  selector: 'app-mis-cursos-detalle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-cursos-detalle.html',
  styleUrl: './mis-cursos-detalle.scss',
})
export class MisCursosDetalleComponent implements OnInit {
  idcursos   = 0;
  curso      = signal<MiCursoDetalle | null>(null);
  cargando   = signal(false);
  error      = signal('');
  abiertos   = signal<Set<number>>(new Set());

  constructor(
    private svc:       CrecimientoService,
    private route:     ActivatedRoute,
    private router:    Router,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    this.idcursos = parseInt(this.route.snapshot.params['id']);
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.svc.miCursoDetalle(this.idcursos).subscribe({
      next:  c => { this.curso.set(c); this.cargando.set(false); },
      error: (e: any) => { this.error.set(e.message || 'Error al cargar'); this.cargando.set(false); },
    });
  }

  toggleContenido(id: number) {
    const s = new Set(this.abiertos());
    s.has(id) ? s.delete(id) : s.add(id);
    this.abiertos.set(s);
  }

  tomarEvaluacion() {
    this.router.navigate(['/crecimiento/mis-cursos', this.idcursos, 'evaluacion']);
  }

  verCertificado() {
    window.open(`/certificado/${this.idcursos}`, '_blank');
  }

  volver() { this.router.navigate(['/crecimiento/mis-cursos']); }

  videoUrl(filename: string)   { return this.svc.videoUrl(filename); }
  archivoUrl(filename: string) { return this.svc.archivoUrl(filename); }
  logoUrl(filename: string)    { return this.svc.logoUrl(filename); }

  formatFecha(f: string): string {
    if (!f) return '';
    const d = new Date(f);
    return d.toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  safeVideoUrl(filename: string): SafeUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.videoUrl(filename));
  }

  safeArchivoUrl(filename: string): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(this.archivoUrl(filename));
  }
}
