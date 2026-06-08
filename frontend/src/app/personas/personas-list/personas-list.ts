import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { PersonasService, PersonaLista, FiltrosPersonas } from '../personas.service';
import { PermisosService } from '../../core/services/permisos.service';
import { AuthService } from '../../core/services/auth.service';
import { CatalogosService, LookupItem } from '../../core/services/catalogos.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { confirmar } from '../../shared/confirmar.util';

@Component({
  selector: 'app-personas-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './personas-list.html',
  styleUrl: './personas-list.scss',
})
export class PersonasListComponent implements OnInit {
  personas       = signal<PersonaLista[]>([]);
  cargando       = signal(false);
  error          = signal('');
  successMsg     = signal('');
  exportando     = signal(false);

  // Paginación
  totalRegistros = signal(0);
  paginaActual   = signal(1);
  totalPaginas   = signal(0);
  readonly LIMITE = 20;

  filtros: FiltrosPersonas = {};
  grupos: LookupItem[] = [];

  readonly ESTADOS_CIVIL = ['Solter@','Casad@','Viud@','Unid@','Divorciad@'];

  // Páginas a mostrar en el paginador
  paginas = computed(() => {
    const total = this.totalPaginas();
    const actual = this.paginaActual();
    if (total <= 1) return [];
    const rango: (number | '...')[] = [];
    const delta = 2;
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= actual - delta && i <= actual + delta)) {
        rango.push(i);
      } else if (rango[rango.length - 1] !== '...') {
        rango.push('...');
      }
    }
    return rango;
  });

  // Modal crear usuario
  modalCrearUsuario = signal(false);
  personaParaUsuario: PersonaLista | null = null;
  gruposPermiso: { GroupID: number; Label: string }[] = [];
  gruposCongregacion: LookupItem[] = [];
  creandoUsuario = signal(false);
  errorCrearUsuario = signal('');
  codigoDisponible = signal<boolean | null>(null);
  verificandoCodigo = signal(false);

  nuevoUsuario = {
    usuario: '',
    nombre_completo: '',
    email: '',
    telefono: '',
    grupo_id: 0,
    encargado_grupo_id: 0,
  };

  constructor(
    private svc: PersonasService,
    public  permisos: PermisosService,
    public  auth: AuthService,
    private catalogoSvc: CatalogosService,
    private usuariosSvc: UsuariosService,
    private http: HttpClient,
  ) {}

  ngOnInit() {
    this.cargar();
    this.catalogoSvc.lookup('grupos').subscribe({ next: (d: LookupItem[]) => {
      this.grupos = d;
      this.gruposCongregacion = d;
    }});
    this.http.get<{ GroupID: number; Label: string }[]>('/api/seguridad/grupos-lista').subscribe({
      next: (g) => { this.gruposPermiso = g; },
      error: () => {},
    });
  }

  cargar(pagina = this.paginaActual()) {
    this.cargando.set(true);
    this.error.set('');
    const filtros: FiltrosPersonas = { ...this.filtros, page: pagina, limit: this.LIMITE };
    this.svc.listar(filtros).subscribe({
      next: (res) => {
        this.personas.set(res.data);
        this.totalRegistros.set(res.total);
        this.paginaActual.set(res.page);
        this.totalPaginas.set(res.pages);
        this.cargando.set(false);
      },
      error: (err) => { this.error.set(err.message || 'Error al cargar'); this.cargando.set(false); },
    });
  }

  buscar() {
    this.cargar(1);
  }

  limpiarFiltros() {
    this.filtros = {};
    this.cargar(1);
  }

  irPagina(p: number | '...') {
    if (p === '...' || p === this.paginaActual()) return;
    this.cargar(p as number);
  }

  async eliminar(p: PersonaLista) {
    if (!await confirmar(`¿Eliminar a <b>${p.nombre_completo}</b>?<br>Esta acción no se puede deshacer.`, { peligro: true })) return;
    this.svc.eliminar(p.idpersonas).subscribe({
      next: (r) => { this.successMsg.set(r.message); this.cargar(); setTimeout(() => this.successMsg.set(''), 3000); },
      error: (err) => this.error.set(err.message || 'Error al eliminar'),
    });
  }

  exportar() {
    this.exportando.set(true);
    this.svc.exportarExcel(this.filtros).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'personas.xlsx'; a.click();
        URL.revokeObjectURL(url); this.exportando.set(false);
      },
      error: () => { this.error.set('Error al exportar'); this.exportando.set(false); },
    });
  }

  edadLabel(edad: number): string { return edad === 1 ? '1 año' : `${edad} años`; }
  sexoLabel(s: string): string { return s === 'M' ? 'Masculino' : 'Femenino'; }
  fotoUrl(filename: string): string { return this.svc.fotoUrl(filename); }

  // ── Modal crear usuario ──────────────────────────────────────
  abrirModalCrearUsuario(p: PersonaLista) {
    this.personaParaUsuario = p;
    this.errorCrearUsuario.set('');
    this.codigoDisponible.set(null);

    const primer = (p.primer_nombre || '').trim().toLowerCase().replace(/\s+/g, '');
    const iniAp1 = (p.primer_apellido || '').trim()[0]?.toLowerCase() || '';
    const iniAp2 = (p.segundo_apellido || '').trim()[0]?.toLowerCase() || '';
    const sugerido = (primer + iniAp1 + iniAp2).substring(0, 10);

    this.nuevoUsuario = {
      usuario: sugerido,
      nombre_completo: p.nombre_completo,
      email: p.email || '',
      telefono: p.celular || '',
      grupo_id: 0,
      encargado_grupo_id: 0,
    };
    if (sugerido) this.verificarCodigo();
    this.modalCrearUsuario.set(true);
  }

  cerrarModal() { this.modalCrearUsuario.set(false); this.personaParaUsuario = null; }

  verificarCodigo() {
    const codigo = this.nuevoUsuario.usuario.trim();
    if (!codigo) { this.codigoDisponible.set(null); return; }
    this.verificandoCodigo.set(true);
    this.usuariosSvc.verificarCodigo(codigo).subscribe({
      next: (r) => { this.codigoDisponible.set(r.disponible); this.verificandoCodigo.set(false); },
      error: () => { this.verificandoCodigo.set(false); },
    });
  }

  crearUsuario() {
    if (!this.personaParaUsuario) return;
    const { usuario, nombre_completo, email, telefono, grupo_id, encargado_grupo_id } = this.nuevoUsuario;
    if (!usuario || !nombre_completo || !email) {
      this.errorCrearUsuario.set('Código, nombre completo y correo son requeridos');
      return;
    }
    if (this.codigoDisponible() === false) {
      this.errorCrearUsuario.set('El código de usuario ya está en uso');
      return;
    }
    this.creandoUsuario.set(true);
    this.errorCrearUsuario.set('');
    this.svc.crearUsuarioDesdePersona(this.personaParaUsuario.idpersonas, {
      usuario, nombre_completo, email, telefono: telefono || null,
      grupo_id: grupo_id || null, encargado_grupo_id: encargado_grupo_id || null,
    }).subscribe({
      next: (r) => {
        this.creandoUsuario.set(false);
        this.successMsg.set(r.message);
        this.cerrarModal();
        setTimeout(() => this.successMsg.set(''), 4000);
      },
      error: (err) => { this.errorCrearUsuario.set(err.message || 'Error al crear usuario'); this.creandoUsuario.set(false); },
    });
  }
}
