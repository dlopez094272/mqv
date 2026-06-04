import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CrecimientoService, MiCurso } from '../crecimiento.service';

@Component({
  selector: 'app-mis-cursos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-cursos.html',
  styleUrl: './mis-cursos.scss',
})
export class MisCursosComponent implements OnInit {
  cursos   = signal<MiCurso[]>([]);
  cargando = signal(false);
  error    = signal('');

  constructor(private svc: CrecimientoService, private router: Router) {}

  ngOnInit() {
    this.cargando.set(true);
    this.svc.misCursos().subscribe({
      next:  data => { this.cursos.set(data); this.cargando.set(false); },
      error: (e: any) => { this.error.set(e.message || 'Error al cargar'); this.cargando.set(false); },
    });
  }

  abrirCurso(c: MiCurso) {
    this.router.navigate(['/crecimiento/mis-cursos', c.idcursos]);
  }

  logoUrl(filename: string) { return this.svc.logoUrl(filename); }
}
