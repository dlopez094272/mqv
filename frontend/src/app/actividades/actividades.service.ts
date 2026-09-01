import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface AdjuntoInfo {
  filename:     string;
  originalname: string;
  mimetype:     string;
  size:         number;
}

export interface Actividad {
  idactividades:   number;
  idcategorias:    number | null;
  nombre:          string;
  descripcion:     string | null;
  fecha_inicio:    string;
  fecha_fin:       string;
  hora_inicio:     string | null;
  hora_fin:        string | null;
  adjuntos:        AdjuntoInfo[] | string | null;
  logo:            string | null;
  idlugares:       number | null;
  usuario:         string | null;
  created_at:      string;
  categoria:       string | null;
  categoria_color: string | null;
  lugar:           string | null;
}

export interface CategoriaLookup {
  id:     number;
  nombre: string;
  color:  string;
}

export interface LugarLookup {
  id:     number;
  nombre: string;
}

export interface AsistenciaPersona {
  idpersonas:                number;
  nombre_completo:           string;
  foto:                      string | null;
  idactividades_asistentes:  number | null;
  comentarios:               string | null;
  asiste:                    boolean;
  grupos_nombres:            string | null;
}

export interface Visitante {
  idactividades_asistentes: number;
  nombre_completo:          string;
  telefono:                 string | null;
  comentarios:              string | null;
}

export interface ContadorGrupo {
  grupo: string;
  count: number;
}

export interface GrupoLookup {
  id:     number;
  nombre: string;
}

export interface AsistenciaResumen {
  personas:   AsistenciaPersona[];
  visitantes: Visitante[];
  contadores: {
    personas:   number;
    visitantes: number;
    total:      number;
    porGrupo:   ContadorGrupo[];
  };
}

export interface PersonaDescriptor {
  idpersonas: number;
  nombre:     string;
  foto:       string | null;
  descriptor: number[] | null;
  foto_ref:   string | null;
}

export interface ActividadMovimiento {
  idtesoreria_movimientos: number;
  idtesoreria:             number;
  tesoreria:               string;
  fecha:                   string;
  concepto:                string;
  credito:                 number;
  debito:                  number;
  tipo_movimiento:         string | null;
}

export interface ActividadTesoreriaResumen {
  movimientos: ActividadMovimiento[];
  totales: { ingresos: number; egresos: number; saldo: number };
}

export interface NuevoMovimientoActividad {
  tipo:               'ingreso' | 'egreso';
  concepto:            string;
  monto:               number;
  idtipo_movimiento?:  number | string;
  fecha?:              string;
}

@Injectable({ providedIn: 'root' })
export class ActividadesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/actividades`;

  listar() {
    return this.http.get<Actividad[]>(this.base);
  }

  obtener(id: number) {
    return this.http.get<Actividad>(`${this.base}/${id}`);
  }

  crear(data: FormData) {
    return this.http.post<{ id: number }>(this.base, data);
  }

  actualizar(id: number, data: FormData) {
    return this.http.put<{ ok: boolean }>(`${this.base}/${id}`, data);
  }

  eliminar(id: number) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}`);
  }

  urlLogo(filename: string): string {
    return `${environment.apiUrl}/files/actividades/logos/${filename}`;
  }

  urlFotoPersona(filename: string): string {
    return `${environment.apiUrl}/uploads/personas/${filename}`;
  }

  descargarAdjunto(filename: string, originalname: string) {
    this.http.get(`${this.base}/adjuntos/${filename}`, { responseType: 'blob' }).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = originalname;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
    });
  }

  listarAsistencia(idActividad: number) {
    return this.http.get<AsistenciaResumen>(`${this.base}/${idActividad}/asistentes`);
  }

  agregarAsistente(idActividad: number, data: {
    idpersonas?: number;
    nombre_completo?: string;
    telefono?: string;
    comentarios?: string;
  }) {
    return this.http.post<{ id: number }>(`${this.base}/${idActividad}/asistentes`, data);
  }

  eliminarAsistente(idActividad: number, idAsistente: number) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${idActividad}/asistentes/${idAsistente}`);
  }

  listarGruposDisponibles() {
    return this.http.get<GrupoLookup[]>(`${this.base}/grupos-disponibles`);
  }

  listarGruposActividad(idActividad: number) {
    return this.http.get<number[]>(`${this.base}/${idActividad}/grupos`);
  }

  obtenerDescriptoresFaciales() {
    return this.http.get<PersonaDescriptor[]>(`${this.base}/faces/descriptors`);
  }

  guardarDescriptorFacial(idpersonas: number, descriptor: number[], foto_ref?: string) {
    return this.http.post<{ ok: boolean }>(`${this.base}/faces/descriptor`, { idpersonas, descriptor, foto_ref });
  }

  listarTesoreria(idActividad: number) {
    return this.http.get<ActividadTesoreriaResumen>(`${this.base}/${idActividad}/tesoreria`);
  }

  registrarTesoreria(idActividad: number, idtesoreria: number, movimientos: NuevoMovimientoActividad[]) {
    return this.http.post<{ ids: number[] }>(`${this.base}/${idActividad}/tesoreria`, { idtesoreria, movimientos });
  }
}
