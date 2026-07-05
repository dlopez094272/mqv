import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

const BASE = environment.apiUrl + '/publicaciones';

export type TipoMedia = 'imagen' | 'video' | 'ninguno';
export type EstadoPublicacion = 'borrador' | 'publicado';
export type TipoPublicacion = 'noticia' | 'evento';

export interface FotoPublicacion {
  idfoto:        number;
  filename:      string;
  original_name: string | null;
  orden:         number;
}

export interface Publicacion {
  idpublicaciones:      number;
  titulo:                string;
  slug:                  string;
  resumen:               string | null;
  contenido_html:        string | null;
  tipo_media:            TipoMedia;
  media_filename:        string | null;
  media_original_name:   string | null;
  estado:                EstadoPublicacion;
  tipo_publicacion:      TipoPublicacion;
  fecha_evento:          string | null;
  created_by:            string | null;
  created_at:            string;
  updated_at:            string;
  publicado_at:          string | null;
  // Presentes solo en el detalle (GET /:id)
  fotos?:                FotoPublicacion[];
  // Presentes solo en el listado (GET /)
  total_fotos?:          number;
  primera_foto?:         string | null;
}

@Injectable({ providedIn: 'root' })
export class PublicacionesService {
  private http = inject(HttpClient);

  listar()              { return this.http.get<Publicacion[]>(`${BASE}`); }
  obtener(id: number)   { return this.http.get<Publicacion>(`${BASE}/${id}`); }

  crear(fd: FormData)                    { return this.http.post<any>(`${BASE}`, fd); }
  actualizar(id: number, fd: FormData)   { return this.http.put<any>(`${BASE}/${id}`, fd); }
  cambiarEstado(id: number, estado: EstadoPublicacion) {
    return this.http.put<any>(`${BASE}/${id}/estado`, { estado });
  }
  eliminar(id: number)  { return this.http.delete<any>(`${BASE}/${id}`); }
  eliminarFoto(idfoto: number) { return this.http.delete<any>(`${BASE}/fotos/${idfoto}`); }

  mediaUrl(filename: string)     { return `${BASE}/media/${encodeURIComponent(filename)}`; }

  // Absoluta: se usa para copiar/compartir en redes, no basta con una ruta relativa
  compartirUrl(slug: string) {
    return `${window.location.origin}${environment.apiUrl}/publicaciones/compartir/${encodeURIComponent(slug)}`;
  }
}
