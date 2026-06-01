export interface Usuario {
  usuario: string;
  nombre_completo: string;
  email: string;
  telefono?: string;
  activo: number;
  primer_ingreso: number;
  tiene_foto?: boolean;
}

export interface UsuarioForm {
  usuario: string;
  nombre_completo: string;
  email: string;
  telefono?: string;
  foto?: string;
}

export interface AuthResponse {
  token: string;
  usuario: string;
  nombre: string;
  primer_ingreso: number;
  is_superadmin: boolean;
}

export interface GrupoPermiso {
  GroupID: number;
  Label: string;
  Comment?: string;
  total_miembros?: number;
}

export interface GrupoDetalle extends GrupoPermiso {
  miembros: { UserName: string; nombre_completo: string; email: string }[];
  derechos: Record<string, string>;
  features: { name: string; label: string }[];
}
