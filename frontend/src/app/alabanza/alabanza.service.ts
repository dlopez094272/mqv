import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/services/auth.service';

export type TipoCancion = 'cancion' | 'himno' | 'coro';

export interface CancionResumen {
  idcanciones:      number;
  titulo:           string;
  autor:            string | null;
  tipo:             TipoCancion;
  tonalidad:        string | null;
  bpm:              number | null;
  compas:           string | null;
  categoria:        string | null;
  etiquetas:        string | null;
  youtube_url:      string | null;
  dominio_publico:  number;
  activo:           number;
  updated_at:       string;
  tiene_acordes:    number;
  tiene_partitura:  number;
  total_audios:     number;
  total_partituras: number;
  ultima_vez:       string | null;
  veces:            number;
}

export interface ArchivoCancion {
  idarchivos:      number;
  tipo:            'audio' | 'partitura' | 'otro';
  pista:           string | null;
  nombre_original: string;
  mimetype:        string | null;
  size:            number | null;
  orden:           number;
}

export interface Cancion {
  idcanciones:     number;
  titulo:          string;
  autor:           string | null;
  tipo:            TipoCancion;
  tonalidad:       string | null;
  bpm:             number | null;
  compas:          string | null;
  categoria:       string | null;
  etiquetas:       string | null;
  letra_acordes:   string | null;
  partitura_abc:   string | null;
  youtube_url:     string | null;
  spotify_url:     string | null;
  notas:           string | null;
  dominio_publico: number;
  ccli:            string | null;
  activo:          number;
  archivos?:       ArchivoCancion[];
  historial?:      { idactividades: number; nombre: string; fecha_inicio: string; tonalidad: string | null }[];
}

export interface ElementoPrograma {
  idprograma?:        number;
  tipo:               'momento' | 'cancion';
  titulo:             string | null;
  idcanciones:        number | null;
  tonalidad:          string | null;
  responsable:        string | null;
  hora:               string | null;
  duracion_min:       number | null;
  notas:              string | null;
  cancion_titulo?:    string | null;
  cancion_autor?:     string | null;
  cancion_tonalidad?: string | null;
  cancion_bpm?:       number | null;
  tiene_acordes?:     number;
  total_audios?:      number;
}

export interface MusicoActividad {
  idactividades_musicos?: number;
  idpersonas:  number;
  instrumento: string | null;
  nombre?:     string;
  foto?:       string | null;
}

export interface ProgramaActividad {
  actividad: {
    idactividades: number; nombre: string; descripcion: string | null;
    fecha_inicio: string; fecha_fin: string; hora_inicio: string | null; hora_fin: string | null;
    logo: string | null; lugar: string | null; categoria: string | null; categoria_color: string;
  };
  programa: ElementoPrograma[];
  musicos:  MusicoActividad[];
}

export interface EstadisticasAlabanza {
  totales:    { canciones: number; himnos: number; coros: number; cantos: number };
  masTocadas: { idcanciones: number; titulo: string; veces: number; ultima_vez: string }[];
  olvidadas:  { idcanciones: number; titulo: string; ultima_vez: string | null }[];
}

/** Momentos sugeridos para armar el programa con un clic. */
export const MOMENTOS_SUGERIDOS = [
  { titulo: 'Bienvenida',            icono: '👋' },
  { titulo: 'Oración',               icono: '🙏' },
  { titulo: 'Alabanza y adoración',  icono: '🎵' },
  { titulo: 'Lectura bíblica',       icono: '📖' },
  { titulo: 'Diezmos y ofrendas',    icono: '💝' },
  { titulo: 'Anuncios',              icono: '📢' },
  { titulo: 'Predicación',           icono: '🎤' },
  { titulo: 'Santa Cena',            icono: '🍞' },
  { titulo: 'Llamado / Ministración', icono: '🤲' },
  { titulo: 'Bendición final',       icono: '✨' },
];

export const INSTRUMENTOS = [
  'Dirección', 'Voz principal', 'Coros', 'Guitarra acústica', 'Guitarra eléctrica',
  'Bajo', 'Batería', 'Teclado', 'Piano', 'Violín', 'Percusión', 'Sonido', 'Proyección',
];

export const PISTAS = ['Completa', 'Voz', 'Coros', 'Guitarra', 'Bajo', 'Batería', 'Teclado', 'Piano', 'Cuerdas', 'Click', 'Guía'];

@Injectable({ providedIn: 'root' })
export class AlabanzaService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private base = `${environment.apiUrl}/alabanza`;

  listar()                       { return this.http.get<CancionResumen[]>(`${this.base}/canciones`); }
  obtener(id: number)            { return this.http.get<Cancion>(`${this.base}/canciones/${id}`); }
  crear(d: Partial<Cancion>)     { return this.http.post<{ idcanciones: number }>(`${this.base}/canciones`, d); }
  actualizar(id: number, d: Partial<Cancion>) { return this.http.put(`${this.base}/canciones/${id}`, d); }
  eliminar(id: number)           { return this.http.delete(`${this.base}/canciones/${id}`); }
  estadisticas()                 { return this.http.get<EstadisticasAlabanza>(`${this.base}/estadisticas`); }

  subirArchivos(id: number, archivos: File[], tipo: 'audio' | 'partitura' | 'auto', pistas: string[]) {
    const fd = new FormData();
    archivos.forEach(f => fd.append('archivos', f));
    if (tipo !== 'auto') fd.append('tipo', tipo);
    pistas.forEach(p => fd.append('pista', p));
    return this.http.post(`${this.base}/canciones/${id}/archivos`, fd);
  }
  renombrarArchivo(id: number, pista: string) { return this.http.patch(`${this.base}/archivos/${id}`, { pista }); }
  eliminarArchivo(id: number)    { return this.http.delete(`${this.base}/archivos/${id}`); }

  /** URL directa (con token) para <audio>, visor PDF o descarga. */
  urlArchivo(id: number) {
    return `${this.base}/archivos/${id}/contenido?token=${encodeURIComponent(this.auth.getToken() || '')}`;
  }

  programa(idact: number) { return this.http.get<ProgramaActividad>(`${this.base}/actividades/${idact}/programa`); }
  guardarPrograma(idact: number, items: ElementoPrograma[]) {
    return this.http.put<ProgramaActividad>(`${this.base}/actividades/${idact}/programa`, { items });
  }
  guardarMusicos(idact: number, musicos: MusicoActividad[]) {
    return this.http.put<ProgramaActividad>(`${this.base}/actividades/${idact}/musicos`, { musicos });
  }
  programasRecientes() {
    return this.http.get<{ idactividades: number; nombre: string; fecha_inicio: string; elementos: number }[]>(`${this.base}/programas-recientes`);
  }
  personas() { return this.http.get<{ id: number; nombre: string }[]>(`${this.base}/personas`); }
}

/** ID de video de YouTube a partir de cualquier formato de enlace. */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/.exec(url);
  return m ? m[1] : null;
}

/** URL embebible de Spotify (track/album/playlist). */
export function spotifyEmbed(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = /open\.spotify\.com\/(?:intl-\w+\/)?(track|album|playlist)\/(\w+)/.exec(url);
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null;
}

export const ETIQUETA_TIPO: Record<TipoCancion, string> = { cancion: 'Canción', himno: 'Himno', coro: 'Coro' };
