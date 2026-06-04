import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CrecimientoService, PreguntaItem, EvaluacionResult } from '../crecimiento.service';

interface RespuestaForm {
  idpregunta: number;
  idopcion:   number | null;
}

@Component({
  selector: 'app-mis-cursos-evaluacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-cursos-evaluacion.html',
  styleUrl: './mis-cursos-evaluacion.scss',
})
export class MisCursosEvaluacionComponent implements OnInit {
  idcursos    = 0;
  preguntas   = signal<PreguntaItem[]>([]);
  respuestas  = signal<RespuestaForm[]>([]);
  cargando    = signal(false);
  enviando    = signal(false);
  error       = signal('');
  resultado   = signal<EvaluacionResult | null>(null);

  constructor(
    private svc:   CrecimientoService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.idcursos = parseInt(this.route.snapshot.params['id']);
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.svc.obtenerPreguntas(this.idcursos).subscribe({
      next: ps => {
        this.preguntas.set(ps);
        this.respuestas.set(ps.map(p => ({ idpregunta: p.idpregunta, idopcion: null })));
        this.cargando.set(false);
      },
      error: (e: any) => { this.error.set(e.message || 'Error al cargar preguntas'); this.cargando.set(false); },
    });
  }

  seleccionar(idpregunta: number, idopcion: number) {
    this.respuestas.update(list =>
      list.map(r => r.idpregunta === idpregunta ? { ...r, idopcion } : r)
    );
  }

  estaSeleccionado(idpregunta: number, idopcion: number): boolean {
    return this.respuestas().find(r => r.idpregunta === idpregunta)?.idopcion === idopcion;
  }

  todasRespondidas(): boolean {
    return this.respuestas().every(r => r.idopcion !== null);
  }

  enviar() {
    if (!this.todasRespondidas()) { this.error.set('Debes responder todas las preguntas antes de enviar'); return; }
    this.enviando.set(true);
    this.error.set('');
    const payload = { respuestas: this.respuestas().map(r => ({ idpregunta: r.idpregunta, idopcion: r.idopcion! })) };
    this.svc.evaluarCurso(this.idcursos, payload).subscribe({
      next:  r => { this.resultado.set(r); this.enviando.set(false); },
      error: (e: any) => { this.error.set(e.message || 'Error al enviar'); this.enviando.set(false); },
    });
  }

  verCertificado() {
    window.open(`/certificado/${this.idcursos}`, '_blank');
  }

  volver() { this.router.navigate(['/crecimiento/mis-cursos', this.idcursos]); }
  volverListado() { this.router.navigate(['/crecimiento/mis-cursos']); }
}
