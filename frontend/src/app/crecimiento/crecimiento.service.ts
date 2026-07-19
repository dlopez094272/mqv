import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

const BASE = environment.apiUrl + '/crecimiento';

export interface Curso {
  idcursos:         number;
  nombre:           string;
  descripcion:      string | null;
  logo:             string | null;
  color:            string;
  activo:           number;
  created_by:       string | null;
  created_at:       string;
  es_propietario?:  number;
  total_asignados?: number;
  total_preguntas?: number;
  total_contenido?: number;
}

export interface CursoDetalle extends Curso {
  contenido:  ContenidoItem[];
  preguntas:  PreguntaItem[];
}

export interface ContenidoItem {
  idcontenido:           number;
  idcursos:              number;
  titulo:                string;
  descripcion:           string | null;
  video_filename:        string | null;
  video_nombre_original: string | null;
  orden:                 number;
  archivos:              ArchivoItem[];
}

export interface ArchivoItem {
  idarchivo:       number;
  nombre_original: string;
  filename:        string;
  mimetype:        string;
  tamanio:         number;
}

export interface PreguntaItem {
  idpregunta: number;
  pregunta:   string;
  orden:      number;
  opciones:   OpcionItem[];
}

export interface OpcionItem {
  idopcion:    number;
  texto:       string;
  es_correcta?: number;
  orden:       number;
}

export interface AsignacionItem {
  idasignacion:    number;
  usuario:         string;
  nombre_completo: string;
  asignado_at:     string;
  aprobado:        number | null;
}

export interface UsuarioLookup {
  usuario:         string;
  nombre_completo: string;
}

export interface EditorItem {
  ideditor:        number;
  usuario:         string;
  nombre_completo: string;
  agregado_at:     string;
}

export interface MiCurso {
  idcursos:              number;
  nombre:                string;
  descripcion:           string | null;
  logo:                  string | null;
  color:                 string;
  activo:                number;
  asignado_at:           string;
  idevaluacion_aprobada: number | null;
}

export interface MiCursoDetalle extends Curso {
  contenido:            ContenidoItem[];
  total_preguntas:      number;
  evaluacion_aprobada:  EvaluacionAprobada | null;
}

export interface EvaluacionAprobada {
  idevaluacion: number;
  puntaje:      number;
  aprobado:     number;
  completado_at: string;
}

export interface EvaluacionResult {
  puntaje:   number;
  aprobado:  boolean;
  correctas: number;
  total:     number;
}

export interface CertificadoData {
  idevaluacion:  number;
  puntaje:       number;
  completado_at: string;
  curso_nombre:  string;
  curso_logo:    string | null;
  curso_color:   string;
  nombre_completo: string;
}

export interface LogroItem {
  idcursos:      number;
  nombre:        string;
  logo:          string | null;
  color:         string;
  puntaje:       number;
  completado_at: string;
  idevaluacion:  number;
}

@Injectable({ providedIn: 'root' })
export class CrecimientoService {
  private http = inject(HttpClient);

  // ── Gestión de cursos ─────────────────────────────────────────
  listarCursos()                { return this.http.get<Curso[]>(`${BASE}/cursos`); }
  obtenerCurso(id: number)      { return this.http.get<CursoDetalle>(`${BASE}/cursos/${id}`); }

  crearCurso(fd: FormData)      { return this.http.post<any>(`${BASE}/cursos`, fd); }
  actualizarCurso(id: number, fd: FormData) { return this.http.put<any>(`${BASE}/cursos/${id}`, fd); }
  toggleCurso(id: number)       { return this.http.put<any>(`${BASE}/cursos/${id}/toggle`, {}); }

  // ── Contenido ─────────────────────────────────────────────────
  crearContenido(idCurso: number, fd: FormData)  { return this.http.post<any>(`${BASE}/cursos/${idCurso}/contenido`, fd); }
  actualizarContenido(id: number, fd: FormData)  { return this.http.put<any>(`${BASE}/contenido/${id}`, fd); }
  eliminarContenido(id: number)                  { return this.http.delete<any>(`${BASE}/contenido/${id}`); }
  eliminarVideo(idContenido: number)             { return this.http.delete<any>(`${BASE}/contenido/${idContenido}/video`); }
  eliminarArchivo(id: number)                    { return this.http.delete<any>(`${BASE}/archivos/${id}`); }

  // ── Preguntas ─────────────────────────────────────────────────
  crearPregunta(idCurso: number, data: any)  { return this.http.post<any>(`${BASE}/cursos/${idCurso}/preguntas`, data); }
  actualizarPregunta(id: number, data: any)  { return this.http.put<any>(`${BASE}/preguntas/${id}`, data); }
  eliminarPregunta(id: number)               { return this.http.delete<any>(`${BASE}/preguntas/${id}`); }

  // ── Asignaciones ──────────────────────────────────────────────
  listarAsignaciones(idCurso: number)         { return this.http.get<AsignacionItem[]>(`${BASE}/cursos/${idCurso}/asignaciones`); }
  usuariosDisponibles(idCurso: number)        { return this.http.get<UsuarioLookup[]>(`${BASE}/cursos/${idCurso}/usuarios-disponibles`); }
  asignarUsuarios(idCurso: number, usuarios: string[]) { return this.http.post<any>(`${BASE}/cursos/${idCurso}/asignaciones`, { usuarios }); }
  quitarAsignacion(idasignacion: number)      { return this.http.delete<any>(`${BASE}/asignaciones/${idasignacion}`); }

  // ── Editores ──────────────────────────────────────────────────
  listarEditores(idCurso: number)             { return this.http.get<EditorItem[]>(`${BASE}/cursos/${idCurso}/editores`); }
  usuariosDisponiblesEditor(idCurso: number)  { return this.http.get<UsuarioLookup[]>(`${BASE}/cursos/${idCurso}/usuarios-disponibles-editor`); }
  agregarEditores(idCurso: number, usuarios: string[]) { return this.http.post<any>(`${BASE}/cursos/${idCurso}/editores`, { usuarios }); }
  quitarEditor(ideditor: number)              { return this.http.delete<any>(`${BASE}/editores/${ideditor}`); }

  // ── Mis cursos ────────────────────────────────────────────────
  misCursos()                      { return this.http.get<MiCurso[]>(`${BASE}/mis-cursos`); }
  miCursoDetalle(id: number)       { return this.http.get<MiCursoDetalle>(`${BASE}/mis-cursos/${id}`); }
  obtenerPreguntas(id: number)     { return this.http.get<PreguntaItem[]>(`${BASE}/mis-cursos/${id}/preguntas`); }
  evaluarCurso(id: number, body: any) { return this.http.post<EvaluacionResult>(`${BASE}/mis-cursos/${id}/evaluar`, body); }
  datosCertificado(id: number)     { return this.http.get<CertificadoData>(`${BASE}/mis-cursos/${id}/certificado`); }

  // ── Dashboard ─────────────────────────────────────────────────
  misLogros()                      { return this.http.get<LogroItem[]>(`${BASE}/mis-logros`); }

  // ── URLs de archivos ──────────────────────────────────────────
  logoUrl(filename: string)    { return `${BASE}/logos/${filename}`; }
  videoUrl(filename: string)   { return `${environment.apiUrl}/crecimiento/videos/${encodeURIComponent(filename)}?token=${this.token()}`; }
  archivoUrl(filename: string) { return `${environment.apiUrl}/crecimiento/archivos-soporte/${encodeURIComponent(filename)}?token=${this.token()}`; }

  private token() { return localStorage.getItem('mqv_token') ?? ''; }
}
