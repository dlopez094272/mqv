import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { superadminGuard } from './core/guards/superadmin.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { CATALOGO_CONFIGS } from './catalogos/catalogo-config';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // Páginas públicas
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login').then(m => m.LoginComponent),
  },
  {
    path: 'olvide-mi-password',
    loadComponent: () => import('./auth/forgot-password/forgot-password').then(m => m.ForgotPasswordComponent),
  },
  {
    path: 'restablecer-password',
    loadComponent: () => import('./auth/reset-password/reset-password').then(m => m.ResetPasswordComponent),
  },
  {
    path: 'completar-registro',
    loadComponent: () => import('./auth/complete-registration/complete-registration').then(m => m.CompleteRegistrationComponent),
  },

  // Páginas protegidas (dentro del shell)
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then(m => m.ShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard').then(m => m.DashboardComponent),
      },
      {
        path: 'cambiar-password',
        loadComponent: () => import('./auth/change-password/change-password').then(m => m.ChangePasswordComponent),
      },
      {
        path: 'mi-perfil',
        loadComponent: () => import('./personas/persona-form/persona-form').then(m => m.PersonaFormComponent),
        data: { modoPerfil: true },
      },
      // Usuarios (protegidos por permisos)
      {
        path: 'seguridad/usuarios',
        canActivate: [permissionGuard('usuarios', 'S')],
        loadComponent: () => import('./seguridad/usuarios/usuarios').then(m => m.UsuariosComponent),
      },
      {
        path: 'seguridad/usuarios/nuevo',
        canActivate: [permissionGuard('usuarios', 'A')],
        loadComponent: () => import('./seguridad/usuario-form/usuario-form').then(m => m.UsuarioFormComponent),
      },
      {
        path: 'seguridad/usuarios/:usuario/editar',
        canActivate: [permissionGuard('usuarios', 'E')],
        loadComponent: () => import('./seguridad/usuario-form/usuario-form').then(m => m.UsuarioFormComponent),
      },
      // Grupos y permisos (solo superadmin)
      {
        path: 'seguridad/grupos',
        canActivate: [superadminGuard],
        loadComponent: () => import('./seguridad/grupos/grupos').then(m => m.GruposComponent),
      },
      {
        path: 'seguridad/grupos/:id',
        canActivate: [superadminGuard],
        loadComponent: () => import('./seguridad/grupo-detalle/grupo-detalle').then(m => m.GrupoDetalleComponent),
      },
      // Catálogos
      {
        path: 'catalogos/iglesias',
        canActivate: [permissionGuard('iglesias', 'S')],
        loadComponent: () => import('./catalogos/catalogo/catalogo').then(m => m.CatalogoComponent),
        data: { config: CATALOGO_CONFIGS['iglesias'] },
      },
      {
        path: 'catalogos/lugares',
        canActivate: [permissionGuard('lugares', 'S')],
        loadComponent: () => import('./catalogos/catalogo/catalogo').then(m => m.CatalogoComponent),
        data: { config: CATALOGO_CONFIGS['lugares'] },
      },
      {
        path: 'catalogos/nacionalidades',
        canActivate: [permissionGuard('nacionalidades', 'S')],
        loadComponent: () => import('./catalogos/catalogo/catalogo').then(m => m.CatalogoComponent),
        data: { config: CATALOGO_CONFIGS['nacionalidades'] },
      },
      {
        path: 'catalogos/departamentos',
        canActivate: [permissionGuard('departamentos', 'S')],
        loadComponent: () => import('./catalogos/catalogo/catalogo').then(m => m.CatalogoComponent),
        data: { config: CATALOGO_CONFIGS['departamentos'] },
      },
      {
        path: 'catalogos/municipios',
        canActivate: [permissionGuard('municipios', 'S')],
        loadComponent: () => import('./catalogos/catalogo/catalogo').then(m => m.CatalogoComponent),
        data: { config: CATALOGO_CONFIGS['municipios'] },
      },
      {
        path: 'catalogos/profesiones',
        canActivate: [permissionGuard('profesiones', 'S')],
        loadComponent: () => import('./catalogos/catalogo/catalogo').then(m => m.CatalogoComponent),
        data: { config: CATALOGO_CONFIGS['profesiones'] },
      },
      {
        path: 'catalogos/roles',
        canActivate: [permissionGuard('roles', 'S')],
        loadComponent: () => import('./catalogos/catalogo/catalogo').then(m => m.CatalogoComponent),
        data: { config: CATALOGO_CONFIGS['roles'] },
      },
      {
        path: 'catalogos/tipos-documento',
        canActivate: [permissionGuard('tipos_documento', 'S')],
        loadComponent: () => import('./catalogos/catalogo/catalogo').then(m => m.CatalogoComponent),
        data: { config: CATALOGO_CONFIGS['tipos_documento'] },
      },
      {
        path: 'catalogos/experiencia-ministerial',
        canActivate: [permissionGuard('experiencia_ministerial', 'S')],
        loadComponent: () => import('./catalogos/catalogo/catalogo').then(m => m.CatalogoComponent),
        data: { config: CATALOGO_CONFIGS['experiencia_ministerial'] },
      },
      {
        path: 'catalogos/experiencia-laboral',
        canActivate: [permissionGuard('experiencia_laboral', 'S')],
        loadComponent: () => import('./catalogos/catalogo/catalogo').then(m => m.CatalogoComponent),
        data: { config: CATALOGO_CONFIGS['experiencia_laboral'] },
      },
      {
        path: 'catalogos/actividades-categorias',
        canActivate: [permissionGuard('actividades_categorias', 'S')],
        loadComponent: () => import('./catalogos/catalogo/catalogo').then(m => m.CatalogoComponent),
        data: { config: CATALOGO_CONFIGS['actividades_categorias'] },
      },
      {
        path: 'catalogos/actividades-grupos',
        canActivate: [permissionGuard('actividades_grupos', 'S')],
        loadComponent: () => import('./catalogos/catalogo/catalogo').then(m => m.CatalogoComponent),
        data: { config: CATALOGO_CONFIGS['actividades_grupos'] },
      },
      {
        path: 'catalogos/grupos',
        canActivate: [permissionGuard('grupos', 'S')],
        loadComponent: () => import('./catalogos/grupos-catalogo/grupos-catalogo').then(m => m.GruposCatalogoComponent),
      },
      {
        path: 'catalogos/estados-crecimiento',
        canActivate: [permissionGuard('estados_crecimiento', 'S')],
        loadComponent: () => import('./catalogos/catalogo/catalogo').then(m => m.CatalogoComponent),
        data: { config: CATALOGO_CONFIGS['estados_crecimiento'] },
      },
      {
        path: 'catalogos/tesoreria-tipomov',
        canActivate: [permissionGuard('tesoreria_tipomov', 'S')],
        loadComponent: () => import('./catalogos/catalogo/catalogo').then(m => m.CatalogoComponent),
        data: { config: CATALOGO_CONFIGS['tesoreria_tipomov'] },
      },
      // Actividades
      {
        path: 'actividades',
        canActivate: [permissionGuard('actividades', 'S')],
        loadComponent: () => import('./actividades/actividades.component').then(m => m.ActividadesComponent),
      },
      // Tesorería
      {
        path: 'tesoreria',
        canActivate: [permissionGuard('tesoreria', 'S')],
        loadComponent: () => import('./tesoreria/tesoreria-list/tesoreria-list').then(m => m.TesoreriaListComponent),
      },
      {
        path: 'tesoreria/:id/movimientos',
        canActivate: [authGuard],
        loadComponent: () => import('./tesoreria/tesoreria-movimientos/tesoreria-movimientos').then(m => m.TesoreriaMovimientosComponent),
      },
      // Reportes
      {
        path: 'reportes/cumpleaneros',
        canActivate: [permissionGuard('personas', 'S')],
        loadComponent: () => import('./personas/cumpleaneros/cumpleaneros').then(m => m.CumpleaneroesComponent),
      },
      {
        path: 'reportes/actividades',
        canActivate: [permissionGuard('actividades', 'S')],
        loadComponent: () => import('./reportes/reportes-actividades/reportes-actividades').then(m => m.ReportesActividadesComponent),
      },
      {
        path: 'reportes/personas',
        canActivate: [permissionGuard('personas', 'S')],
        loadComponent: () => import('./reportes/reportes-personas/reportes-personas').then(m => m.ReportesPersonasComponent),
      },
      // Crecimiento — Gestión de Cursos (permiso: cursos)
      {
        path: 'crecimiento/cursos',
        canActivate: [permissionGuard('cursos', 'S')],
        loadComponent: () => import('./crecimiento/gestion-cursos/gestion-cursos').then(m => m.GestionCursosComponent),
      },
      {
        path: 'crecimiento/cursos/nuevo',
        canActivate: [permissionGuard('cursos', 'A')],
        loadComponent: () => import('./crecimiento/gestion-cursos-form/gestion-cursos-form').then(m => m.GestionCursosFormComponent),
      },
      {
        path: 'crecimiento/cursos/:id/editar',
        canActivate: [permissionGuard('cursos', 'E')],
        loadComponent: () => import('./crecimiento/gestion-cursos-form/gestion-cursos-form').then(m => m.GestionCursosFormComponent),
      },
      // Crecimiento — Mis Cursos (permiso: mis_cursos)
      {
        path: 'crecimiento/mis-cursos',
        canActivate: [permissionGuard('mis_cursos', 'S')],
        loadComponent: () => import('./crecimiento/mis-cursos/mis-cursos').then(m => m.MisCursosComponent),
      },
      {
        path: 'crecimiento/mis-cursos/:id',
        canActivate: [permissionGuard('mis_cursos', 'S')],
        loadComponent: () => import('./crecimiento/mis-cursos-detalle/mis-cursos-detalle').then(m => m.MisCursosDetalleComponent),
      },
      {
        path: 'crecimiento/mis-cursos/:id/evaluacion',
        canActivate: [permissionGuard('mis_cursos', 'S')],
        loadComponent: () => import('./crecimiento/mis-cursos-evaluacion/mis-cursos-evaluacion').then(m => m.MisCursosEvaluacionComponent),
      },
      // Correo
      {
        path: 'correo',
        canActivate: [permissionGuard('correo', 'S')],
        loadComponent: () => import('./correo/correo.component').then(m => m.CorreoComponent),
      },
      // Personas
      {
        path: 'personas',
        canActivate: [permissionGuard('personas', 'S')],
        loadComponent: () => import('./personas/personas-list/personas-list').then(m => m.PersonasListComponent),
      },
      {
        path: 'personas/nuevo',
        canActivate: [permissionGuard('personas', 'A')],
        loadComponent: () => import('./personas/persona-form/persona-form').then(m => m.PersonaFormComponent),
      },
      {
        path: 'personas/cumpleaneros',
        canActivate: [permissionGuard('personas', 'S')],
        loadComponent: () => import('./personas/cumpleaneros/cumpleaneros').then(m => m.CumpleaneroesComponent),
      },
      {
        path: 'personas/:id/editar',
        canActivate: [permissionGuard('personas', 'E')],
        loadComponent: () => import('./personas/persona-form/persona-form').then(m => m.PersonaFormComponent),
      },
    ],
  },

  // Reporte de tesorería (fuera del shell — página limpia para impresión/PDF)
  {
    path: 'tesoreria/:id/reporte',
    canActivate: [authGuard],
    loadComponent: () => import('./tesoreria/tesoreria-reporte/tesoreria-reporte').then(m => m.TesoreriaReporteComponent),
  },

  // Certificado de curso (fuera del shell — página limpia para impresión)
  {
    path: 'certificado/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./crecimiento/certificado/certificado').then(m => m.CertificadoComponent),
  },

  { path: '**', redirectTo: 'dashboard' },
];
