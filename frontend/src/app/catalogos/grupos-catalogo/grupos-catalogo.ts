import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CatalogosService } from '../../core/services/catalogos.service';
import { PermisosService } from '../../core/services/permisos.service';

interface Grupo { idgrupos: number; grupo: string; activo: number; }
interface Encargado { idpersonas: number; nombre_completo: string; celular: string; email: string; }
interface PersonaLookup { id: number; nombre: string; }

@Component({
  selector: 'app-grupos-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './grupos-catalogo.html',
  styleUrl: './grupos-catalogo.scss',
})
export class GruposCatalogoComponent implements OnInit {
  // Lista de grupos
  grupos      = signal<Grupo[]>([]);
  filtrados   = signal<Grupo[]>([]);
  cargando    = signal(false);
  error       = signal('');
  successMsg  = signal('');
  busqueda    = '';

  // CRUD grupo
  mostrarForm  = signal(false);
  modoEdicion  = signal(false);
  editandoId   = signal<number | null>(null);
  guardando    = signal(false);
  errorForm    = signal('');
  formGrupo    = { grupo: '' };

  // Panel encargados
  grupoSeleccionado = signal<Grupo | null>(null);
  encargados        = signal<Encargado[]>([]);
  cargandoEncargados = signal(false);
  todasPersonas: PersonaLookup[] = [];
  personasFiltradas: PersonaLookup[] = [];
  busquedaPersona = '';

  constructor(
    private svc: CatalogosService,
    public  permisos: PermisosService,
    private http: HttpClient,
  ) {}

  ngOnInit() { this.cargar(); }

  cargar() {
    this.cargando.set(true);
    this.svc.listar('grupos').subscribe({
      next: (d: any[]) => {
        this.grupos.set(d);
        this.filtrar();
        this.cargando.set(false);
      },
      error: (err: any) => { this.error.set(err.message || 'Error al cargar'); this.cargando.set(false); },
    });
  }

  filtrar() {
    const q = this.busqueda.toLowerCase().trim();
    this.filtrados.set(q ? this.grupos().filter(g => g.grupo.toLowerCase().includes(q)) : [...this.grupos()]);
  }

  // ── CRUD ──────────────────────────────────────────────────────
  abrirNuevo() {
    this.formGrupo = { grupo: '' };
    this.modoEdicion.set(false);
    this.editandoId.set(null);
    this.errorForm.set('');
    this.mostrarForm.set(true);
  }

  abrirEditar(g: Grupo) {
    this.formGrupo = { grupo: g.grupo };
    this.modoEdicion.set(true);
    this.editandoId.set(g.idgrupos);
    this.errorForm.set('');
    this.mostrarForm.set(true);
  }

  cerrarForm() { this.mostrarForm.set(false); }

  guardar() {
    if (!this.formGrupo.grupo.trim()) { this.errorForm.set('El nombre del grupo es requerido'); return; }
    this.guardando.set(true);
    this.errorForm.set('');
    const obs$: Observable<any> = this.modoEdicion()
      ? this.svc.actualizar('grupos', this.editandoId()!, this.formGrupo)
      : this.svc.crear('grupos', this.formGrupo);
    obs$.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarForm();
        this.successMsg.set(this.modoEdicion() ? 'Grupo actualizado' : 'Grupo creado');
        setTimeout(() => this.successMsg.set(''), 3000);
        this.cargar();
      },
      error: (err: any) => { this.guardando.set(false); this.errorForm.set(err.message || 'Error al guardar'); },
    });
  }

  toggleActivo(g: Grupo) {
    const accion = g.activo ? 'desactivar' : 'activar';
    if (!confirm(`¿Deseas ${accion} el grupo "${g.grupo}"?`)) return;
    this.svc.toggle('grupos', g.idgrupos).subscribe({
      next: () => this.cargar(),
      error: (err: any) => this.error.set(err.message || 'Error'),
    });
  }

  eliminar(g: Grupo) {
    if (!confirm(`¿Eliminar el grupo "${g.grupo}"? Esta acción no se puede deshacer.`)) return;
    this.svc.eliminar('grupos', g.idgrupos).subscribe({
      next: () => { this.successMsg.set('Grupo eliminado'); setTimeout(() => this.successMsg.set(''), 3000); this.cargar(); },
      error: (err: any) => this.error.set(err.message || 'Error al eliminar'),
    });
  }

  // ── Encargados ────────────────────────────────────────────────
  abrirEncargados(g: Grupo) {
    this.grupoSeleccionado.set(g);
    this.busquedaPersona = '';
    this.cargarEncargados();
    if (!this.todasPersonas.length) {
      this.http.get<PersonaLookup[]>('/api/catalogos/lookup/personas').subscribe({
        next: (p) => { this.todasPersonas = p; this.filtrarPersonas(); },
      });
    }
  }

  cerrarEncargados() { this.grupoSeleccionado.set(null); }

  cargarEncargados() {
    const g = this.grupoSeleccionado();
    if (!g) return;
    this.cargandoEncargados.set(true);
    this.http.get<Encargado[]>(`/api/catalogos/grupos/${g.idgrupos}/encargados`).subscribe({
      next: (e) => { this.encargados.set(e); this.cargandoEncargados.set(false); this.filtrarPersonas(); },
      error: () => this.cargandoEncargados.set(false),
    });
  }

  filtrarPersonas() {
    const q = this.busquedaPersona.toLowerCase();
    const asignados = new Set(this.encargados().map(e => e.idpersonas));
    this.personasFiltradas = this.todasPersonas
      .filter(p => !asignados.has(p.id) && (!q || p.nombre.toLowerCase().includes(q)));
  }

  agregarEncargado(p: PersonaLookup) {
    const g = this.grupoSeleccionado();
    if (!g) return;
    this.http.post<{ message: string }>(`/api/catalogos/grupos/${g.idgrupos}/encargados`, { idpersonas: p.id }).subscribe({
      next: (r) => { this.successMsg.set(r.message); this.cargarEncargados(); setTimeout(() => this.successMsg.set(''), 2500); },
      error: (err: any) => this.error.set(err.message || 'Error al asignar'),
    });
  }

  quitarEncargado(e: Encargado) {
    const g = this.grupoSeleccionado();
    if (!g || !confirm(`¿Quitar a "${e.nombre_completo}" como encargado?`)) return;
    this.http.delete<{ message: string }>(`/api/catalogos/grupos/${g.idgrupos}/encargados/${e.idpersonas}`).subscribe({
      next: (r) => { this.successMsg.set(r.message); this.cargarEncargados(); setTimeout(() => this.successMsg.set(''), 2500); },
      error: (err: any) => this.error.set(err.message || 'Error al quitar'),
    });
  }
}
