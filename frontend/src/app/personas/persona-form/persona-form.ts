import {
  Component, OnInit, OnDestroy, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';
import { PersonasService, PersonaDetalle, RegistroCrecimiento } from '../personas.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { confirmar } from '../../shared/confirmar.util';
import { AuthService } from '../../core/services/auth.service';

function hoyLocal(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

type Tab = 'personales' | 'contacto' | 'eclesiastico' | 'direcciones' | 'laboral' | 'grupos' | 'crecimiento';
interface ChipItem { id: number; nombre: string; }

@Component({
  selector: 'app-persona-form',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './persona-form.html',
  styleUrl: './persona-form.scss',
})
export class PersonaFormComponent implements OnInit, OnDestroy {
  tabActivo  = signal<Tab>('personales');
  esEdicion  = false;
  idpersonas = 0;
  guardando  = signal(false);
  cargando   = signal(false);
  error      = signal('');
  exito      = signal('');

  // Catálogos
  nacionalidades: any[] = [];
  departamentos:  any[] = [];
  municipiosNac:  any[] = [];
  municipiosDom:  any[] = [];
  iglesias:       any[] = [];
  profesiones:    any[] = [];
  tiposDocumento: any[] = [];
  grupos:         any[] = [];
  catExpMin: ChipItem[] = [];
  catExpLab: ChipItem[] = [];

  // Chips multi-select
  expMinSelec:     ChipItem[] = [];
  expMinQuery = '';
  expMinSugest:    ChipItem[] = [];
  expMinFocused = false;

  areasServSelec:  ChipItem[] = [];
  areasServQuery = '';
  areasServSugest: ChipItem[] = [];
  areasServFocused = false;

  expLabSelec:     ChipItem[] = [];
  expLabQuery = '';
  expLabSugest:    ChipItem[] = [];
  expLabFocused = false;

  // Grupos
  gruposPersona: { idgrupos: number; idgrupos_personas: number; grupo: string }[] = [];

  // Crecimiento
  registrosCrecimiento = signal<RegistroCrecimiento[]>([]);
  cargandoCrecimiento  = signal(false);
  estadosCrecimiento:  { id: number; nombre: string }[] = [];
  nuevoCrecimiento = { fecha: hoyLocal(), comentario: '', crecimiento: 0 };
  guardandoCrecimiento = signal(false);

  // Foto — todas como signals para que Angular detecte cambios desde callbacks async
  fotoBase64  = signal<string | null>(null);
  fotoPreview = signal<string | null>(null);
  fotoNombre  = signal('');
  fotoStatus  = signal<''|'cargando'|'lista'|'error'>('');

  // Mapa Leaflet
  private leafletMap:    L.Map    | null = null;
  private leafletMarker: L.Marker | null = null;

  readonly ESTADOS_CIVIL      = ['Solter@','Casad@','Viud@','Unid@','Divorciad@'];
  readonly ESTADOS_ASISTENCIA = ['Activo','Inactivo','Visitante','Retirado','Trasladado'];

  readonly TODAS_TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'personales',   label: 'Personales',   icon: '👤' },
    { key: 'contacto',     label: 'Contacto',     icon: '📞' },
    { key: 'eclesiastico', label: 'Eclesiástico', icon: '⛪' },
    { key: 'direcciones',  label: 'Direcciones',  icon: '📍' },
    { key: 'laboral',      label: 'Laboral',      icon: '💼' },
    { key: 'grupos',       label: 'Grupos',       icon: '👥' },
    { key: 'crecimiento',  label: 'Crecimiento',  icon: '🌱' },
  ];

  // En modo perfil se oculta la tab Crecimiento (solo la gestionan los líderes)
  get TABS() {
    return this.modoPerfil
      ? this.TODAS_TABS.filter(t => t.key !== 'crecimiento')
      : this.TODAS_TABS;
  }

  modelo: Partial<PersonaDetalle> = { sexo: 'M', estado_civil: 'Solter@' };

  // Modo Mi Perfil (asistente)
  modoPerfil = false;

  readonly GUIA_TABS: Record<string, string> = {
    personales:   '👤 Completa tus nombres, apellidos, fecha de nacimiento, sexo y estado civil. Agrega también tu foto de perfil.',
    contacto:     '📞 Ingresa tu teléfono, celular y correo electrónico para que puedan contactarte. Puedes añadir redes sociales.',
    eclesiastico: '⛪ Registra tu historial en la iglesia: fecha de asistencia, conversión y bautizo. Indica en qué áreas te gustaría servir.',
    direcciones:  '📍 Indica tu lugar de nacimiento y domicilio actual. Usa el GPS o escribe las coordenadas para marcar tu ubicación en el mapa.',
    laboral:      '💼 Registra tu profesión, lugar de trabajo y experiencia laboral para conocer mejor tus habilidades.',
    grupos:       '👥 Selecciona los grupos de la congregación a los que asistes o perteneces.',
    crecimiento:  '🌱 Este módulo es gestionado por los líderes para registrar tu proceso de crecimiento espiritual.',
  };

  constructor(
    private svc: PersonasService,
    private catalogoSvc: CatalogosService,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    this.cargarCatalogos();
    // modoPerfil desde route data (ruta /mi-perfil) o query param legacy
    this.modoPerfil = this.route.snapshot.data['modoPerfil'] === true
      || this.route.snapshot.queryParamMap.get('modo') === 'perfil';

    if (this.modoPerfil) {
      this.esEdicion = true;
      this.cargando.set(true);
      this.auth.getMiPerfilPersona().subscribe({
        next: (p: any) => {
          this.idpersonas = p.idpersonas;
          this.modelo = { ...p };
          this.normalizarFechas(this.modelo);
          this.gruposPersona = (p.grupos || []).map((g: any) => ({
            idgrupos: g.idgrupos, idgrupos_personas: g.idgrupos_personas, grupo: g.grupo,
          }));
          if (p.foto) this.fotoPreview.set(this.svc.fotoUrl(p.foto));
          if (this.modelo.iddepartamentos_nacimiento) this.onDeptNacChange();
          if (this.modelo.iddepartamentos_domicilio)  this.onDeptDomChange();
          this.resolverChips();
          this.cargando.set(false);
        },
        error: (err: any) => { this.error.set(err.message || 'Error al cargar tu perfil'); this.cargando.set(false); },
      });
    } else {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) { this.esEdicion = true; this.idpersonas = +id; this.cargarPersona(); }
    }
  }

  siguienteTab() {
    const tabKeys = this.TABS.map(t => t.key);
    const idx = tabKeys.indexOf(this.tabActivo());
    if (idx < tabKeys.length - 1) this.tabActivo.set(tabKeys[idx + 1]);
  }

  tabActualIndex(): number { return this.TABS.findIndex(t => t.key === this.tabActivo()); }

  // ── Tabs ─────────────────────────────────────────────────────
  cambiarTab(tab: Tab) {
    if (this.tabActivo() === 'direcciones' && tab !== 'direcciones') {
      this.leafletMap?.remove();
      this.leafletMap    = null;
      this.leafletMarker = null;
    }
    this.tabActivo.set(tab);
    if (tab === 'direcciones') {
      setTimeout(() => this.initMapa(), 0);
    }
  }

  ngOnDestroy() {
    this.leafletMap?.remove();
  }

  // ── Mapa Leaflet ──────────────────────────────────────────────
  private mapaIcono(): L.Icon {
    return L.icon({
      iconUrl:       'assets/leaflet/marker-icon.png',
      iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
      shadowUrl:     'assets/leaflet/marker-shadow.png',
      iconSize:    [25, 41],
      iconAnchor:  [12, 41],
      popupAnchor: [1, -34],
      shadowSize:  [41, 41],
    });
  }

  private initMapa() {
    const el = document.getElementById('mapa-leaflet');
    if (!el || this.leafletMap) return;

    const tieneCoords = !!(this.modelo.latitud && this.modelo.longitud);
    const lat  = tieneCoords ? +this.modelo.latitud! : 14.6349;
    const lng  = tieneCoords ? +this.modelo.longitud! : -90.5069;
    const zoom = tieneCoords ? 15 : 8;

    this.leafletMap = L.map(el, { fadeAnimation: false }).setView([lat, lng], zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.leafletMap);

    // Recalcula dimensiones después de que el DOM termine de pintar el tab
    setTimeout(() => this.leafletMap?.invalidateSize(), 100);

    if (tieneCoords) {
      this.leafletMarker = L.marker([lat, lng], { icon: this.mapaIcono(), draggable: true })
        .addTo(this.leafletMap);
      this.leafletMarker.on('dragend', () => {
        const pos = this.leafletMarker!.getLatLng();
        this.modelo.latitud  = pos.lat.toFixed(7);
        this.modelo.longitud = pos.lng.toFixed(7);
      });
    }

    this.leafletMap.on('click', (e: L.LeafletMouseEvent) => {
      this.modelo.latitud  = e.latlng.lat.toFixed(7);
      this.modelo.longitud = e.latlng.lng.toFixed(7);
      this.actualizarMarcador(e.latlng.lat, e.latlng.lng);
    });
  }

  private actualizarMarcador(lat: number, lng: number) {
    if (!this.leafletMap) return;
    if (this.leafletMarker) {
      this.leafletMarker.setLatLng([lat, lng]);
    } else {
      this.leafletMarker = L.marker([lat, lng], { icon: this.mapaIcono(), draggable: true })
        .addTo(this.leafletMap);
      this.leafletMarker.on('dragend', () => {
        const pos = this.leafletMarker!.getLatLng();
        this.modelo.latitud  = pos.lat.toFixed(7);
        this.modelo.longitud = pos.lng.toFixed(7);
      });
    }
    this.leafletMap.setView([lat, lng], 15);
  }

  mapaExternoUrl(): string {
    if (!this.modelo.latitud || !this.modelo.longitud) return '#';
    return `https://www.openstreetmap.org/?mlat=${this.modelo.latitud}&mlon=${this.modelo.longitud}&zoom=17`;
  }

  onCoordenadaChange() {
    if (this.modelo.latitud && this.modelo.longitud) {
      this.actualizarMarcador(+this.modelo.latitud, +this.modelo.longitud);
    }
  }

  usarGPS() {
    if (!navigator.geolocation) { this.error.set('Geolocalización no disponible'); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lng } }) => {
        this.modelo.latitud  = lat.toFixed(7);
        this.modelo.longitud = lng.toFixed(7);
        this.actualizarMarcador(lat, lng);
      },
      () => this.error.set('No se pudo obtener la ubicación GPS')
    );
  }

  // ── Catálogos ────────────────────────────────────────────────
  cargarCatalogos() {
    this.catalogoSvc.lookup('nacionalidades').subscribe({ next: d => this.nacionalidades = d });
    this.catalogoSvc.lookup('departamentos').subscribe({ next: d => this.departamentos = d });
    this.catalogoSvc.lookup('iglesias').subscribe({ next: d => this.iglesias = d });
    this.catalogoSvc.lookup('profesiones').subscribe({ next: d => this.profesiones = d });
    this.catalogoSvc.lookup('grupos').subscribe({ next: d => this.grupos = d });
    this.http.get<any[]>('/api/catalogos/tipos_documento').subscribe({ next: d => this.tiposDocumento = d });
    this.catalogoSvc.lookup('experiencia-ministerial').subscribe({
      next: (d: any[]) => { this.catExpMin = d.map(x => ({ id: x.id, nombre: x.nombre })); this.resolverChips(); },
    });
    this.catalogoSvc.lookup('experiencia-laboral').subscribe({
      next: (d: any[]) => { this.catExpLab = d.map(x => ({ id: x.id, nombre: x.nombre })); this.resolverChips(); },
    });
    this.catalogoSvc.lookup('estados-crecimiento').subscribe({
      next: (d: any[]) => { this.estadosCrecimiento = d.map(x => ({ id: x.id, nombre: x.nombre })); },
    });
  }

  onDeptNacChange() {
    this.modelo.idmunicipios_nacimiento = undefined as any;
    if (!this.modelo.iddepartamentos_nacimiento) { this.municipiosNac = []; return; }
    this.http.get<any[]>(`/api/catalogos/lookup/municipios?dept=${this.modelo.iddepartamentos_nacimiento}`)
      .subscribe({ next: d => this.municipiosNac = d });
  }

  onDeptDomChange() {
    this.modelo.idmunicipios_domicilio = undefined as any;
    if (!this.modelo.iddepartamentos_domicilio) { this.municipiosDom = []; return; }
    this.http.get<any[]>(`/api/catalogos/lookup/municipios?dept=${this.modelo.iddepartamentos_domicilio}`)
      .subscribe({ next: d => this.municipiosDom = d });
  }

  // ── Foto — base64 como signal para detectar cambios async ────
  onFotoSeleccionada(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { this.error.set('La imagen no debe superar 5 MB'); return; }

    this.fotoNombre.set(file.name);
    this.fotoStatus.set('cargando');
    this.fotoPreview.set(null);
    this.fotoBase64.set(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      this.fotoBase64.set(result);
      this.fotoPreview.set(result);
      this.fotoStatus.set('lista');
    };
    reader.onerror = () => {
      this.fotoStatus.set('error');
      this.error.set('No se pudo leer la imagen');
    };
    reader.readAsDataURL(file);
  }

  quitarFoto() {
    this.fotoBase64.set(null);
    this.fotoPreview.set(null);
    this.fotoNombre.set('');
    this.fotoStatus.set('');
  }

  // ── Chips helpers ─────────────────────────────────────────────
  private idsFromCsv(csv: string): number[] {
    return csv.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
  }
  private idsToCsv(ids: number[]): string { return ids.join(','); }

  private resolverChips() {
    const exp = (this.modelo as any)['experiencia_ministerial'];
    const areas = (this.modelo as any)['areas_servir'];
    const lab = (this.modelo as any)['experiencia_laboral'];
    if (exp && this.catExpMin.length) {
      this.expMinSelec = this.idsFromCsv(exp).map(id => this.catExpMin.find(x => x.id === id)!).filter(Boolean);
    }
    if (areas && this.catExpMin.length) {
      this.areasServSelec = this.idsFromCsv(areas).map(id => this.catExpMin.find(x => x.id === id)!).filter(Boolean);
    }
    if (lab && this.catExpLab.length) {
      this.expLabSelec = this.idsFromCsv(lab).map(id => this.catExpLab.find(x => x.id === id)!).filter(Boolean);
    }
  }

  private filtrarCat(cat: ChipItem[], selec: ChipItem[], q: string): ChipItem[] {
    const ids = selec.map(x => x.id);
    return cat.filter(e => !ids.includes(e.id) && (!q || e.nombre.toLowerCase().includes(q.toLowerCase())));
  }

  // Exp Ministerial
  onExpMinFocus()  { this.expMinFocused = true;  this.expMinSugest = this.filtrarCat(this.catExpMin, this.expMinSelec, this.expMinQuery); }
  onExpMinBlur()   { setTimeout(() => { this.expMinFocused = false; this.expMinSugest = []; }, 200); }
  buscarExpMin(q: string) { this.expMinSugest = this.filtrarCat(this.catExpMin, this.expMinSelec, q); }
  agregarExpMin(item: ChipItem) { if (!this.expMinSelec.find(x => x.id===item.id)) this.expMinSelec=[...this.expMinSelec,item]; this.expMinQuery=''; this.expMinSugest=[]; }
  quitarExpMin(id: number) { this.expMinSelec = this.expMinSelec.filter(x => x.id!==id); }

  // Areas Servir
  onAreasServFocus()  { this.areasServFocused = true;  this.areasServSugest = this.filtrarCat(this.catExpMin, this.areasServSelec, this.areasServQuery); }
  onAreasServBlur()   { setTimeout(() => { this.areasServFocused = false; this.areasServSugest = []; }, 200); }
  buscarAreasServ(q: string) { this.areasServSugest = this.filtrarCat(this.catExpMin, this.areasServSelec, q); }
  agregarAreaServ(item: ChipItem) { if (!this.areasServSelec.find(x => x.id===item.id)) this.areasServSelec=[...this.areasServSelec,item]; this.areasServQuery=''; this.areasServSugest=[]; }
  quitarAreaServ(id: number) { this.areasServSelec = this.areasServSelec.filter(x => x.id!==id); }

  // Exp Laboral
  onExpLabFocus()  { this.expLabFocused = true;  this.expLabSugest = this.filtrarCat(this.catExpLab, this.expLabSelec, this.expLabQuery); }
  onExpLabBlur()   { setTimeout(() => { this.expLabFocused = false; this.expLabSugest = []; }, 200); }
  buscarExpLab(q: string) { this.expLabSugest = this.filtrarCat(this.catExpLab, this.expLabSelec, q); }
  agregarExpLab(item: ChipItem) { if (!this.expLabSelec.find(x => x.id===item.id)) this.expLabSelec=[...this.expLabSelec,item]; this.expLabQuery=''; this.expLabSugest=[]; }
  quitarExpLab(id: number) { this.expLabSelec = this.expLabSelec.filter(x => x.id!==id); }

  // ── Grupos ───────────────────────────────────────────────────
  grupoYaAsignado(id: number): boolean { return this.gruposPersona.some(g => g.idgrupos===id); }
  agregarGrupo(idgrupos: number) {
    if (!idgrupos || this.grupoYaAsignado(idgrupos)) return;
    const nombre = this.grupos.find(g => g.id===idgrupos)?.nombre || '';
    this.gruposPersona = [...this.gruposPersona, { idgrupos, idgrupos_personas:0, grupo:nombre }];
  }
  quitarGrupo(idgrupos: number) { this.gruposPersona = this.gruposPersona.filter(g => g.idgrupos!==idgrupos); }

  private toDateStr(val: any): string {
    if (!val) return '';
    const s = val instanceof Date ? val.toISOString() : String(val);
    return s.substring(0, 10);
  }

  private normalizarFechas(m: any) {
    for (const f of ['fechanacimiento','fecha_inicio_asistencia','fechaconversion','fechabautiso']) {
      if (m[f]) m[f] = this.toDateStr(m[f]);
    }
  }

  // ── Cargar persona ───────────────────────────────────────────
  cargarPersona() {
    this.cargando.set(true);
    this.svc.obtener(this.idpersonas).subscribe({
      next: (p) => {
        this.modelo = { ...p };
        this.normalizarFechas(this.modelo);
        this.gruposPersona = (p.grupos||[]).map(g => ({ idgrupos:g.idgrupos, idgrupos_personas:g.idgrupos_personas, grupo:g.grupo }));
        if (p.foto) this.fotoPreview.set(this.svc.fotoUrl(p.foto));
        if (this.modelo.iddepartamentos_nacimiento) this.onDeptNacChange();
        if (this.modelo.iddepartamentos_domicilio)  this.onDeptDomChange();
        this.resolverChips();
        this.cargando.set(false);
        this.cargarCrecimiento();
      },
      error: (err) => { this.error.set(err.message || 'Error al cargar persona'); this.cargando.set(false); },
    });
  }

  // ── Crecimiento ──────────────────────────────────────────────
  cargarCrecimiento() {
    if (!this.esEdicion) return;
    this.cargandoCrecimiento.set(true);
    this.svc.listarCrecimiento(this.idpersonas).subscribe({
      next: (r) => { this.registrosCrecimiento.set(r); this.cargandoCrecimiento.set(false); },
      error: () => this.cargandoCrecimiento.set(false),
    });
  }

  agregarCrecimiento() {
    if (!this.nuevoCrecimiento.crecimiento) {
      this.error.set('Seleccione un estado de crecimiento'); return;
    }
    this.guardandoCrecimiento.set(true);
    this.svc.agregarCrecimiento(this.idpersonas, this.nuevoCrecimiento).subscribe({
      next: () => {
        this.guardandoCrecimiento.set(false);
        this.nuevoCrecimiento = { fecha: hoyLocal(), comentario: '', crecimiento: 0 };
        this.cargarCrecimiento();
      },
      error: (err) => { this.error.set(err.message || 'Error al agregar'); this.guardandoCrecimiento.set(false); },
    });
  }

  async eliminarCrecimiento(id: number) {
    if (!await confirmar('¿Eliminar este registro de crecimiento?', { peligro: true })) return;
    this.svc.eliminarCrecimiento(this.idpersonas, id).subscribe({
      next: () => this.cargarCrecimiento(),
      error: (err) => this.error.set(err.message || 'Error al eliminar'),
    });
  }

  // ── Guardar ──────────────────────────────────────────────────
  guardar() {
    this.error.set('');
    if (!this.modelo.primer_nombre?.trim() || !this.modelo.primer_apellido?.trim()) {
      this.error.set('Primer nombre y primer apellido son requeridos'); this.tabActivo.set('personales'); return;
    }
    if (!this.modelo.fechanacimiento) {
      this.error.set('Fecha de nacimiento es requerida'); this.tabActivo.set('personales'); return;
    }
    if (!this.esEdicion && !this.modoPerfil && this.gruposPersona.length === 0) {
      this.error.set('Debe asignar al menos un grupo a la persona'); this.tabActivo.set('grupos'); return;
    }

    this.guardando.set(true);

    // Construir payload JSON — igual que usuarios
    const payload: Record<string, any> = {
      primer_nombre: this.modelo.primer_nombre,
      segundo_nombre: this.modelo.segundo_nombre || null,
      primer_apellido: this.modelo.primer_apellido,
      segundo_apellido: this.modelo.segundo_apellido || null,
      apellidocasada: this.modelo.apellidocasada || null,
      fechanacimiento: this.modelo.fechanacimiento,
      lugarnacimiento: this.modelo.lugarnacimiento || null,
      idnacionalidades: this.modelo.idnacionalidades || null,
      sexo: this.modelo.sexo,
      estado_civil: this.modelo.estado_civil,
      idtipos_documento: this.modelo.idtipos_documento || null,
      nodocumento: this.modelo.nodocumento || null,
      telefono: this.modelo.telefono || null,
      celular: this.modelo.celular || null,
      email: this.modelo.email || null,
      perfil_social: this.modelo.perfil_social || null,
      fecha_inicio_asistencia: this.modelo.fecha_inicio_asistencia || null,
      fechaconversion: this.modelo.fechaconversion || null,
      fechabautiso: this.modelo.fechabautiso || null,
      idiglesias_bautizo: this.modelo.idiglesias_bautizo || null,
      idiglesias: this.modelo.idiglesias || null,
      estado_iglesia_anterior: this.modelo.estado_iglesia_anterior || null,
      iglesia_tiempo_anterior: this.modelo.iglesia_tiempo_anterior || null,
      iglesia_pastor_anterior: this.modelo.iglesia_pastor_anterior || null,
      experiencia_ministerial: this.idsToCsv(this.expMinSelec.map(x=>x.id)) || null,
      areas_servir: this.idsToCsv(this.areasServSelec.map(x=>x.id)) || null,
      maestro_escuela_dominical: this.modelo.maestro_escuela_dominical || null,
      motivo_ministerio: this.modelo.motivo_ministerio || null,
      iddepartamentos_nacimiento: this.modelo.iddepartamentos_nacimiento || null,
      idmunicipios_nacimiento: this.modelo.idmunicipios_nacimiento || null,
      iddepartamentos_domicilio: this.modelo.iddepartamentos_domicilio || null,
      idmunicipios_domicilio: this.modelo.idmunicipios_domicilio || null,
      zona_domicilio: this.modelo.zona_domicilio || null,
      direccion_domicilio: this.modelo.direccion_domicilio || null,
      longitud: this.modelo.longitud || null,
      latitud: this.modelo.latitud || null,
      idprofesiones: this.modelo.idprofesiones || null,
      lugartrabajo: this.modelo.lugartrabajo || null,
      direcciontrabajo: this.modelo.direcciontrabajo || null,
      puesto_trabajo: this.modelo.puesto_trabajo || null,
      experiencia_laboral: this.idsToCsv(this.expLabSelec.map(x=>x.id)) || null,
      grupos: this.gruposPersona.map(g => g.idgrupos),
    };

    // Foto: incluir solo si cambió
    if (this.fotoBase64()) {
      payload['foto'] = this.fotoBase64();   // nueva foto (base64)
    } else if (!this.fotoPreview() && this.esEdicion) {
      payload['foto'] = null;                // foto eliminada explícitamente
    }

    const op = this.modoPerfil
      ? this.auth.updateMiPerfilPersona(payload)
      : this.esEdicion ? this.svc.actualizar(this.idpersonas, payload) : this.svc.crear(payload);
    op.subscribe({
      next: () => {
        this.guardando.set(false);
        this.exito.set(this.modoPerfil ? 'Perfil actualizado correctamente' : this.esEdicion ? 'Persona actualizada correctamente' : 'Persona creada correctamente');
        setTimeout(() => this.router.navigate([this.modoPerfil ? '/dashboard' : '/personas']), 1200);
      },
      error: (err) => { this.guardando.set(false); this.error.set(err.message || 'Error al guardar'); },
    });
  }

  cancelar() { this.router.navigate([this.modoPerfil ? '/dashboard' : '/personas']); }

  toUpper(field: keyof PersonaDetalle, value: string) {
    (this.modelo as any)[field] = value.toUpperCase();
  }
}
