import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PublicacionesService, Publicacion, TipoMedia, TipoPublicacion, FotoPublicacion } from '../publicaciones.service';
import { HtmlEditorComponent } from '../../shared/html-editor/html-editor';
import { confirmar } from '../../shared/confirmar.util';

@Component({
  selector: 'app-publicaciones-form',
  standalone: true,
  imports: [CommonModule, FormsModule, HtmlEditorComponent],
  templateUrl: './publicaciones-form.html',
  styleUrl: './publicaciones-form.scss',
})
export class PublicacionesFormComponent implements OnInit {
  modoEdicion      = false;
  idpublicaciones  = 0;

  cargando  = signal(false);
  guardando = signal(false);
  error     = signal('');
  exito     = signal('');

  form = {
    titulo:         '',
    resumen:        '',
    contenido_html: '',
  };

  tipoMediaSeleccionado: Exclude<TipoMedia, 'ninguno'> | null = null;
  estadoActual: 'borrador' | 'publicado' = 'borrador';

  tipoPublicacion: TipoPublicacion = 'noticia';
  fechaEvento = '';

  // ── Video (archivo único) ──────────────────────────────────────
  videoActual:  string | null = null;
  nuevoVideo:   File | null = null;
  nuevoVideoPreview: string | null = null;

  // ── Fotos (galería, varias) ─────────────────────────────────────
  fotosExistentes = signal<FotoPublicacion[]>([]);
  nuevasFotos     = signal<{ file: File; preview: string }[]>([]);

  constructor(
    private svc:   PublicacionesService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.modoEdicion     = true;
      this.idpublicaciones = parseInt(id);
      this.cargar();
    }
  }

  cargar() {
    this.cargando.set(true);
    this.svc.obtener(this.idpublicaciones).subscribe({
      next: (p: Publicacion) => {
        this.form = {
          titulo:         p.titulo,
          resumen:        p.resumen || '',
          contenido_html: p.contenido_html || '',
        };
        this.tipoMediaSeleccionado = p.tipo_media !== 'ninguno' ? p.tipo_media : null;
        this.tipoPublicacion = p.tipo_publicacion || 'noticia';
        this.fechaEvento = p.fecha_evento ? p.fecha_evento.replace(' ', 'T').slice(0, 16) : '';
        this.videoActual  = p.tipo_media === 'video' ? p.media_filename : null;
        this.fotosExistentes.set(p.tipo_media === 'imagen' ? (p.fotos || []) : []);
        this.nuevasFotos.set([]);
        this.nuevoVideo = null;
        this.nuevoVideoPreview = null;
        this.estadoActual = p.estado;
        this.cargando.set(false);
      },
      error: (e: any) => { this.error.set(e.message || 'Error al cargar'); this.cargando.set(false); },
    });
  }

  seleccionarTipo(tipo: Exclude<TipoMedia, 'ninguno'>) {
    if (this.tipoMediaSeleccionado === tipo) return;
    this.tipoMediaSeleccionado = tipo;
    this.nuevoVideo = null;
    this.nuevoVideoPreview = null;
    this.nuevasFotos.set([]);
  }

  onVideoChange(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0] || null;
    this.nuevoVideo = f;
    this.nuevoVideoPreview = f ? URL.createObjectURL(f) : null;
  }

  onFotosChange(e: Event) {
    const files = Array.from((e.target as HTMLInputElement).files || []);
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = ev => {
        this.nuevasFotos.update(list => [...list, { file, preview: ev.target?.result as string }]);
      };
      reader.readAsDataURL(file);
    }
    (e.target as HTMLInputElement).value = '';
  }

  quitarFotoNueva(i: number) {
    this.nuevasFotos.update(list => list.filter((_, idx) => idx !== i));
  }

  async eliminarFotoExistente(foto: FotoPublicacion) {
    const ok = await confirmar('Se eliminará esta foto de la galería.', { peligro: true });
    if (!ok) return;
    this.svc.eliminarFoto(foto.idfoto).subscribe({
      next: () => this.fotosExistentes.update(list => list.filter(f => f.idfoto !== foto.idfoto)),
      error: (e: any) => this.error.set(e.message || 'Error al eliminar la foto'),
    });
  }

  seleccionarTipoPublicacion(tipo: TipoPublicacion) {
    this.tipoPublicacion = tipo;
  }

  guardar(publicarAlGuardar: boolean) {
    if (!this.form.titulo.trim()) { this.error.set('El título es requerido'); return; }
    if (this.tipoPublicacion === 'evento' && !this.fechaEvento) {
      this.error.set('La fecha del evento es requerida');
      return;
    }
    this.error.set('');
    this.guardando.set(true);

    const fd = new FormData();
    fd.append('titulo', this.form.titulo.trim());
    fd.append('resumen', this.form.resumen);
    fd.append('contenido_html', this.form.contenido_html);
    fd.append('tipo_publicacion', this.tipoPublicacion);
    if (this.tipoPublicacion === 'evento') fd.append('fecha_evento', this.fechaEvento);
    if (this.tipoMediaSeleccionado === 'video' && this.nuevoVideo) {
      fd.append('video', this.nuevoVideo);
    }
    if (this.tipoMediaSeleccionado === 'imagen') {
      for (const nf of this.nuevasFotos()) fd.append('fotos', nf.file);
    }

    const obs$ = this.modoEdicion
      ? this.svc.actualizar(this.idpublicaciones, fd)
      : this.svc.crear(fd);

    obs$.subscribe({
      next: (r: any) => {
        const id = this.modoEdicion ? this.idpublicaciones : r.idpublicaciones;
        const estadoDeseado = publicarAlGuardar ? 'publicado' : this.estadoActual;

        const terminar = () => {
          this.guardando.set(false);
          this.mostrarExito(publicarAlGuardar ? 'Publicación guardada y publicada' : 'Publicación guardada');
          if (!this.modoEdicion) {
            this.router.navigate(['/publicaciones', id, 'editar'], { replaceUrl: true });
          } else {
            this.cargar();
          }
        };

        if (publicarAlGuardar && estadoDeseado !== this.estadoActual) {
          this.svc.cambiarEstado(id, 'publicado').subscribe({ next: terminar, error: terminar });
        } else {
          terminar();
        }
      },
      error: (e: any) => { this.guardando.set(false); this.error.set(e.message || 'Error al guardar'); },
    });
  }

  volver() { this.router.navigate(['/publicaciones']); }

  videoActualUrl() { return this.videoActual ? this.svc.mediaUrl(this.videoActual) : null; }
  fotoUrl(foto: FotoPublicacion) { return this.svc.mediaUrl(foto.filename); }

  private mostrarExito(msg: string) {
    this.exito.set(msg);
    setTimeout(() => this.exito.set(''), 3000);
  }
}
