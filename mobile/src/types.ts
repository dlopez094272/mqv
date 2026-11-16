export interface Usuario {
  usuario: string;
  nombre: string;
  primer_ingreso?: number | null;
  is_superadmin?: boolean;
}

export type Permisos = Record<string, string>;

export interface Persona {
  idpersonas: number;
  primer_nombre: string;
  segundo_nombre: string | null;
  primer_apellido: string;
  segundo_apellido: string | null;
  nombre_completo: string;
  fechanacimiento: string | null;
  sexo: string | null;
  foto: string | null;
  celular: string | null;
  telefono: string | null;
  email: string | null;
  perfil_social: string | null;
  zona_domicilio: string | null;
  direccion_domicilio: string | null;
  lugartrabajo: string | null;
  puesto_trabajo: string | null;
  estado_civil: string | null;
  departamento_domicilio: string | null;
  municipio_domicilio: string | null;
  grupos: { idgrupos: number; grupo: string }[];
}

export interface MiCuenta {
  usuario: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  primer_ingreso: number | null;
  is_superadmin: boolean;
  persona: Persona | null;
}

export type TipoCancion = 'cancion' | 'himno' | 'coro';

export interface CancionResumen {
  idcanciones: number;
  titulo: string;
  autor: string | null;
  tipo: TipoCancion;
  tonalidad: string | null;
  bpm: number | null;
  categoria: string | null;
  etiquetas: string | null;
  activo: number;
  tiene_acordes: number;
  tiene_partitura: number;
  total_audios: number;
  total_partituras: number;
  youtube_url: string | null;
  ultima_vez: string | null;
  veces: number;
}

export interface ArchivoCancion {
  idarchivos: number;
  tipo: 'audio' | 'partitura' | 'otro';
  pista: string | null;
  nombre_original: string;
  mimetype: string | null;
  size: number | null;
}

export interface Cancion {
  idcanciones: number;
  titulo: string;
  autor: string | null;
  tipo: TipoCancion;
  tonalidad: string | null;
  bpm: number | null;
  compas: string | null;
  categoria: string | null;
  letra_acordes: string | null;
  partitura_abc: string | null;
  youtube_url: string | null;
  spotify_url: string | null;
  notas: string | null;
  ccli: string | null;
  dominio_publico: number;
  archivos: ArchivoCancion[];
}

export interface Servicio {
  idactividades: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  hora_inicio: string | null;
  logo: string | null;
  lugar: string | null;
  categoria_color: string;
  es_musico: number;
  mi_instrumento: string | null;
  total_canciones: number;
  total_elementos: number;
}

export interface ElementoPrograma {
  idprograma: number;
  orden: number;
  tipo: 'momento' | 'cancion';
  titulo: string | null;
  idcanciones: number | null;
  tonalidad: string | null;
  responsable: string | null;
  hora: string | null;
  duracion_min: number | null;
  notas: string | null;
  cancion_titulo: string | null;
  cancion_autor: string | null;
  cancion_tonalidad: string | null;
  cancion_bpm: number | null;
  tiene_acordes: number;
  total_audios: number;
}

export interface MusicoActividad {
  idactividades_musicos: number;
  idpersonas: number;
  instrumento: string | null;
  nombre: string;
  foto: string | null;
  celular: string | null;
}

export interface ProgramaServicio {
  actividad: {
    idactividades: number;
    nombre: string;
    descripcion: string | null;
    fecha_inicio: string;
    fecha_fin: string;
    hora_inicio: string | null;
    hora_fin: string | null;
    logo: string | null;
    lugar: string | null;
    categoria: string | null;
    categoria_color: string;
  };
  programa: ElementoPrograma[];
  musicos: MusicoActividad[];
}

/* ── Crecimiento: Mis cursos ─────────────────────────────────────────── */

export interface MiCurso {
  idcursos: number;
  nombre: string;
  descripcion: string | null;
  logo: string | null;
  color: string | null;
  asignado_at: string | null;
  idevaluacion_aprobada: number | null;
}

export interface ArchivoCurso {
  idarchivo: number;
  nombre_original: string;
  filename: string;
  mimetype: string;
  tamanio: number;
}

export interface BloqueCurso {
  idcontenido: number;
  titulo: string;
  descripcion: string | null;
  video_filename: string | null;
  video_nombre_original: string | null;
  orden: number;
  archivos: ArchivoCurso[];
}

export interface CursoDetalle {
  idcursos: number;
  nombre: string;
  descripcion: string | null;
  logo: string | null;
  color: string | null;
  contenido: BloqueCurso[];
  total_preguntas: number;
  evaluacion_aprobada: { idevaluacion: number; puntaje: number; aprobado: number; completado_at: string } | null;
}

export interface PreguntaCurso {
  idpregunta: number;
  pregunta: string;
  orden: number;
  opciones: { idopcion: number; texto: string; orden: number }[];
}

export interface ResultadoEvaluacion {
  puntaje: number;
  aprobado: boolean;
  correctas: number;
  total: number;
}

export interface DatosCertificado {
  idevaluacion: number;
  puntaje: number;
  completado_at: string;
  curso_nombre: string;
  curso_logo: string | null;
  curso_color: string | null;
  nombre_completo: string;
}

/* ── Actividades ─────────────────────────────────────────────────────── */

export interface AdjuntoActividad {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface Actividad {
  idactividades: number;
  idcategorias: number | null;
  nombre: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  adjuntos: string | AdjuntoActividad[] | null;
  logo: string | null;
  idlugares: number | null;
  serie: string | null;
  usuario: string | null;
  categoria: string | null;
  categoria_color: string;
  lugar: string | null;
}

export interface OpcionLookup {
  id: number;
  nombre: string;
  color?: string;
}

export interface PersonaAsistencia {
  idpersonas: number;
  nombre_completo: string;
  foto: string | null;
  idactividades_asistentes: number | null;
  comentarios: string | null;
  asiste: number;
  grupos_nombres: string | null;
}

export interface VisitanteAsistencia {
  idactividades_asistentes: number;
  nombre_completo: string;
  telefono: string | null;
  comentarios: string | null;
}

export interface AsistenciaActividad {
  personas: PersonaAsistencia[];
  visitantes: VisitanteAsistencia[];
  contadores: { personas: number; visitantes: number; total: number; porGrupo: { grupo: string; count: number }[] };
}

/* ── Correo ──────────────────────────────────────────────────────────── */

export interface CorreoResumen {
  uid: number;
  asunto: string;
  de: string;
  deNombre: string;
  fecha: string;
  leido: boolean;
}

export interface CorreoCompleto extends CorreoResumen {
  para: string;
  texto: string;
  html: string | false;
  adjuntos: { filename: string; contentType: string; size: number }[];
}

export interface CarpetaCorreo {
  path: string;
  name: string;
}
