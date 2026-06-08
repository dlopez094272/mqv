import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { tap } from 'rxjs/operators';

export interface CorreoResumen {
  uid:      number;
  asunto:   string;
  de:       string;
  deNombre: string;
  fecha:    string;
  leido:    boolean;
}

export interface CorreoDetalle extends CorreoResumen {
  para:     string;
  texto:    string;
  html:     string;
  adjuntos: { filename: string; contentType: string; size: number }[];
}

export interface BandejaResp {
  correos: CorreoResumen[];
  total:   number;
  pagina:  number;
  limite:  number;
}

@Injectable({ providedIn: 'root' })
export class CorreoService {
  noLeidos    = signal(0);
  configurado = signal(false);

  constructor(private http: HttpClient) {}

  cargarNoLeidos() {
    return this.http.get<{ total: number; configurado: boolean }>('/api/correo/no-leidos').pipe(
      tap(r => {
        this.noLeidos.set(r.total || 0);
        this.configurado.set(r.configurado || false);
      })
    );
  }

  obtenerCredenciales() {
    return this.http.get<{ configurado: boolean; cuenta?: string }>('/api/correo/credenciales');
  }

  guardarCredenciales(cuenta: string, contrasena: string) {
    return this.http.post<{ ok: boolean }>('/api/correo/credenciales', { cuenta, contrasena });
  }

  eliminarCredenciales() {
    return this.http.delete<{ ok: boolean }>('/api/correo/credenciales');
  }

  listarCarpetas() {
    return this.http.get<{ carpetas: { path: string; name: string }[] }>('/api/correo/carpetas');
  }

  listarBandeja(carpeta = 'INBOX', pagina = 1, limite = 20) {
    const params = new HttpParams()
      .set('carpeta', carpeta)
      .set('pagina',  pagina)
      .set('limite',  limite);
    return this.http.get<BandejaResp>('/api/correo/bandeja', { params });
  }

  leerCorreo(uid: number, carpeta = 'INBOX') {
    const params = new HttpParams().set('carpeta', carpeta);
    return this.http.get<CorreoDetalle>(`/api/correo/${uid}`, { params });
  }

  descargarAdjunto(uid: number, filename: string, carpeta = 'INBOX') {
    const params = new HttpParams()
      .set('carpeta',  carpeta)
      .set('filename', filename);
    return this.http.get(`/api/correo/${uid}/adjunto`, { params, responseType: 'blob' });
  }

  eliminarCorreo(uid: number, carpeta = 'INBOX') {
    const params = new HttpParams().set('carpeta', carpeta);
    return this.http.delete<{ ok: boolean }>(`/api/correo/${uid}`, { params });
  }

  buscarContactos(q: string) {
    const params = new HttpParams().set('q', q);
    return this.http.get<{ contactos: { nombre: string; email: string }[] }>('/api/correo/contactos', { params });
  }

  enviarCorreo(
    para:      string,
    asunto:    string,
    cuerpo:    string,
    esHtml     = true,
    cc?:       string,
    adjuntos?: File[],
  ) {
    const fd = new FormData();
    fd.append('para',   para);
    fd.append('asunto', asunto);
    fd.append('cuerpo', cuerpo);
    fd.append('esHtml', esHtml ? 'true' : 'false');
    if (cc?.trim()) fd.append('cc', cc.trim());
    adjuntos?.forEach(f => fd.append('adjuntos', f, f.name));
    return this.http.post<{ ok: boolean }>('/api/correo/enviar', fd);
  }
}
