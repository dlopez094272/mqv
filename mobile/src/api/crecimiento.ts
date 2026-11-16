import { Api } from '../context/AuthContext';
import { CursoDetalle, DatosCertificado, MiCurso, PreguntaCurso, ResultadoEvaluacion } from '../types';

export const getMisCursos = (api: Api) => api.get<MiCurso[]>('/crecimiento/mis-cursos');
export const getMiCurso = (api: Api, id: number) => api.get<CursoDetalle>(`/crecimiento/mis-cursos/${id}`);
export const getPreguntas = (api: Api, id: number) => api.get<PreguntaCurso[]>(`/crecimiento/mis-cursos/${id}/preguntas`);
export const evaluar = (api: Api, id: number, respuestas: { idpregunta: number; idopcion: number }[]) =>
  api.post<ResultadoEvaluacion>(`/crecimiento/mis-cursos/${id}/evaluar`, { respuestas });
export const getCertificado = (api: Api, id: number) => api.get<DatosCertificado>(`/crecimiento/mis-cursos/${id}/certificado`);

/** Logos de cursos: ruta pública (sin token). */
export const urlLogoCurso = (baseUrl: string, filename: string) => `${baseUrl}/crecimiento/logos/${encodeURIComponent(filename)}`;
/** Rutas que aceptan ?token= (para urlConToken). */
export const rutaVideoCurso = (filename: string) => `/crecimiento/videos/${encodeURIComponent(filename)}`;
export const rutaArchivoCurso = (filename: string) => `/crecimiento/archivos-soporte/${encodeURIComponent(filename)}`;
