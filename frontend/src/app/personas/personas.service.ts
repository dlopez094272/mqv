import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface PersonaLista {
  idpersonas: number;
  primer_nombre: string;
  segundo_nombre: string;
  primer_apellido: string;
  segundo_apellido: string;
  apellidocasada: string;
  nombre_completo: string;
  fechanacimiento: string;
  edad: number;
  sexo: 'M' | 'F';
  estado_civil: string;
  celular: string;
  email: string;
  foto: string;
  nacionalidad: string;
}

export interface PersonaDetalle extends PersonaLista {
  lugarnacimiento: string;
  idnacionalidades: number;
  idtipos_documento: number;
  nodocumento: string;
  telefono: string;
  perfil_social: string;
  fecha_inicio_asistencia: string;
  fechaconversion: string;
  fechabautiso: string;
  idiglesias_bautizo: number;
  idiglesias: number;
  estado_iglesia_anterior: string;
  iglesia_tiempo_anterior: string;
  iglesia_pastor_anterior: string;
  experiencia_ministerial: string;
  areas_servir: string;
  maestro_escuela_dominical: string;
  motivo_ministerio: string;
  iddepartamentos_nacimiento: number;
  idmunicipios_nacimiento: number;
  iddepartamentos_domicilio: number;
  idmunicipios_domicilio: number;
  zona_domicilio: string;
  direccion_domicilio: string;
  longitud: string;
  latitud: string;
  idprofesiones: number;
  lugartrabajo: string;
  direcciontrabajo: string;
  puesto_trabajo: string;
  experiencia_laboral: string;
  grupos: { idgrupos_personas: number; idgrupos: number; grupo: string }[];
  dept_nacimiento_nombre: string;
  muni_nacimiento_nombre: string;
  dept_domicilio_nombre: string;
  muni_domicilio_nombre: string;
  iglesia_bautizo_nombre: string;
  iglesia_anterior_nombre: string;
  profesion_nombre: string;
  tipo_documento_nombre: string;
}

export interface Cumpleanero {
  idpersonas: number;
  primer_nombre: string;
  primer_apellido: string;
  nombre_completo: string;
  fechanacimiento: string;
  mes_nac: number;
  dia_nac: number;
  edad: number;
  sexo: string;
  celular: string;
  foto: string;
}

export interface FiltrosPersonas {
  nombre?: string;
  sexo?: string;
  estado_civil?: string;
  grupo?: string;
  edad_min?: string;
  edad_max?: string;
  page?: number;
  limit?: number;
}

export interface PersonasPaginadas {
  data: PersonaLista[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface RegistroCrecimiento {
  idpersonas_crecimiento: number;
  idpersonas: number;
  crecimiento: number;
  estado: string;
  fecha: string;
  comentario: string;
}

@Injectable({ providedIn: 'root' })
export class PersonasService {
  private readonly base = environment.apiUrl + '/personas';

  constructor(private http: HttpClient) {}

  listar(filtros: FiltrosPersonas = {}) {
    let params = new HttpParams();
    if (filtros.nombre)       params = params.set('nombre',       filtros.nombre);
    if (filtros.sexo)         params = params.set('sexo',         filtros.sexo);
    if (filtros.estado_civil) params = params.set('estado_civil', filtros.estado_civil);
    if (filtros.grupo)        params = params.set('grupo',        filtros.grupo);
    if (filtros.edad_min)     params = params.set('edad_min',     filtros.edad_min);
    if (filtros.edad_max)     params = params.set('edad_max',     filtros.edad_max);
    params = params.set('page',  String(filtros.page  ?? 1));
    params = params.set('limit', String(filtros.limit ?? 20));
    return this.http.get<PersonasPaginadas>(this.base, { params });
  }

  obtener(id: number) {
    return this.http.get<PersonaDetalle>(`${this.base}/${id}`);
  }

  crear(data: Record<string, any>) {
    return this.http.post<{ message: string; idpersonas: number }>(this.base, data);
  }

  actualizar(id: number, data: Record<string, any>) {
    return this.http.put<{ message: string }>(`${this.base}/${id}`, data);
  }

  eliminar(id: number) {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }

  /** URL de la foto — bajo /api/uploads para que el proxy de Angular la reenvíe al backend. */
  fotoUrl(filename: string): string {
    return `/api/uploads/personas/${filename}`;
  }

  cumpleaneros(mes: number, anio: number) {
    const params = new HttpParams().set('mes', mes).set('anio', anio);
    return this.http.get<{ mes: number; anio: number; cumpleaneros: Cumpleanero[] }>(
      `${this.base}/cumpleaneros`, { params }
    );
  }

  exportarExcel(filtros: FiltrosPersonas = {}) {
    let params = new HttpParams();
    if (filtros.nombre)       params = params.set('nombre',       filtros.nombre);
    if (filtros.sexo)         params = params.set('sexo',         filtros.sexo);
    if (filtros.estado_civil) params = params.set('estado_civil', filtros.estado_civil);
    if (filtros.grupo)        params = params.set('grupo',        filtros.grupo);
    return this.http.get(`${this.base}/exportar`, { params, responseType: 'blob' });
  }

  listarCrecimiento(idpersonas: number) {
    return this.http.get<RegistroCrecimiento[]>(`${this.base}/${idpersonas}/crecimiento`);
  }

  agregarCrecimiento(idpersonas: number, data: { fecha: string; comentario: string; crecimiento: number }) {
    return this.http.post<{ message: string }>(`${this.base}/${idpersonas}/crecimiento`, data);
  }

  eliminarCrecimiento(idpersonas: number, idcrecimiento: number) {
    return this.http.delete<{ message: string }>(`${this.base}/${idpersonas}/crecimiento/${idcrecimiento}`);
  }

  crearUsuarioDesdePersona(idpersonas: number, data: Record<string, any>) {
    return this.http.post<{ message: string }>(`${this.base}/${idpersonas}/crear-usuario`, data);
  }
}
