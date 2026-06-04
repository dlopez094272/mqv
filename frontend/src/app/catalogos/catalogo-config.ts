export interface CampoConfig {
  nombre: string;
  label: string;
  tipo: 'text' | 'number' | 'decimal' | 'datetime-local' | 'select' | 'color';
  requerido?: boolean;
  /** Para tipo 'select': nombre del endpoint de lookup (departamentos, grupos, actividades) */
  fuente?: string;
  /** Columna del row a mostrar en la tabla (por defecto = nombre) */
  columnaTabla?: string;
}

export interface CatalogoConfig {
  titulo: string;
  tablaPermiso: string;
  apiRuta: string;
  pk: string;
  campos: CampoConfig[];
  tieneActivo: boolean;
}

export const CATALOGO_CONFIGS: Record<string, CatalogoConfig> = {
  iglesias: {
    titulo: 'Iglesias',
    tablaPermiso: 'iglesias',
    apiRuta: 'iglesias',
    pk: 'idiglesias',
    tieneActivo: true,
    campos: [
      { nombre: 'nombre',    label: 'Nombre',    tipo: 'text', requerido: true },
      { nombre: 'direccion', label: 'Dirección', tipo: 'text' },
    ],
  },
  lugares: {
    titulo: 'Lugares',
    tablaPermiso: 'lugares',
    apiRuta: 'lugares',
    pk: 'idlugares',
    tieneActivo: true,
    campos: [
      { nombre: 'lugar',     label: 'Lugar',     tipo: 'text', requerido: true },
      { nombre: 'direccion', label: 'Dirección', tipo: 'text' },
      { nombre: 'telefono',  label: 'Teléfono',  tipo: 'text' },
    ],
  },
  nacionalidades: {
    titulo: 'Nacionalidades',
    tablaPermiso: 'nacionalidades',
    apiRuta: 'nacionalidades',
    pk: 'idnacionalidades',
    tieneActivo: true,
    campos: [
      { nombre: 'nacionalidad', label: 'Nacionalidad', tipo: 'text', requerido: true },
    ],
  },
  departamentos: {
    titulo: 'Departamentos',
    tablaPermiso: 'departamentos',
    apiRuta: 'departamentos',
    pk: 'iddepartamentos',
    tieneActivo: true,
    campos: [
      { nombre: 'departamento', label: 'Departamento', tipo: 'text', requerido: true },
    ],
  },
  municipios: {
    titulo: 'Municipios',
    tablaPermiso: 'municipios',
    apiRuta: 'municipios',
    pk: 'idmunicipios',
    tieneActivo: true,
    campos: [
      { nombre: 'municipio',        label: 'Municipio',    tipo: 'text',   requerido: true },
      { nombre: 'iddepartamentos',  label: 'Departamento', tipo: 'select', fuente: 'departamentos', columnaTabla: 'departamento' },
    ],
  },
  profesiones: {
    titulo: 'Profesiones',
    tablaPermiso: 'profesiones',
    apiRuta: 'profesiones',
    pk: 'idprofesiones',
    tieneActivo: true,
    campos: [
      { nombre: 'profesion', label: 'Profesión', tipo: 'text', requerido: true },
    ],
  },
  roles: {
    titulo: 'Roles',
    tablaPermiso: 'roles',
    apiRuta: 'roles',
    pk: 'idroles',
    tieneActivo: true,
    campos: [
      { nombre: 'rol', label: 'Rol', tipo: 'text', requerido: true },
    ],
  },
  tesoreria: {
    titulo: 'Tesorería',
    tablaPermiso: 'tesoreria',
    apiRuta: 'tesoreria',
    pk: 'idtesoreria',
    tieneActivo: true,
    campos: [
      { nombre: 'nombre',        label: 'Nombre',        tipo: 'text',          requerido: true },
      { nombre: 'saldo',         label: 'Saldo',         tipo: 'decimal' },
      { nombre: 'fecha_cracion', label: 'Fecha creación',tipo: 'datetime-local' },
      { nombre: 'creador',       label: 'Creador',       tipo: 'text' },
      { nombre: 'responsable',   label: 'Responsable',   tipo: 'text' },
    ],
  },
  tipos_documento: {
    titulo: 'Tipos de Documento',
    tablaPermiso: 'tipos_documento',
    apiRuta: 'tipos_documento',
    pk: 'idtipos_documento',
    tieneActivo: true,
    campos: [
      { nombre: 'documento', label: 'Documento', tipo: 'text', requerido: true },
    ],
  },
  experiencia_ministerial: {
    titulo: 'Experiencia Ministerial',
    tablaPermiso: 'experiencia_ministerial',
    apiRuta: 'experiencia_ministerial',
    pk: 'idexperiencia_ministerial',
    tieneActivo: true,
    campos: [
      { nombre: 'experiencia_ministerial', label: 'Experiencia Ministerial', tipo: 'text', requerido: true },
    ],
  },
  experiencia_laboral: {
    titulo: 'Experiencia Laboral',
    tablaPermiso: 'experiencia_laboral',
    apiRuta: 'experiencia_laboral',
    pk: 'idexperiencia_laboral',
    tieneActivo: true,
    campos: [
      { nombre: 'experiencia_laboral', label: 'Experiencia Laboral', tipo: 'text', requerido: true },
    ],
  },
  actividades_categorias: {
    titulo: 'Categorías de Actividades',
    tablaPermiso: 'actividades_categorias',
    apiRuta: 'actividades_categorias',
    pk: 'idactividades_categorias',
    tieneActivo: true,
    campos: [
      { nombre: 'categoria', label: 'Categoría', tipo: 'text',  requerido: true },
      { nombre: 'color',     label: 'Color',      tipo: 'color' },
    ],
  },
  actividades_grupos: {
    titulo: 'Actividades - Grupos',
    tablaPermiso: 'actividades_grupos',
    apiRuta: 'actividades_grupos',
    pk: 'idactividades_grupos',
    tieneActivo: false,
    campos: [
      { nombre: 'idactividades', label: 'Actividad', tipo: 'select', fuente: 'actividades', columnaTabla: 'actividad', requerido: true },
      { nombre: 'idgrupos',      label: 'Grupo',     tipo: 'select', fuente: 'grupos',      columnaTabla: 'grupo',     requerido: true },
    ],
  },
  grupos: {
    titulo: 'Grupos',
    tablaPermiso: 'grupos',
    apiRuta: 'grupos',
    pk: 'idgrupos',
    tieneActivo: true,
    campos: [
      { nombre: 'grupo', label: 'Grupo', tipo: 'text', requerido: true },
    ],
  },
  estados_crecimiento: {
    titulo: 'Estados de Crecimiento',
    tablaPermiso: 'estados_crecimiento',
    apiRuta: 'estados_crecimiento',
    pk: 'idestados_crecimiento',
    tieneActivo: true,
    campos: [
      { nombre: 'estado', label: 'Estado de Crecimiento', tipo: 'text', requerido: true },
    ],
  },
  tesoreria_tipomov: {
    titulo: 'Tipos de Movimiento',
    tablaPermiso: 'tesoreria_tipomov',
    apiRuta: 'tesoreria_tipomov',
    pk: 'idtesoreria_tipomov',
    tieneActivo: true,
    campos: [
      { nombre: 'tipo_movimiento', label: 'Tipo de Movimiento', tipo: 'text', requerido: true },
    ],
  },
};
