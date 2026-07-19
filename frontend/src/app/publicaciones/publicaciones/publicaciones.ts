import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PublicacionesService, Publicacion } from '../publicaciones.service';
import { PermisosService } from '../../core/services/permisos.service';
import { confirmar } from '../../shared/confirmar.util';

@Component({
  selector: 'app-publicaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './publicaciones.html',
  styleUrl: './publicaciones.scss',
})
export class PublicacionesComponent implements OnInit {
  publicaciones = signal<Publicacion[]>([]);
  filtrados     = signal<Publicacion[]>([]);
  cargando      = signal(false);
  error         = signal('');
  exito         = signal('');
  busqueda      = '';
  filtroTipo: 'todas' | 'noticia' | 'evento' | 'tema_mes' = 'todas';

  readonly LIMITE = 25;
  paginaActual = signal(1);
  totalPaginas = computed(() => Math.ceil(this.filtrados().length / this.LIMITE));
  paginados    = computed(() => {
    const start = (this.paginaActual() - 1) * this.LIMITE;
    return this.filtrados().slice(start, start + this.LIMITE);
  });
  paginas = computed(() => {
    const total = this.totalPaginas(); const actual = this.paginaActual();
    if (total <= 1) return [];
    const rango: (number | '...')[] = [];
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= actual - 2 && i <= actual + 2)) rango.push(i);
      else if (rango[rango.length - 1] !== '...') rango.push('...');
    }
    return rango;
  });
  irPagina(p: number | '...') {
    if (p === '...' || (p as number) < 1 || (p as number) > this.totalPaginas()) return;
    this.paginaActual.set(p as number);
  }

  constructor(
    private svc:     PublicacionesService,
    public  permisos: PermisosService,
    private router:  Router,
  ) {}

  ngOnInit() { this.cargar(); }

  cargar() {
    this.cargando.set(true);
    this.error.set('');
    this.svc.listar().subscribe({
      next: data => { this.publicaciones.set(data); this.filtrar(); this.cargando.set(false); },
      error: (e: any) => { this.error.set(e.message || 'Error al cargar'); this.cargando.set(false); },
    });
  }

  filtrar() {
    const q = this.busqueda.toLowerCase().trim();
    let lista = this.publicaciones();
    if (this.filtroTipo !== 'todas') lista = lista.filter(p => p.tipo_publicacion === this.filtroTipo);
    if (q) lista = lista.filter(p => p.titulo.toLowerCase().includes(q));
    this.filtrados.set([...lista]);
    this.paginaActual.set(1);
  }

  cambiarFiltroTipo(tipo: 'todas' | 'noticia' | 'evento' | 'tema_mes') {
    this.filtroTipo = tipo;
    this.filtrar();
  }

  nuevo()  { this.router.navigate(['/publicaciones/nuevo']); }
  editar(p: Publicacion) { this.router.navigate(['/publicaciones', p.idpublicaciones, 'editar']); }

  cambiarEstado(p: Publicacion) {
    const nuevoEstado = p.estado === 'publicado' ? 'borrador' : 'publicado';
    this.svc.cambiarEstado(p.idpublicaciones, nuevoEstado).subscribe({
      next: r => { this.mostrarExito(r.message); this.cargar(); },
      error: (e: any) => this.error.set(e.message || 'Error'),
    });
  }

  async eliminar(p: Publicacion) {
    const ok = await confirmar(`Se eliminará la publicación "<strong>${p.titulo}</strong>" y su archivo adjunto.`, { peligro: true });
    if (!ok) return;
    this.svc.eliminar(p.idpublicaciones).subscribe({
      next: () => { this.mostrarExito('Publicación eliminada'); this.cargar(); },
      error: (e: any) => this.error.set(e.message || 'Error al eliminar'),
    });
  }

  mediaUrlDe(p: Publicacion) { return this.svc.mediaUrl(p.media_filename!); }
  fotoUrlDe(filename: string) { return this.svc.mediaUrl(filename); }

  copiarLink(p: Publicacion) {
    const url = this.svc.compartirUrl(p.slug);
    navigator.clipboard.writeText(url).then(() => this.mostrarExito('Link copiado al portapapeles'));
  }

  private mostrarExito(msg: string) {
    this.exito.set(msg);
    setTimeout(() => this.exito.set(''), 3000);
  }
}
