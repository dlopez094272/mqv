import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GruposService } from '../../core/services/grupos.service';
import { GrupoDetalle } from '../../core/models/usuario.model';

type Tab = 'miembros' | 'derechos';

const PERM_LABELS: Record<string, string> = {
  A: 'Agregar',
  D: 'Eliminar',
  E: 'Editar',
  S: 'Consultar',
};

@Component({
  selector: 'app-grupo-detalle',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './grupo-detalle.html',
  styleUrl: './grupo-detalle.scss',
})
export class GrupoDetalleComponent implements OnInit {
  grupo = signal<GrupoDetalle | null>(null);
  cargando = signal(true);
  error = signal('');
  successMsg = signal('');
  tab = signal<Tab>('miembros');

  // Miembros
  busquedaUsuario = '';
  usuariosDisponibles = signal<{ usuario: string; nombre_completo: string; email: string }[]>([]);
  filtradosDisp = signal<{ usuario: string; nombre_completo: string; email: string }[]>([]);
  cargandoDisp = signal(false);

  // Derechos (local copy for editing)
  derechosLocal: Record<string, Set<string>> = {};
  savingDerechos = signal(false);

  readonly PERMS = ['A', 'D', 'E', 'S'];
  readonly PERM_LABELS = PERM_LABELS;

  constructor(private svc: GruposService, private route: ActivatedRoute) {}

  ngOnInit() {
    const id = parseInt(this.route.snapshot.paramMap.get('id') || '0');
    this.cargar(id);
  }

  cargar(id: number) {
    this.cargando.set(true);
    this.svc.obtener(id).subscribe({
      next: (g) => {
        this.grupo.set(g);
        // Init local derechos
        this.derechosLocal = {};
        for (const [tabla, mask] of Object.entries(g.derechos)) {
          this.derechosLocal[tabla] = new Set(mask.split(''));
        }
        for (const f of g.features) {
          if (!this.derechosLocal[f.name]) this.derechosLocal[f.name] = new Set();
        }
        this.cargando.set(false);
      },
      error: (e) => { this.error.set(e.message); this.cargando.set(false); },
    });
  }

  setTab(t: Tab) {
    this.tab.set(t);
    if (t === 'miembros' && this.grupo()) {
      this.cargarDisponibles();
    }
  }

  cargarDisponibles() {
    const g = this.grupo();
    if (!g) return;
    this.cargandoDisp.set(true);
    this.svc.usuariosDisponibles(g.GroupID).subscribe({
      next: (u) => {
        this.usuariosDisponibles.set(u);
        this.filtrarDisp();
        this.cargandoDisp.set(false);
      },
      error: () => this.cargandoDisp.set(false),
    });
  }

  filtrarDisp() {
    const q = this.busquedaUsuario.toLowerCase();
    this.filtradosDisp.set(
      q ? this.usuariosDisponibles().filter(u => u.nombre_completo.toLowerCase().includes(q) || u.usuario.toLowerCase().includes(q))
        : [...this.usuariosDisponibles()]
    );
  }

  agregar(usuario: string) {
    const g = this.grupo();
    if (!g) return;
    this.svc.agregarMiembro(g.GroupID, usuario).subscribe({
      next: () => { this.successMsg.set('Usuario agregado'); this.cargar(g.GroupID); setTimeout(() => this.successMsg.set(''), 2500); },
      error: (e) => this.error.set(e.message),
    });
  }

  quitar(usuario: string) {
    const g = this.grupo();
    if (!g || !confirm(`¿Quitar a ${usuario} del grupo?`)) return;
    this.svc.quitarMiembro(g.GroupID, usuario).subscribe({
      next: () => { this.successMsg.set('Usuario removido'); this.cargar(g.GroupID); setTimeout(() => this.successMsg.set(''), 2500); },
      error: (e) => this.error.set(e.message),
    });
  }

  togglePerm(tabla: string, perm: string) {
    const set = this.derechosLocal[tabla] || new Set();
    set.has(perm) ? set.delete(perm) : set.add(perm);
    this.derechosLocal[tabla] = set;
  }

  hasPerm(tabla: string, perm: string): boolean {
    return this.derechosLocal[tabla]?.has(perm) ?? false;
  }

  guardarDerechos() {
    const g = this.grupo();
    if (!g || this.savingDerechos()) return;
    this.savingDerechos.set(true);
    const derechos = Object.entries(this.derechosLocal).map(([tableName, set]) => ({
      tableName,
      accessMask: ['A', 'D', 'E', 'S'].filter(p => set.has(p)).join(''),
    }));
    this.svc.actualizarDerechos(g.GroupID, derechos).subscribe({
      next: (r) => { this.successMsg.set(r.message); this.savingDerechos.set(false); setTimeout(() => this.successMsg.set(''), 3000); },
      error: (e) => { this.error.set(e.message); this.savingDerechos.set(false); },
    });
  }

  esSuperAdmin(): boolean {
    return this.grupo()?.GroupID === -1;
  }
}
