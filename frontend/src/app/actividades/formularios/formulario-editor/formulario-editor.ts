import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import {
  FormulariosService, Pregunta, TipoPregunta, FormularioGuardar,
  TIPOS_PREGUNTA, CAMPOS_PERSONA, nuevaClave,
} from '../formularios.service';
import { ActividadesService, GrupoLookup } from '../../actividades.service';
import { FormularioCompartirComponent } from '../formulario-compartir.component';
import { confirmar } from '../../../shared/confirmar.util';

const TIPOS_CON_OPCIONES: TipoPregunta[] = ['unica', 'lista', 'multiple'];

@Component({
  selector:    'app-formulario-editor',
  standalone:  true,
  imports:     [CommonModule, FormsModule, RouterModule, FormularioCompartirComponent],
  templateUrl: './formulario-editor.html',
  styleUrl:    './formulario-editor.scss',
})
export class FormularioEditorComponent implements OnInit {
  private svc     = inject(FormulariosService);
  private actSvc  = inject(ActividadesService);
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private location = inject(Location);

  readonly TIPOS          = TIPOS_PREGUNTA;
  readonly CAMPOS_PERSONA = CAMPOS_PERSONA;

  idFormulario = signal<number | null>(null);
  idActividad  = signal<number | null>(null);
  token        = signal<string | null>(null);
  actNombre    = signal('');
  actLogo      = signal<string | null>(null);

  cargando  = signal(true);
  guardando = signal(false);
  error     = signal('');
  exito     = signal('');
  mostrarCompartir = signal(false);
  expandida = signal<string | null>(null);

  grupos = signal<GrupoLookup[]>([]);

  datos = {
    titulo:               '',
    descripcion:          '',
    publico:              false,
    activo:               true,
    fecha_limite:         '',
    mensaje_confirmacion: '',
  };
  preguntas = signal<Pregunta[]>([]);

  // Notificaciones por correo (opcionales)
  notif = { inscrito: false, pregunta_email: null as string | null, correos: '' };

  /** Preguntas de texto corto que pueden contener el correo del inscrito */
  preguntasCorreo = computed(() => this.preguntas().filter(q => q.tipo === 'texto'));

  numeradas = computed(() => {
    let n = 0;
    return this.preguntas().map(q => ({ q, num: q.tipo === 'seccion' ? null : ++n }));
  });

  ngOnInit() {
    this.actSvc.listarGruposDisponibles().subscribe({ next: g => this.grupos.set(g) });

    const id    = Number(this.route.snapshot.paramMap.get('id'));
    const idAct = Number(this.route.snapshot.paramMap.get('idact'));

    if (id) {
      this.idFormulario.set(id);
      this.svc.obtener(id).subscribe({
        next: f => {
          this.idActividad.set(f.idactividades);
          this.token.set(f.token);
          this.actNombre.set(f.actividad_nombre);
          this.actLogo.set(f.actividad_logo);
          this.datos = {
            titulo:               f.titulo,
            descripcion:          f.descripcion || '',
            publico:              f.publico,
            activo:               f.activo,
            fecha_limite:         this.aLocalInput(f.fecha_limite),
            mensaje_confirmacion: f.mensaje_confirmacion || '',
          };
          this.preguntas.set(f.preguntas.map(q => this.normalizar(q)));
          this.notif = {
            inscrito:       !!f.notificaciones?.inscrito,
            pregunta_email: f.notificaciones?.pregunta_email || null,
            correos:        (f.notificaciones?.correos || []).join(', '),
          };
          this.cargando.set(false);
        },
        error: (e: any) => { this.error.set(e.message); this.cargando.set(false); },
      });
    } else if (idAct) {
      this.idActividad.set(idAct);
      this.actSvc.obtener(idAct).subscribe({
        next: a => {
          this.actNombre.set(a.nombre);
          this.actLogo.set(a.logo);
          this.datos.titulo = `Inscripción: ${a.nombre}`;
          this.cargando.set(false);
        },
        error: (e: any) => { this.error.set(e.message); this.cargando.set(false); },
      });
    }
  }

  /** Fecha del servidor (ISO) → valor de <input type="datetime-local"> en hora local */
  private aLocalInput(v: string | null): string {
    if (!v) return '';
    const d = new Date(String(v).includes('T') ? v : String(v).replace(' ', 'T'));
    if (isNaN(d.getTime())) return '';
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  private normalizar(q: Partial<Pregunta>): Pregunta {
    return {
      clave:            q.clave || nuevaClave(),
      tipo:             q.tipo || 'texto',
      etiqueta:         q.etiqueta || '',
      ayuda:            q.ayuda || '',
      requerida:        !!q.requerida,
      opciones:         [...(q.opciones || [])],
      depende_de:       q.depende_de || null,
      depende_valores:  [...(q.depende_valores || [])],
      pregunta_persona: q.pregunta_persona || null,
      campo_persona:    q.campo_persona || null,
      permitir_nuevo:   q.permitir_nuevo ?? true,
      filtro_grupos:    [...(q.filtro_grupos || [])],
    };
  }

  // ── Preguntas: estructura ──────────────────────────────────────
  agregar(tipo: TipoPregunta) {
    const q = this.normalizar({
      tipo,
      opciones: TIPOS_CON_OPCIONES.includes(tipo) ? ['Opción 1', 'Opción 2'] : [],
      etiqueta: tipo === 'persona' ? 'Nombre de la persona' : '',
    });
    this.preguntas.update(arr => [...arr, q]);
    this.expandida.set(q.clave);
  }

  /** Plantilla del ejemplo típico: ¿asistirá? → buscar persona (o registrar nueva) → datos de contacto */
  agregarPlantillaAsistencia() {
    const asiste  = this.normalizar({ tipo: 'unica', etiqueta: '¿Asistirá a la actividad?', requerida: true, opciones: ['Sí', 'No'] });
    const persona = this.normalizar({
      tipo: 'persona', etiqueta: 'Busque su nombre', requerida: true, permitir_nuevo: true,
      ayuda: 'Si no aparece en la lista, puede ingresar sus datos.',
      depende_de: asiste.clave, depende_valores: ['Sí'],
    });
    const cel   = this.normalizar({ tipo: 'texto', etiqueta: 'Celular', requerida: true,
      pregunta_persona: persona.clave, campo_persona: 'celular' });
    const email = this.normalizar({ tipo: 'texto', etiqueta: 'Correo electrónico',
      pregunta_persona: persona.clave, campo_persona: 'email' });
    const motivo = this.normalizar({ tipo: 'parrafo', etiqueta: '¿Algún comentario?',
      depende_de: asiste.clave, depende_valores: ['No'] });
    this.preguntas.update(arr => [...arr, asiste, persona, cel, email, motivo]);
    this.expandida.set(null);
  }

  mover(i: number, delta: number) {
    const arr = [...this.preguntas()];
    const j = i + delta;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    this.preguntas.set(arr);
  }

  duplicar(i: number) {
    const arr = [...this.preguntas()];
    const copia = this.normalizar({ ...arr[i], clave: nuevaClave() });
    copia.etiqueta = copia.etiqueta + ' (copia)';
    arr.splice(i + 1, 0, copia);
    this.preguntas.set(arr);
    this.expandida.set(copia.clave);
  }

  async eliminar(i: number) {
    const q = this.preguntas()[i];
    const dependientes = this.preguntas().filter(p => p.depende_de === q.clave || p.pregunta_persona === q.clave);
    if (dependientes.length &&
        !await confirmar(`Otras ${dependientes.length} pregunta(s) dependen de esta; se quitará esa condición.<br>¿Eliminar la pregunta?`,
                         { peligro: true })) return;
    if (this.notif.pregunta_email === q.clave) this.notif.pregunta_email = null;
    this.preguntas.set(this.preguntas()
      .filter((_, idx) => idx !== i)
      .map(p => {
        if (p.depende_de === q.clave)       { p.depende_de = null; p.depende_valores = []; }
        if (p.pregunta_persona === q.clave) { p.pregunta_persona = null; p.campo_persona = null; }
        return p;
      }));
  }

  toggleExpandida(clave: string) {
    this.expandida.set(this.expandida() === clave ? null : clave);
  }

  onTipoCambia(q: Pregunta) {
    if (TIPOS_CON_OPCIONES.includes(q.tipo) && !q.opciones.length) q.opciones = ['Opción 1', 'Opción 2'];
    if (q.tipo === 'seccion' || q.tipo === 'persona') { q.pregunta_persona = null; q.campo_persona = null; q.requerida = q.tipo === 'persona' && q.requerida; }
    // Las preguntas que dependían de valores de esta pueden quedar inválidas
    for (const p of this.preguntas()) if (p.depende_de === q.clave) p.depende_valores = [];
    this.refrescar();
  }

  // ── Opciones ──────────────────────────────────────────────────
  agregarOpcion(q: Pregunta) { q.opciones = [...q.opciones, `Opción ${q.opciones.length + 1}`]; this.refrescar(); }
  quitarOpcion(q: Pregunta, i: number) {
    const quitada = q.opciones[i];
    q.opciones = q.opciones.filter((_, idx) => idx !== i);
    for (const p of this.preguntas()) {
      if (p.depende_de === q.clave) p.depende_valores = p.depende_valores.filter(v => v !== quitada);
    }
    this.refrescar();
  }
  moverOpcion(q: Pregunta, i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= q.opciones.length) return;
    const ops = [...q.opciones];
    [ops[i], ops[j]] = [ops[j], ops[i]];
    q.opciones = ops;
    this.refrescar();
  }
  /** Al renombrar una opción, mantener las condiciones que la usaban */
  renombrarOpcion(q: Pregunta, i: number, nuevo: string) {
    const anterior = q.opciones[i];
    q.opciones = q.opciones.map((o, idx) => idx === i ? nuevo : o);
    for (const p of this.preguntas()) {
      if (p.depende_de === q.clave) p.depende_valores = p.depende_valores.map(v => v === anterior ? nuevo : v);
    }
  }
  trackIdx = (i: number) => i;

  // ── Dependencias ──────────────────────────────────────────────
  /** Preguntas anteriores de las que puede depender (las condiciones solo miran hacia atrás) */
  anteriores(i: number): Pregunta[] {
    return this.preguntas().slice(0, i).filter(p => p.tipo !== 'seccion');
  }
  personasAnteriores(i: number): Pregunta[] {
    return this.preguntas().slice(0, i).filter(p => p.tipo === 'persona');
  }
  porClave(clave: string | null): Pregunta | undefined {
    return clave ? this.preguntas().find(p => p.clave === clave) : undefined;
  }
  valoresCondicion(padre: Pregunta | undefined): { valor: string; etiqueta: string }[] {
    if (!padre) return [];
    if (padre.tipo === 'persona') return [
      { valor: 'registrada', etiqueta: 'Persona registrada (encontrada)' },
      { valor: 'nueva',      etiqueta: 'Persona nueva (no encontrada)' },
    ];
    return padre.opciones.map(o => ({ valor: o, etiqueta: o }));
  }
  onDependeCambia(q: Pregunta) { q.depende_valores = []; this.refrescar(); }
  toggleValorCondicion(q: Pregunta, v: string) {
    q.depende_valores = q.depende_valores.includes(v)
      ? q.depende_valores.filter(x => x !== v) : [...q.depende_valores, v];
  }

  onCampoPersonaCambia(q: Pregunta) {
    if (!q.campo_persona) return;
    const def = CAMPOS_PERSONA.find(c => c.valor === q.campo_persona);
    if (!def) return;
    q.tipo = def.tipo;
    if (def.opciones) q.opciones = [...def.opciones];
    if (!q.etiqueta.trim()) q.etiqueta = def.etiqueta;
    this.refrescar();
  }
  onPreguntaPersonaCambia(q: Pregunta) {
    if (!q.pregunta_persona) q.campo_persona = null;
    this.refrescar();
  }

  toggleGrupoFiltro(q: Pregunta, id: number) {
    const f = q.filtro_grupos || [];
    q.filtro_grupos = f.includes(id) ? f.filter(x => x !== id) : [...f, id];
  }

  etiquetaTipo(t: TipoPregunta) { return this.TIPOS.find(x => x.valor === t); }
  etiquetaCampo(c: string | null) { return CAMPOS_PERSONA.find(x => x.valor === c)?.etiqueta || c; }
  tieneOpciones(q: Pregunta) { return TIPOS_CON_OPCIONES.includes(q.tipo); }

  /** Resumen de reglas de la pregunta (se muestra en la tarjeta colapsada) */
  reglas(q: Pregunta): string[] {
    const out: string[] = [];
    const padre = this.porClave(q.depende_de);
    if (padre) {
      const vals = q.depende_valores.map(v => v === 'registrada' ? 'persona registrada' : v === 'nueva' ? 'persona nueva' : `"${v}"`);
      out.push(`Se muestra si «${padre.etiqueta || 'sin título'}» ${vals.length ? '= ' + vals.join(' o ') : 'tiene respuesta'}`);
    }
    const pp = this.porClave(q.pregunta_persona);
    if (pp && q.campo_persona) {
      out.push(`Enlazado a ${this.etiquetaCampo(q.campo_persona)} de «${pp.etiqueta || 'persona'}» (solo se pide si es persona nueva)`);
    }
    return out;
  }

  private refrescar() { this.preguntas.set([...this.preguntas()]); }

  // ── Notificaciones ────────────────────────────────────────────
  onNotifInscritoCambia() {
    if (this.notif.inscrito && !this.notif.pregunta_email) {
      // Sugerir la pregunta enlazada al correo de la persona, o una que diga "correo"/"email"
      const pregs = this.preguntasCorreo();
      const sug = pregs.find(q => q.campo_persona === 'email')
               || pregs.find(q => /correo|e-?mail/i.test(q.etiqueta));
      this.notif.pregunta_email = sug?.clave || null;
    }
  }

  agregarPreguntaCorreo() {
    const q = this.normalizar({ tipo: 'texto', etiqueta: 'Correo electrónico', requerida: true });
    this.preguntas.update(arr => [...arr, q]);
    this.notif.pregunta_email = q.clave;
    this.expandida.set(q.clave);
  }

  private correosOrganizadores(): string[] {
    return this.notif.correos.split(/[,;\s]+/).map(c => c.trim()).filter(Boolean);
  }

  // ── Guardar ───────────────────────────────────────────────────
  private validar(): string | null {
    if (!this.datos.titulo.trim()) return 'El título del formulario es requerido';
    const pregs = this.preguntas();
    if (!pregs.some(q => q.tipo !== 'seccion')) return 'Agregue al menos una pregunta';
    for (const [i, q] of pregs.entries()) {
      const nombre = `Pregunta ${i + 1}`;
      if (!q.etiqueta.trim()) return `${nombre}: escriba el texto de la pregunta`;
      if (this.tieneOpciones(q) && !q.opciones.some(o => o.trim())) return `${nombre}: agregue al menos una opción`;
      if (this.tieneOpciones(q) && new Set(q.opciones.map(o => o.trim())).size !== q.opciones.length) {
        return `${nombre}: hay opciones repetidas o vacías`;
      }
      const previas = pregs.slice(0, i).map(p => p.clave);
      if (q.depende_de && !previas.includes(q.depende_de)) return `${nombre}: solo puede depender de una pregunta anterior`;
      if (q.pregunta_persona && !previas.includes(q.pregunta_persona)) return `${nombre}: el enlace a persona debe ser a una pregunta anterior`;
      if (q.pregunta_persona && !q.campo_persona) return `${nombre}: elija qué dato de la persona representa`;
    }
    if (this.notif.inscrito) {
      const q = pregs.find(p => p.clave === this.notif.pregunta_email);
      if (!q || q.tipo !== 'texto') return 'Notificaciones: elija la pregunta donde el inscrito escribe su correo';
    }
    const malo = this.correosOrganizadores().find(c => !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c));
    if (malo) return `Notificaciones: el correo "${malo}" no es válido`;
    return null;
  }

  guardar() {
    const err = this.validar();
    if (err) { this.error.set(err); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

    const data: FormularioGuardar = {
      titulo:               this.datos.titulo.trim(),
      descripcion:          this.datos.descripcion,
      publico:              this.datos.publico,
      activo:               this.datos.activo,
      fecha_limite:         this.datos.fecha_limite || null,
      mensaje_confirmacion: this.datos.mensaje_confirmacion,
      notificaciones: {
        inscrito:       this.notif.inscrito,
        pregunta_email: this.notif.inscrito ? this.notif.pregunta_email : null,
        correos:        this.correosOrganizadores(),
      },
      preguntas:            this.preguntas().map(q => ({
        ...q,
        etiqueta: q.etiqueta.trim(),
        opciones: q.opciones.map(o => o.trim()),
        depende_valores: q.depende_de ? q.depende_valores : [],
        campo_persona:   q.pregunta_persona ? q.campo_persona : null,
      })),
    };

    this.guardando.set(true); this.error.set('');
    const id = this.idFormulario();
    const op$: Observable<any> = id ? this.svc.actualizar(id, data) : this.svc.crear(this.idActividad()!, data);
    op$.subscribe({
      next: (r: any) => {
        this.guardando.set(false);
        this.exito.set('Formulario guardado');
        setTimeout(() => this.exito.set(''), 3000);
        if (!id && r?.id) {
          this.idFormulario.set(r.id);
          this.token.set(r.token);
          this.location.replaceState(`/actividades/formularios/${r.id}/editar`);
          this.mostrarCompartir.set(true);
        }
      },
      error: (e: any) => { this.guardando.set(false); this.error.set(e.message || 'Error al guardar'); },
    });
  }

  volver() {
    this.router.navigate(['/actividades', this.idActividad(), 'gestion'], { queryParams: { tab: 'formularios' } });
  }

  urlLogo(f: string) { return this.svc.urlLogo(f); }
}
