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
