import { Component, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { CorreoService, CorreoResumen, CorreoDetalle } from './correo.service';
import Swal from 'sweetalert2';

@Component({
  selector:    'app-correo',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './correo.component.html',
  styleUrl:    './correo.component.scss',
})
export class CorreoComponent implements OnInit {
  @ViewChild('editorRef') editorRef?: ElementRef<HTMLDivElement>;

  // ── Estado general ──────────────────────────────────────────────
  configurado    = signal(false);
  cuentaGuardada = signal('');
  cargando       = signal(false);
  error          = signal('');

  // ── Bandeja ─────────────────────────────────────────────────────
  carpetaActual = signal('INBOX');
  carpetas      = signal<{ path: string; name: string }[]>([]);
  correos       = signal<CorreoResumen[]>([]);
  totalCorreos  = signal(0);
  paginaActual  = signal(1);
  readonly LIMITE = 20;

  // ── Lector ──────────────────────────────────────────────────────
  correoAbierto = signal<CorreoDetalle | null>(null);
  cargandoLeer  = signal(false);
  descargando   = signal<string>('');

  // ── Modales ─────────────────────────────────────────────────────
  componiendo  = signal(false);
  configurando = signal(false);

  // ── Formulario configuración ────────────────────────────────────
  cfgCuenta    = '';
  cfgPassword  = '';
  cfgGuardando = signal(false);
  cfgError     = signal('');

  // ── Formulario compose ──────────────────────────────────────────
  compPara      = '';
  compCC        = '';
  compCCVisible = false;
  compAsunto    = '';
  compAdjuntos: File[] = [];
  compEnviando  = signal(false);
  compError     = signal('');

  // ── Autocomplete contactos ───────────────────────────────────────
  contactosSug     = signal<{ nombre: string; email: string }[]>([]);
  mostrandoSug     = signal(false);
  sugCampo: 'para' | 'cc' = 'para';
  private sugTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private svc: CorreoService) {}

  ngOnInit() {
    this.svc.obtenerCredenciales().subscribe({
      next: r => {
        this.configurado.set(r.configurado);
        if (r.configurado) {
          this.cuentaGuardada.set(r.cuenta ?? '');
          this.cargarCarpetas();
          this.cargarBandeja();
        }
      },
    });
  }

  // ── Carga de datos ──────────────────────────────────────────────
  cargarCarpetas() {
    this.svc.listarCarpetas().subscribe({
      next: r => this.carpetas.set(r.carpetas),
    });
  }

  cargarBandeja(pagina = 1) {
    this.cargando.set(true);
    this.error.set('');
    this.correoAbierto.set(null);
    this.paginaActual.set(pagina);
    this.svc.listarBandeja(this.carpetaActual(), pagina, this.LIMITE).subscribe({
      next: r => {
        this.correos.set(r.correos);
        this.totalCorreos.set(r.total);
        this.cargando.set(false);
      },
      error: e => {
        this.error.set(e.error?.error || 'Error al cargar correos');
        this.cargando.set(false);
      },
    });
  }

  seleccionarCarpeta(path: string) {
    this.carpetaActual.set(path);
    this.cargarBandeja(1);
  }

  abrirCorreo(correo: CorreoResumen) {
    this.cargandoLeer.set(true);
    this.correoAbierto.set(null);
    this.svc.leerCorreo(correo.uid, this.carpetaActual()).subscribe({
      next: detalle => {
        this.correoAbierto.set(detalle);
        this.cargandoLeer.set(false);
        this.correos.update(list =>
          list.map(c => c.uid === correo.uid ? { ...c, leido: true } : c)
        );
        if (!correo.leido && this.svc.noLeidos() > 0) {
          this.svc.noLeidos.update(n => n - 1);
        }
      },
      error: () => {
        this.cargandoLeer.set(false);
        this.error.set('No se pudo cargar el correo.');
      },
    });
  }

  cerrarLector() { this.correoAbierto.set(null); }

  // ── Paginación ──────────────────────────────────────────────────
  get totalPaginas() { return Math.ceil(this.totalCorreos() / this.LIMITE); }
  paginaAnterior()   { if (this.paginaActual() > 1) this.cargarBandeja(this.paginaActual() - 1); }
  paginaSiguiente()  { if (this.paginaActual() < this.totalPaginas) this.cargarBandeja(this.paginaActual() + 1); }

  // ── Eliminar ────────────────────────────────────────────────────
  async eliminar(correo: CorreoResumen) {
    const conf = await Swal.fire({
      title:              '¿Eliminar correo?',
      text:               correo.asunto,
      icon:               'warning',
      showCancelButton:   true,
      confirmButtonText:  'Eliminar',
      cancelButtonText:   'Cancelar',
      confirmButtonColor: '#e53935',
    });
    if (!conf.isConfirmed) return;

    this.svc.eliminarCorreo(correo.uid, this.carpetaActual()).subscribe({
      next: () => {
        if (this.correoAbierto()?.uid === correo.uid) this.correoAbierto.set(null);
        this.cargarBandeja(this.paginaActual());
        if (!correo.leido && this.svc.noLeidos() > 0) {
          this.svc.noLeidos.update(n => n - 1);
        }
      },
      error: () => Swal.fire('Error', 'No se pudo eliminar el correo.', 'error'),
    });
  }

  // ── Compose ─────────────────────────────────────────────────────
  abrirCompose(para = '') {
    this.compPara      = para;
    this.compCC        = '';
    this.compCCVisible = false;
    this.compAsunto    = '';
    this.compAdjuntos  = [];
    this.compError.set('');
    this.componiendo.set(true);
    setTimeout(() => {
      if (this.editorRef) this.editorRef.nativeElement.innerHTML = '';
      this.editorRef?.nativeElement.focus();
    }, 60);
  }

  cerrarCompose() { this.componiendo.set(false); }

  toggleCC() {
    this.compCCVisible = !this.compCCVisible;
    if (!this.compCCVisible) this.compCC = '';
  }

  responder() {
    const c = this.correoAbierto();
    if (!c) return;
    this.compPara      = c.de;
    this.compCC        = '';
    this.compCCVisible = false;
    this.compAsunto    = c.asunto.startsWith('Re:') ? c.asunto : 'Re: ' + c.asunto;
    this.compAdjuntos  = [];
    this.compError.set('');
    this.componiendo.set(true);

    const quoted = c.html || (c.texto?.replace(/\n/g, '<br>') ?? '');
    const fechaStr = new Date(c.fecha).toLocaleString('es-GT', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    setTimeout(() => {
      if (this.editorRef) {
        this.editorRef.nativeElement.innerHTML =
          `<br><br><div class="quoted-mail" style="border-left:3px solid #ccc;padding-left:12px;color:#666;margin-top:8px"><small>El ${fechaStr}, <strong>${c.deNombre || c.de}</strong> escribió:</small><br><br>${quoted}</div>`;
        // Colocar cursor al inicio
        const range = document.createRange();
        const sel   = window.getSelection();
        range.setStart(this.editorRef.nativeElement, 0);
        range.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(range);
        this.editorRef.nativeElement.focus();
      }
    }, 60);
  }

  // ── Editor HTML ─────────────────────────────────────────────────
  execCmd(cmd: string, value?: string) {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    document.execCommand(cmd, false, value ?? undefined);
    this.editorRef?.nativeElement.focus();
  }

  execLink() {
    const url = prompt('URL del enlace:');
    if (url) this.execCmd('createLink', url);
  }

  execFontSize(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    if (val) {
      this.execCmd('fontSize', val);
      (event.target as HTMLSelectElement).value = '';
    }
  }

  // ── Adjuntos compose ─────────────────────────────────────────────
  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    this.compAdjuntos = [...this.compAdjuntos, ...Array.from(input.files)];
    input.value = '';
  }

  quitarAdjunto(idx: number) {
    this.compAdjuntos = this.compAdjuntos.filter((_, i) => i !== idx);
  }

  // ── Enviar ──────────────────────────────────────────────────────
  enviar() {
    const html  = this.editorRef?.nativeElement.innerHTML.trim() ?? '';
    const vacio = !html || html === '<br>' || html === '<div><br></div>' || html === '<p><br></p>';
    if (!this.compPara || !this.compAsunto || vacio) {
      this.compError.set('Completa Para, Asunto y Mensaje.');
      return;
    }
    this.compEnviando.set(true);
    this.compError.set('');
    this.svc.enviarCorreo(
      this.compPara, this.compAsunto, html, true,
      this.compCC || undefined, this.compAdjuntos,
    ).subscribe({
      next: () => {
        this.compEnviando.set(false);
        this.componiendo.set(false);
        Swal.fire({ icon: 'success', title: 'Enviado', text: 'Correo enviado correctamente.', timer: 2000, showConfirmButton: false });
      },
      error: e => {
        this.compEnviando.set(false);
        this.compError.set(e.error?.error || 'Error al enviar el correo.');
      },
    });
  }

  // ── Descarga de adjuntos ─────────────────────────────────────────
  descargarAdjunto(a: { filename: string; contentType: string; size: number }) {
    if (this.descargando()) return;
    this.descargando.set(a.filename);
    const correo = this.correoAbierto()!;
    this.svc.descargarAdjunto(correo.uid, a.filename, this.carpetaActual()).subscribe({
      next: blob => {
        this.descargando.set('');
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = a.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.descargando.set('');
        Swal.fire('Error', 'No se pudo descargar el adjunto.', 'error');
      },
    });
  }

  // ── Configuración ───────────────────────────────────────────────
  abrirConfig() {
    this.cfgCuenta   = this.cuentaGuardada();
    this.cfgPassword = '';
    this.cfgError.set('');
    this.configurando.set(true);
  }

  cerrarConfig() { this.configurando.set(false); }

  guardarConfig() {
    if (!this.cfgCuenta || !this.cfgPassword) {
      this.cfgError.set('Ingresa la cuenta y contraseña.');
      return;
    }
    this.cfgGuardando.set(true);
    this.cfgError.set('');
    this.svc.guardarCredenciales(this.cfgCuenta, this.cfgPassword).subscribe({
      next: () => {
        this.cfgGuardando.set(false);
        this.configurando.set(false);
        this.configurado.set(true);
        this.cuentaGuardada.set(this.cfgCuenta);
        this.cargarCarpetas();
        this.cargarBandeja(1);
        this.svc.cargarNoLeidos().subscribe();
      },
      error: e => {
        this.cfgGuardando.set(false);
        this.cfgError.set(e.error?.error || 'No se pudo guardar la configuración.');
      },
    });
  }

  async desconectar() {
    const conf = await Swal.fire({
      title:              '¿Desconectar cuenta?',
      text:               'Se eliminarán las credenciales guardadas.',
      icon:               'warning',
      showCancelButton:   true,
      confirmButtonText:  'Desconectar',
      cancelButtonText:   'Cancelar',
      confirmButtonColor: '#e53935',
    });
    if (!conf.isConfirmed) return;
    this.svc.eliminarCredenciales().subscribe({
      next: () => {
        this.configurado.set(false);
        this.correos.set([]);
        this.correoAbierto.set(null);
        this.cuentaGuardada.set('');
        this.svc.noLeidos.set(0);
        this.svc.configurado.set(false);
      },
    });
  }

  // ── Autocomplete ────────────────────────────────────────────────
  onParaInput(event: Event) {
    this.sugCampo = 'para';
    this._buscarSugerencias((event.target as HTMLInputElement).value);
  }

  onCCInput(event: Event) {
    this.sugCampo = 'cc';
    this._buscarSugerencias((event.target as HTMLInputElement).value);
  }

  private _buscarSugerencias(valor: string) {
    const tokens = valor.split(',');
    const q = tokens[tokens.length - 1].trim();
    if (this.sugTimer) clearTimeout(this.sugTimer);
    if (!q) { this.mostrandoSug.set(false); this.contactosSug.set([]); return; }
    this.sugTimer = setTimeout(() => {
      this.svc.buscarContactos(q).subscribe({
        next: r => {
          this.contactosSug.set(r.contactos);
          this.mostrandoSug.set(r.contactos.length > 0);
        },
      });
    }, 250);
  }

  seleccionarContacto(c: { nombre: string; email: string }) {
    const entrada = `${c.nombre} <${c.email}>`;
    if (this.sugCampo === 'para') {
      const partes = this.compPara.split(',');
      partes[partes.length - 1] = ' ' + entrada;
      this.compPara = partes.join(',').replace(/^,\s*/, '') + ', ';
    } else {
      const partes = this.compCC.split(',');
      partes[partes.length - 1] = ' ' + entrada;
      this.compCC = partes.join(',').replace(/^,\s*/, '') + ', ';
    }
    this.mostrandoSug.set(false);
    this.contactosSug.set([]);
  }

  cerrarSugerencias() {
    setTimeout(() => this.mostrandoSug.set(false), 150);
  }

  // ── Helpers ─────────────────────────────────────────────────────
  formatFecha(f: string): string {
    const d   = new Date(f);
    const hoy = new Date();
    if (d.toDateString() === hoy.toDateString())
      return d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('es-GT', { day: '2-digit', month: 'short' });
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  nombreCarpeta(path: string): string {
    const p = path.toUpperCase();
    if (p === 'INBOX')                                           return 'Bandeja de entrada';
    if (p.includes('SENT') || p.includes('ENVIADO'))            return 'Enviados';
    if (p.includes('DRAFT') || p.includes('BORRADOR'))          return 'Borradores';
    if (p.includes('TRASH') || p.includes('DELETED') || p.includes('PAPELERA')) return 'Papelera';
    if (p.includes('JUNK') || p.includes('SPAM'))               return 'Spam';
    if (p.includes('ARCHIVE') || p.includes('ARCHIV'))          return 'Archivo';
    return path.replace(/^INBOX\./i, '');
  }

  iconoCarpeta(path: string): string {
    const p = path.toUpperCase();
    if (p === 'INBOX')                                           return '📥';
    if (p.includes('SENT') || p.includes('ENVIADO'))            return '📤';
    if (p.includes('DRAFT') || p.includes('BORRADOR'))          return '📝';
    if (p.includes('TRASH') || p.includes('DELETED') || p.includes('PAPELERA')) return '🗑️';
    if (p.includes('JUNK') || p.includes('SPAM'))               return '🚫';
    if (p.includes('ARCHIVE') || p.includes('ARCHIV'))          return '📦';
    return '📁';
  }
}
