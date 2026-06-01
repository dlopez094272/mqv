import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermisosService } from '../services/permisos.service';

/**
 * Factory guard que verifica que el usuario tenga el permiso requerido.
 * Carga los permisos desde la API si todavía no están en memoria.
 */
export const permissionGuard = (
  tabla: string,
  operacion: 'A' | 'D' | 'E' | 'S'
): CanActivateFn =>
  async () => {
    const permisos = inject(PermisosService);
    const router   = inject(Router);

    await permisos.cargarSiVacio();

    if (permisos.puede(tabla, operacion)) return true;
    return router.createUrlTree(['/dashboard']);
  };
