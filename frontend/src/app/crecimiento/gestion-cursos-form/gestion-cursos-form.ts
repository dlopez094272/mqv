import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CrecimientoService, CursoDetalle, ContenidoItem, PreguntaItem, ArchivoItem,
} from '../crecimiento.service';

interface ContenidoForm {
  idcontenido?:          number;
  titulo:                string;
  descripcion:           string;
  video_filename?:       string | null;
  video_nombre_original?: string | null;
  archivos:              ArchivoItem[];
  nuevoVideo?:           File | null;
  nuevosArchivos?:       File[];
  expandido:             boolean;
}

interface OpcionForm {
  idopcion?:   number;
  texto:       string;
  es_correcta: boolean;
}

interface PreguntaForm {
  idpregunta?:  number;
  pregunta:     string;
  opciones:     OpcionForm[];
  expandida:    boolean;
}

@Component({
  selector: 'app-gestion-cursos-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-cursos-form.html',
  styleUrl: './gestion-cursos-form.scss',
})
export class GestionCursosFormComponent implements OnInit {
  modoEdicion  = false;
  idcursos     = 0;
  tabActiva    = signal<'info' | 'contenido' | 'evaluacion'>('info');

  cargando     = signal(false);
  guardando    = signal(false);
  error        = signal('');
  exito        = signal('');

  // ── Formulario básico ──────────────────────────────────────────
  form = {
    nombre:      '',
    descripcion: '',
    color:       '#3788d8',
  };
  logoActual:  string | null = null;
  nuevoLogo:   File | null = null;
  logoPreview: string | null = null;

  // ── Contenido ─────────────────────────────────────────────────
  contenido  = signal<ContenidoForm[]>([]);
  guardandoContenido = signal<number | null>(null);

  // ── Preguntas ─────────────────────────────────────────────────
  preguntas  = signal<PreguntaForm[]>([]);
  guardandoPregunta = signal<number | null>(null);

  constructor(
    private svc:   CrecimientoService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.modoEdicion = true;
      this.idcursos    = parseInt(id);
      this.cargar();
    }
  }

  cargar() {
    this.cargando.set(true);
    this.svc.obtenerCurso(this.idcursos).subscribe({
      next: (c: CursoDetalle) => {
        this.form = { nombre: c.nombre, descripcion: c.descripcion || '', color: c.color };
        this.logoActual = c.logo;
        this.contenido.set(c.contenido.map(ci => ({
          idcontenido:           ci.idcontenido,
          titulo:                ci.titulo,
          descripcion:           ci.descripcion || '',
          video_filename:        ci.video_filename,
          video_nombre_original: ci.video_nombre_original,
          archivos:              ci.archivos,
          expandido:             false,
        })));
        this.preguntas.set(c.preguntas.map(p => ({
          idpregunta: p.idpregunta,
          pregunta:   p.pregunta,
          opciones:   p.opciones.map(o => ({
            idopcion:    o.idopcion,
            texto:       o.texto,
            es_correcta: !!o.es_correcta,
          })),
          expandida: false,
        })));
        this.cargando.set(false);
      },
      error: (e: any) => { this.error.set(e.message || 'Error al cargar'); this.cargando.set(false); },
    });
  }

  // ── Tab info: guardar datos básicos ───────────────────────────
  guardarInfo() {
    if (!this.form.nombre.trim()) { this.error.set('El nombre es requerido'); return; }
    this.guardando.set(true);
    this.error.set('');

    const fd = new FormData();
    fd.append('nombre',      this.form.nombre.trim());
    fd.append('descripcion', this.form.descripcion);
    fd.append('color',       this.form.color);
    if (this.nuevoLogo) fd.append('logo', this.nuevoLogo);

    const obs$ = this.modoEdicion
      ? this.svc.actualizarCurso(this.idcursos, fd)
      : this.svc.crearCurso(fd);

    obs$.subscribe({
      next: (r: any) => {
        this.guardando.set(false);
        if (!this.modoEdicion) {
          this.modoEdicion = true;
          this.idcursos    = r.idcursos;
          this.router.navigate(['/crecimiento/cursos', r.idcursos, 'editar'], { replaceUrl: true });
        }
        this.mostrarExito('Información guardada correctamente');
        if (this.modoEdicion) this.cargar();
      },
      error: (e: any) => { this.guardando.set(false); this.error.set(e.message || 'Error al guardar'); },
    });
  }

  onLogoChange(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    this.nuevoLogo = f;
    const reader = new FileReader();
    reader.onload = ev => this.logoPreview = ev.target?.result as string;
    reader.readAsDataURL(f);
  }

  // ── Contenido ─────────────────────────────────────────────────
  agregarContenido() {
    this.contenido.update(list => [...list, {
      titulo: '', descripcion: '', archivos: [], expandido: true,
      nuevoVideo: null, nuevosArchivos: [],
    }]);
  }

  toggleContenido(i: number) {
    this.contenido.update(list => list.map((c, idx) => idx === i ? { ...c, expandido: !c.expandido } : c));
  }

  onVideoChange(i: number, e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0] || null;
    this.contenido.update(list => list.map((c, idx) => idx === i ? { ...c, nuevoVideo: f } : c));
  }

  onArchivosChange(i: number, e: Event) {
    const files = Array.from((e.target as HTMLInputElement).files || []);
    this.contenido.update(list => list.map((c, idx) => idx === i ? { ...c, nuevosArchivos: files } : c));
  }

  guardarContenido(i: number) {
    if (!this.modoEdicion) { this.error.set('Guarda la información básica primero'); return; }
    const c = this.contenido()[i];
    if (!c.titulo.trim()) { this.error.set('El título del contenido es requerido'); return; }

    this.guardandoContenido.set(i);
    const fd = new FormData();
    fd.append('titulo',      c.titulo.trim());
    fd.append('descripcion', c.descripcion);
    fd.append('orden',       String(i));
    if (c.nuevoVideo) fd.append('video', c.nuevoVideo);
    if (c.nuevosArchivos?.length) c.nuevosArchivos.forEach(f => fd.append('archivos', f));

    const obs$ = c.idcontenido
      ? this.svc.actualizarContenido(c.idcontenido, fd)
      : this.svc.crearContenido(this.idcursos, fd);

    obs$.subscribe({
      next: () => { this.guardandoContenido.set(null); this.mostrarExito('Contenido guardado'); this.cargar(); },
      error: (e: any) => { this.guardandoContenido.set(null); this.error.set(e.message || 'Error al guardar contenido'); },
    });
  }

  eliminarContenidoItem(i: number) {
    const c = this.contenido()[i];
    if (!c.idcontenido) { this.contenido.update(list => list.filter((_, idx) => idx !== i)); return; }
    this.svc.eliminarContenido(c.idcontenido).subscribe({
      next: () => { this.mostrarExito('Contenido eliminado'); this.cargar(); },
      error: (e: any) => this.error.set(e.message || 'Error al eliminar'),
    });
  }

  eliminarVideo(i: number) {
    const c = this.contenido()[i];
    if (!c.idcontenido) return;
    this.svc.eliminarVideo(c.idcontenido).subscribe({
      next: () => { this.mostrarExito('Video eliminado'); this.cargar(); },
      error: (e: any) => this.error.set(e.message || 'Error'),
    });
  }

  eliminarArchivoSoporte(contenidoIdx: number, archivo: ArchivoItem) {
    this.svc.eliminarArchivo(archivo.idarchivo).subscribe({
      next: () => { this.mostrarExito('Archivo eliminado'); this.cargar(); },
      error: (e: any) => this.error.set(e.message || 'Error'),
    });
  }

  // ── Preguntas ─────────────────────────────────────────────────
  agregarPregunta() {
    this.preguntas.update(list => [...list, {
      pregunta: '',
      opciones: [
        { texto: '', es_correcta: false },
        { texto: '', es_correcta: false },
      ],
      expandida: true,
    }]);
  }

  togglePregunta(i: number) {
    this.preguntas.update(list => list.map((p, idx) => idx === i ? { ...p, expandida: !p.expandida } : p));
  }

  agregarOpcion(pi: number) {
    this.preguntas.update(list => list.map((p, idx) =>
      idx === pi ? { ...p, opciones: [...p.opciones, { texto: '', es_correcta: false }] } : p
    ));
  }

  eliminarOpcion(pi: number, oi: number) {
    this.preguntas.update(list => list.map((p, idx) =>
      idx === pi ? { ...p, opciones: p.opciones.filter((_, oidx) => oidx !== oi) } : p
    ));
  }

  setCorrecta(pi: number, oi: number) {
    this.preguntas.update(list => list.map((p, idx) =>
      idx === pi ? {
        ...p,
        opciones: p.opciones.map((o, oidx) => ({ ...o, es_correcta: oidx === oi }))
      } : p
    ));
  }

  guardarPregunta(i: number) {
    if (!this.modoEdicion) { this.error.set('Guarda la información básica primero'); return; }
    const p = this.preguntas()[i];
    if (!p.pregunta.trim()) { this.error.set('El texto de la pregunta es requerido'); return; }
    if (p.opciones.length < 2) { this.error.set('Se requieren al menos 2 opciones'); return; }
    if (!p.opciones.some(o => o.es_correcta)) { this.error.set('Marca al menos una opción como correcta'); return; }
    if (p.opciones.some(o => !o.texto.trim())) { this.error.set('Completa el texto de todas las opciones'); return; }

    this.guardandoPregunta.set(i);
    const payload = {
      pregunta: p.pregunta.trim(),
      orden:    i,
      opciones: p.opciones.map(o => ({ texto: o.texto.trim(), es_correcta: o.es_correcta })),
    };

    const obs$ = p.idpregunta
      ? this.svc.actualizarPregunta(p.idpregunta, payload)
      : this.svc.crearPregunta(this.idcursos, payload);

    obs$.subscribe({
      next: () => { this.guardandoPregunta.set(null); this.mostrarExito('Pregunta guardada'); this.cargar(); },
      error: (e: any) => { this.guardandoPregunta.set(null); this.error.set(e.message || 'Error al guardar pregunta'); },
    });
  }

  eliminarPreguntaItem(i: number) {
    const p = this.preguntas()[i];
    if (!p.idpregunta) { this.preguntas.update(list => list.filter((_, idx) => idx !== i)); return; }
    this.svc.eliminarPregunta(p.idpregunta).subscribe({
      next: () => { this.mostrarExito('Pregunta eliminada'); this.cargar(); },
      error: (e: any) => this.error.set(e.message || 'Error'),
    });
  }

  volver() { this.router.navigate(['/crecimiento/cursos']); }

  private mostrarExito(msg: string) {
    this.exito.set(msg);
    setTimeout(() => this.exito.set(''), 3000);
  }

  logoUrl(filename: string) { return this.svc.logoUrl(filename); }
}
