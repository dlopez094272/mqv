import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  FormulariosService, FormularioPublico, Pregunta, Respuestas, PersonaBusqueda,
  esVisible, tieneValor,
} from '../formularios.service';

interface EstadoBusqueda {
  texto:      string;
  grupo:      number | null;
  resultados: PersonaBusqueda[];
  buscando:   boolean;
  buscado:    boolean;
  grupos:     { id: number; nombre: string }[];
}

const BUSQUEDA_VACIA: EstadoBusqueda = {
  texto: '', grupo: null, resultados: [], buscando: false, buscado: false, grupos: [],
};

@Component({
  selector:    'app-formulario-publico',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './formulario-publico.html',
  styleUrl:    './formulario-publico.scss',
})
export class FormularioPublicoComponent implements OnInit {
  private svc   = inject(FormulariosService);
  private route = inject(ActivatedRoute);

  token     = '';
  cargando  = signal(true);
  errorCarga = signal('');
  form      = signal<FormularioPublico | null>(null);

  resp      = signal<Respuestas>({});
  busquedas = signal<Record<string, EstadoBusqueda>>({});
  errores   = signal<Record<string, string>>({});

  enviando  = signal(false);
  errorEnvio = signal('');
  enviado   = signal<{ mensaje: string | null; correo_confirmacion?: boolean } | null>(null);

  private timers: Record<string, any> = {};

  preguntas = computed(() => this.form()?.preguntas || []);
  porClave  = computed(() => new Map(this.preguntas().map(q => [q.clave, q])));
  visibles  = computed(() => {
    const r = this.resp(); const m = this.porClave();
    return this.preguntas().filter(q => esVisible(q, r, m));
  });

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    this.svc.publico(this.token).subscribe({
      next: f => {
        this.form.set(f);
        this.cargando.set(false);
        document.title = f.titulo;
        for (const q of f.preguntas || []) {
          if (q.tipo === 'persona') this.cargarGrupos(q);
        }
      },
      error: (e: any) => { this.errorCarga.set(e.message || 'No se pudo cargar el formulario'); this.cargando.set(false); },
    });
  }

  // ── Respuestas ────────────────────────────────────────────────
  valor(clave: string) { return this.resp()[clave]; }

  asignar(clave: string, v: any) {
    this.resp.update(r => ({ ...r, [clave]: v }));
    if (this.errores()[clave]) this.errores.update(e => { const c = { ...e }; delete c[clave]; return c; });
  }

  toggleMultiple(q: Pregunta, op: string) {
    const actual: string[] = this.valor(q.clave) || [];
    const nuevo = actual.includes(op) ? actual.filter(x => x !== op) : [...actual, op];
    this.asignar(q.clave, q.opciones.filter(o => nuevo.includes(o)));
  }

  marcado(q: Pregunta, op: string): boolean {
    const v = this.valor(q.clave);
    return Array.isArray(v) ? v.includes(op) : v === op;
  }

  // ── Persona ───────────────────────────────────────────────────
  busq(clave: string): EstadoBusqueda { return this.busquedas()[clave] || BUSQUEDA_VACIA; }

  private actualizarBusq(clave: string, cambios: Partial<EstadoBusqueda>) {
    this.busquedas.update(b => ({ ...b, [clave]: { ...(b[clave] || BUSQUEDA_VACIA), ...cambios } }));
  }

  private cargarGrupos(q: Pregunta) {
    this.svc.gruposPublicos(this.token, q.clave).subscribe({
      next: g => this.actualizarBusq(q.clave, { grupos: g }),
    });
  }

  onBuscarTexto(q: Pregunta, texto: string) {
    this.actualizarBusq(q.clave, { texto });
    clearTimeout(this.timers[q.clave]);
    this.timers[q.clave] = setTimeout(() => this.buscar(q), 300);
  }

  onBuscarGrupo(q: Pregunta, grupo: string) {
    this.actualizarBusq(q.clave, { grupo: grupo ? Number(grupo) : null });
    this.buscar(q);
  }

  /** Sin sesión se exigen 2+ letras (el backend no lista grupos completos de forma anónima). */
  requiereTexto(): boolean { return !this.form()?.usuario; }

  private buscar(q: Pregunta) {
    const b = this.busq(q.clave);
    const texto = b.texto.trim();
    if (texto.length < 2 && (!b.grupo || this.requiereTexto())) {
      this.actualizarBusq(q.clave, { resultados: [], buscado: false, buscando: false });
      return;
    }
    this.actualizarBusq(q.clave, { buscando: true });
    this.svc.buscarPersonas(this.token, q.clave, texto, b.grupo).subscribe({
      next:  r => this.actualizarBusq(q.clave, { resultados: r, buscando: false, buscado: true }),
      error: () => this.actualizarBusq(q.clave, { resultados: [], buscando: false, buscado: true }),
    });
  }

  seleccionarPersona(q: Pregunta, p: PersonaBusqueda) {
    this.asignar(q.clave, { modo: 'registrada', idpersonas: p.idpersonas, nombre: p.nombre, foto: p.foto, grupos: p.grupos });
  }

  ingresarNueva(q: Pregunta) {
    const texto = this.busq(q.clave).texto.trim().split(/\s+/).filter(Boolean);
    // Sugerir nombres a partir de lo que escribió en la búsqueda
    const [n1 = '', a1 = '', a2 = ''] = texto.length >= 3 ? [texto[0], texto[texto.length - 2], texto[texto.length - 1]]
                                     : texto.length === 2 ? [texto[0], texto[1], ''] : [texto[0] || '', '', ''];
    this.asignar(q.clave, {
      modo: 'nueva', primer_nombre: n1, segundo_nombre: texto.length >= 4 ? texto[1] : '',
      primer_apellido: a1, segundo_apellido: a2,
    });
  }

  campoNueva(q: Pregunta, campo: string, valor: string) {
    this.asignar(q.clave, { ...this.valor(q.clave), [campo]: valor });
  }

  cambiarPersona(q: Pregunta) {
    this.asignar(q.clave, null);
  }

  // ── Envío ─────────────────────────────────────────────────────
  private validar(): boolean {
    const errs: Record<string, string> = {};
    for (const q of this.visibles()) {
      if (q.tipo === 'seccion') continue;
      const v = this.valor(q.clave);
      if (q.requerida && !tieneValor(v)) errs[q.clave] = 'Esta pregunta es obligatoria';
      if (q.tipo === 'persona' && v?.modo === 'nueva' && (!v.primer_nombre?.trim() || !v.primer_apellido?.trim())) {
        errs[q.clave] = 'Ingrese al menos primer nombre y primer apellido';
      }
      if (q.tipo === 'numero' && tieneValor(v) && !Number.isFinite(Number(v))) errs[q.clave] = 'Ingrese un número válido';
      if (this.esCorreo(q) && tieneValor(v) && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim())) {
        errs[q.clave] = 'Escriba un correo electrónico válido';
      }
    }
    this.errores.set(errs);
    const primera = Object.keys(errs)[0];
    if (primera) document.getElementById('preg-' + primera)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return !primera;
  }

  enviar() {
    if (this.enviando() || !this.validar()) return;
    const datos: Respuestas = {};
    for (const q of this.visibles()) {
      if (q.tipo === 'seccion') continue;
      const v = this.valor(q.clave);
      if (!tieneValor(v)) continue;
      if (q.tipo === 'persona') {
        datos[q.clave] = v.modo === 'registrada'
          ? { modo: 'registrada', idpersonas: v.idpersonas }
          : { modo: 'nueva', primer_nombre: v.primer_nombre, segundo_nombre: v.segundo_nombre,
              primer_apellido: v.primer_apellido, segundo_apellido: v.segundo_apellido };
      } else {
        datos[q.clave] = v;
      }
    }
    this.enviando.set(true); this.errorEnvio.set('');
    this.svc.enviar(this.token, datos).subscribe({
      next: r => {
        this.enviando.set(false);
        this.enviado.set({ mensaje: r.mensaje, correo_confirmacion: r.correo_confirmacion });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (e: any) => { this.enviando.set(false); this.errorEnvio.set(e.message || 'No se pudo enviar'); },
    });
  }

  otraRespuesta() {
    this.resp.set({});
    this.errores.set({});
    this.busquedas.update(b => {
      const c: Record<string, EstadoBusqueda> = {};
      for (const k of Object.keys(b)) c[k] = { ...BUSQUEDA_VACIA, grupos: b[k].grupos };
      return c;
    });
    this.enviado.set(null);
    window.scrollTo({ top: 0 });
  }

  // ── Teclado móvil según el dato que se pide ───────────────────
  esCorreo(q: Pregunta): boolean {
    return q.campo_persona === 'email' || q.clave === this.form()?.pregunta_email;
  }

  tipoInput(q: Pregunta): string {
    if (this.esCorreo(q)) return 'email';
    if (q.campo_persona === 'celular' || q.campo_persona === 'telefono') return 'tel';
    return 'text';
  }
  modoTeclado(q: Pregunta): string | null {
    if (this.esCorreo(q)) return 'email';
    if (q.campo_persona === 'celular' || q.campo_persona === 'telefono') return 'tel';
    return null;
  }
  autocompletar(q: Pregunta): string | null {
    if (this.esCorreo(q)) return 'email';
    switch (q.campo_persona) {
      case 'celular':
      case 'telefono':            return 'tel';
      case 'direccion_domicilio': return 'street-address';
      default:                    return null;
    }
  }

  // Fotos que no cargan (archivo inexistente) → se muestra la inicial
  private fotosFallidas = signal<Set<string>>(new Set());
  fotoFallida(f: string)       { return this.fotosFallidas().has(f); }
  marcarFotoFallida(f: string) { this.fotosFallidas.update(s => new Set(s).add(f)); }

  // ── Helpers de presentación ───────────────────────────────────
  irLogin() {
    window.location.href = `/login?returnUrl=${encodeURIComponent('/f/' + this.token)}`;
  }

  urlLogo(f: string)  { return this.svc.urlLogo(f); }
  urlFoto(f: string)  { return this.svc.urlFotoPersona(f); }
  inicial(n: string)  { return (n || '?').charAt(0).toUpperCase(); }

  numero(q: Pregunta): number {
    let n = 0;
    for (const p of this.visibles()) {
      if (p.tipo !== 'seccion') n++;
      if (p.clave === q.clave) return n;
    }
    return n;
  }

  fechaActividad(): string {
    const a = this.form()?.actividad;
    if (!a?.fecha_inicio) return '';
    const fmt = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    let txt = fmt(a.fecha_inicio);
    if (a.fecha_fin && a.fecha_fin !== a.fecha_inicio) txt += ' al ' + fmt(a.fecha_fin);
    if (a.hora_inicio) txt += ` · ${String(a.hora_inicio).slice(0, 5)}${a.hora_fin ? ' – ' + String(a.hora_fin).slice(0, 5) : ''}`;
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  }

  fechaLimite(): string {
    const f = this.form()?.fecha_limite;
    if (!f) return '';
    return new Date(String(f).replace(' ', 'T')).toLocaleString('es-GT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
