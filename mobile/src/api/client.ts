import { APP_VERSION, InfoVersion } from '../version';

export class ApiError extends Error {
  status: number;
  code?: string;
  /** Respuesta completa del servidor (p. ej. datos de la actualización obligatoria). */
  data?: any;
  constructor(message: string, status: number, code?: string, data?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

/** Se llama cuando el servidor exige una versión más nueva de la app (HTTP 426). */
let alExigirActualizacion: ((info: InfoVersion) => void) | null = null;
export function onActualizacionObligatoria(fn: ((info: InfoVersion) => void) | null) {
  alExigirActualizacion = fn;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

/**
 * Petición a la API de MQV. El backend responde los errores como `{ error }`.
 * Un `FormData` se envía tal cual (multipart).
 */
export async function request<T>(baseUrl: string, path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;
  const esFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const headers: Record<string, string> = { Accept: 'application/json', 'X-App-Version': APP_VERSION };
  if (!esFormData && body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : esFormData ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('No se pudo conectar al servidor. Verifica tu conexión a internet.', 0);
  }

  let data: any = null;
  const esJson = (res.headers.get('content-type') || '').includes('application/json');
  try {
    data = await res.json();
  } catch {
    // respuesta sin cuerpo JSON
  }

  if (res.status === 426 && data?.code === 'ACTUALIZAR_APP') alExigirActualizacion?.(data as InfoVersion);
  if (!res.ok) {
    throw new ApiError(data?.error || data?.message || `Error ${res.status}`, res.status, data?.code, data);
  }
  // Una ruta que el servidor aún no tiene devuelve la página web (HTML) con 200.
  if (!esJson && data === null && res.status !== 204) {
    throw new ApiError('Esta función aún no está disponible en el servidor.', 404, 'NO_DISPONIBLE');
  }
  return data as T;
}
