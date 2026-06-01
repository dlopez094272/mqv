import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

const HTTP_MSGS: Record<number, string> = {
  0:   'No se puede conectar con el servidor. Verifique su conexión.',
  400: 'Solicitud incorrecta. Verifique los datos ingresados.',
  401: 'Credenciales incorrectas o sesión expirada.',
  403: 'No tiene permisos para realizar esta acción.',
  404: 'El recurso solicitado no fue encontrado.',
  409: 'Ya existe un registro con esos datos.',
  422: 'Los datos ingresados no son válidos.',
  429: 'Demasiadas solicitudes. Intente en unos momentos.',
  500: 'Error interno del servidor. Contacte al administrador.',
  503: 'Servicio no disponible temporalmente.',
};

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const serverMsg = err.error?.error || err.error?.message;
      const msg = serverMsg || HTTP_MSGS[err.status] || `Error inesperado (${err.status})`;
      return throwError(() => new Error(msg));
    })
  );
};
