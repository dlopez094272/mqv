import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type TipoPregunta =
  'seccion' | 'texto' | 'parrafo' | 'numero' | 'fecha' | 'unica' | 'lista' | 'multiple' | 'persona';

export interface Pregunta {
  clave:             string;
  tipo:              TipoPregunta;
  etiqueta:          string;
  ayuda:             string;
  requerida:         boolean;
  opciones:          string[];
  depende_de:        string | null;
  depende_valores:   string[];
  pregunta_persona:  string | null;
  campo_persona:     string | null;
  permitir_nuevo?:   boolean;
  filtro_grupos?:    number[];
}

export interface Notificaciones {
  inscrito:       boolean;        // enviar confirmación al correo del inscrito
  pregunta_email: string | null;  // pregunta (texto corto) donde escribe su correo
  correos:        string[];       // organizadores que reciben aviso de cada inscripción
}

export interface FormularioResumen {
  idactividades_formularios: number;
  idactividades:    number;
  titulo:           string;
  descripcion:      string | null;
  token:            string;
  publico:          boolean;
  activo:           boolean;
  fecha_limite:     string | null;
  total_preguntas:  number;
  total_respuestas: number;
  created_at:       string;
}

export interface Formulario {
  idactividades_formularios: number;
  idactividades:        number;
  titulo:               string;
  descripcion:          string | null;
  token:                string;
  publico:              boolean;
  activo:               boolean;
  fecha_limite:         string | null;
  mensaje_confirmacion: string | null;
  notificaciones:       Notificaciones;
  preguntas:            Pregunta[];
  actividad_nombre:     string;
  actividad_logo:       string | null;
  actividad_fecha_inicio?: string;
  actividad_fecha_fin?:    string;
}

export interface FormularioGuardar {
  titulo:               string;
  descripcion:          string;
  publico:              boolean;
  activo:               boolean;
  fecha_limite:         string | null;
  mensaje_confirmacion: string;
  notificaciones:       Notificaciones;
  preguntas:            Pregunta[];
}

/** Valor de una pregunta tipo persona */
export type ValorPersona =
  | { modo: 'registrada'; idpersonas: number; nombre?: string; registrada_desde_formulario?: boolean }
  | { modo: 'nueva'; primer_nombre: string; segundo_nombre: string; primer_apellido: string; segundo_apellido: string };

export type Respuestas = Record<string, any>;

export interface RespuestaFila {
  id:         number;
  respuestas: Respuestas;
  usuario:    string | null;
  created_at: string;
}

export interface ReporteRespuestas {
  formulario: Formulario;
  respuestas: RespuestaFila[];
  personas:   Record<number, { nombre: string; foto: string | null }>;
}

export interface FormularioPublico {
  requiere_login: boolean;
  titulo:         string;
  descripcion?:   string | null;
  publico?:       boolean;
  fecha_limite?:  string | null;
  cerrado?:       string | null;
  preguntas?:     Pregunta[];
  pregunta_email?: string | null;
  usuario?:       string | null;
  actividad: {
    nombre:       string;
    descripcion:  string | null;
    logo:         string | null;
    fecha_inicio: string | null;
    fecha_fin:    string | null;
    hora_inicio:  string | null;
    hora_fin:     string | null;
    lugar:        string | null;
  };
}

export interface PersonaBusqueda {
  idpersonas: number;
  nombre:     string;
  foto:       string | null;
  grupos:     string | null;
}

export const TIPOS_PREGUNTA: { valor: TipoPregunta; etiqueta: string; icono: string }[] = [
  { valor: 'texto',    etiqueta: 'Texto corto',                    icono: '✏️' },
  { valor: 'parrafo',  etiqueta: 'Texto largo (párrafo)',          icono: '📝' },
  { valor: 'unica',    etiqueta: 'Respuesta única (opciones)',     icono: '🔘' },
  { valor: 'lista',    etiqueta: 'Respuesta única (lista)',        icono: '🔽' },
  { valor: 'multiple', etiqueta: 'Respuesta múltiple',             icono: '☑️' },
  { valor: 'numero',   etiqueta: 'Número',                         icono: '#️⃣' },
  { valor: 'fecha',    etiqueta: 'Fecha',                          icono: '📅' },
  { valor: 'persona',  etiqueta: 'Buscar persona registrada',      icono: '👤' },
  { valor: 'seccion',  etiqueta: 'Título / sección (sin respuesta)', icono: '🔖' },
];

/** Campos de la ficha de Personas que se pueden enlazar a una pregunta (igual que el backend). */
export const CAMPOS_PERSONA: { valor: string; etiqueta: string; tipo: TipoPregunta; opciones?: string[] }[] = [
  { valor: 'celular',             etiqueta: 'Celular',                tipo: 'texto' },
  { valor: 'telefono',            etiqueta: 'Teléfono',               tipo: 'texto' },
  { valor: 'email',               etiqueta: 'Correo electrónico',     tipo: 'texto' },
  { valor: 'fechanacimiento',     etiqueta: 'Fecha de nacimiento',    tipo: 'fecha' },
  { valor: 'sexo',                etiqueta: 'Sexo',                   tipo: 'unica', opciones: ['Masculino', 'Femenino'] },
  { valor: 'estado_civil',        etiqueta: 'Estado civil',           tipo: 'lista', opciones: ['Solter@', 'Casad@', 'Viud@', 'Unid@', 'Divorciad@'] },
  { valor: 'nodocumento',         etiqueta: 'No. de documento',       tipo: 'texto' },
  { valor: 'direccion_domicilio', etiqueta: 'Dirección de domicilio', tipo: 'texto' },
  { valor: 'zona_domicilio',      etiqueta: 'Zona de domicilio',      tipo: 'texto' },
  { valor: 'lugartrabajo',        etiqueta: 'Lugar de trabajo',       tipo: 'texto' },
  { valor: 'puesto_trabajo',      etiqueta: 'Puesto de trabajo',      tipo: 'texto' },
];

export function tieneValor(v: any): boolean {
  if (v === null || v === undefined) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return !!v.modo;
  return String(v).trim() !== '';
}

/** Misma regla de visibilidad que el backend (utils/formularios.js → esVisible). */
export function esVisible(q: Pregunta, respuestas: Respuestas, porClave: Map<string, Pregunta>, prof = 0): boolean {
  if (prof > 50) return false;
  if (q.depende_de) {
    const padre = porClave.get(q.depende_de);
    if (!padre || !esVisible(padre, respuestas, porClave, prof + 1)) return false;
    const val = respuestas[padre.clave];
    if (!tieneValor(val)) return false;
    if (q.depende_valores?.length) {
      const actuales: string[] = padre.tipo === 'persona' ? [val.modo]
        : Array.isArray(val) ? val.map(String) : [String(val)];
      if (!q.depende_valores.some(v => actuales.includes(v))) return false;
    }
  }
  if (q.pregunta_persona) {
    const pp = porClave.get(q.pregunta_persona);
    if (!pp || !esVisible(pp, respuestas, porClave, prof + 1)) return false;
    if (respuestas[pp.clave]?.modo !== 'nueva') return false;
  }
  return true;
}

export function nuevaClave(): string {
  return 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Texto plano de una respuesta (para tablas y Excel). */
export function textoRespuesta(q: Pregunta, v: any, personas?: Record<number, { nombre: string }>): string {
  if (!tieneValor(v)) return '';
  if (q.tipo === 'persona') {
    if (v.modo === 'registrada') return personas?.[v.idpersonas]?.nombre || v.nombre || `#${v.idpersonas}`;
    return [v.primer_nombre, v.segundo_nombre, v.primer_apellido, v.segundo_apellido].filter(Boolean).join(' ');
  }
  if (Array.isArray(v)) return v.join(', ');
  if (q.tipo === 'fecha') {
    const [y, m, d] = String(v).split('-');
    return d ? `${d}/${m}/${y}` : String(v);
  }
  return String(v);
}

@Injectable({ providedIn: 'root' })
export class FormulariosService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/formularios`;
  private pub  = `${environment.apiUrl}/formularios-publicos`;

  // ── Gestión ──────────────────────────────────────────────────
  listarPorActividad(idActividad: number) {
    return this.http.get<FormularioResumen[]>(`${this.base}/actividad/${idActividad}`);
  }
  obtener(id: number) {
    return this.http.get<Formulario>(`${this.base}/${id}`);
  }
  crear(idActividad: number, data: FormularioGuardar) {
    return this.http.post<{ id: number; token: string }>(`${this.base}/actividad/${idActividad}`, data);
  }
  actualizar(id: number, data: FormularioGuardar) {
    return this.http.put<{ ok: boolean }>(`${this.base}/${id}`, data);
  }
  cambiarActivo(id: number, activo: boolean) {
    return this.http.patch<{ ok: boolean }>(`${this.base}/${id}/activo`, { activo });
  }
  eliminar(id: number) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}`);
  }
  respuestas(id: number) {
    return this.http.get<ReporteRespuestas>(`${this.base}/${id}/respuestas`);
  }
  eliminarRespuesta(id: number, idResp: number) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}/respuestas/${idResp}`);
  }
  registrarPersona(id: number, idResp: number, clave: string) {
    return this.http.post<{ idpersonas: number }>(`${this.base}/${id}/respuestas/${idResp}/registrar-persona`, { clave });
  }

  // ── Acceso por URL ────────────────────────────────────────────
  publico(token: string) {
    return this.http.get<FormularioPublico>(`${this.pub}/${encodeURIComponent(token)}`);
  }
  gruposPublicos(token: string, pregunta: string) {
    return this.http.get<{ id: number; nombre: string }[]>(
      `${this.pub}/${encodeURIComponent(token)}/grupos`, { params: { pregunta } });
  }
  buscarPersonas(token: string, pregunta: string, q: string, grupo: number | null) {
    let params = new HttpParams().set('pregunta', pregunta).set('q', q);
    if (grupo) params = params.set('grupo', grupo);
    return this.http.get<PersonaBusqueda[]>(`${this.pub}/${encodeURIComponent(token)}/personas`, { params });
  }
  enviar(token: string, respuestas: Respuestas) {
    return this.http.post<{ id: number; mensaje: string | null; correo_confirmacion: boolean }>(`${this.pub}/${encodeURIComponent(token)}`, { respuestas });
  }

  // ── Helpers ───────────────────────────────────────────────────
  urlPublica(token: string): string {
    return `${window.location.origin}/f/${token}`;
  }
  urlLogo(filename: string): string {
    return `${environment.apiUrl}/files/actividades/logos/${filename}`;
  }
  urlFotoPersona(filename: string): string {
    return `${environment.apiUrl}/uploads/personas/${filename}`;
  }
}
