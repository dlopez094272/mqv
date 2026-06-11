import {
  Component, Input, Output, EventEmitter,
  AfterViewInit, OnDestroy, ViewChild, ElementRef, signal, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ActividadesService, AsistenciaPersona } from './actividades.service';
import { FaceRecognitionService } from './face-recognition.service';
import { InactividadService } from '../core/services/inactividad.service';

interface ReconocidoEnSesion {
  idpersonas:     number;
  nombre_completo: string;
}

@Component({
  selector:    'app-camara-asistencia',
  standalone:  true,
  imports:     [CommonModule],
  templateUrl: './camara-asistencia.component.html',
  styleUrl:    './camara-asistencia.component.scss',
})
export class CamaraAsistenciaComponent implements AfterViewInit, OnDestroy {
  @Input() idActividad!: number;
  @Input() personasAsistentes: AsistenciaPersona[] = [];
  @Output() asistenciaActualizada = new EventEmitter<void>();

  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private svc         = inject(ActividadesService);
  private faceSvc     = inject(FaceRecognitionService);
  private inactividad = inject(InactividadService);

  estado         = signal<'cargando' | 'enrollando' | 'activo' | 'error'>('cargando');
  mensajeEstado  = signal('Cargando modelos de reconocimiento facial...');
  progreso       = signal(0);
  totalProgreso  = signal(0);
  reconocidos    = signal<ReconocidoEnSesion[]>([]);

  private matcher: any = null;
  private stream: MediaStream | null = null;
  private loopTimeout: ReturnType<typeof setTimeout> | null = null;
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;
  private activo = false;
  private registradosIds = new Set<number>();

  async ngAfterViewInit() {
    await this.inicializar();
  }

  ngOnDestroy() {
    this.activo = false;
    if (this.loopTimeout) clearTimeout(this.loopTimeout);
    if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
    this.stream?.getTracks().forEach(t => t.stop());
  }

  private async inicializar() {
    try {
      // 1. Cargar modelos (lazy — se descargan la primera vez)
      await this.faceSvc.loadModels();

      // 2. Obtener personas con sus descriptores guardados
      this.estado.set('enrollando');
      this.mensajeEstado.set('Cargando base de datos de rostros...');
      const personas = await firstValueFrom(this.svc.obtenerDescriptoresFaciales());

      const conDescriptor: { idpersonas: number; descriptor: number[] }[] = [];
      const sinDescriptor = personas.filter(p => p.foto && !p.descriptor);

      // Personas que ya tienen descriptor guardado
      for (const p of personas.filter(p => p.descriptor)) {
        conDescriptor.push({ idpersonas: p.idpersonas, descriptor: p.descriptor! });
      }

      // 3. Generar descriptores faltantes a partir de fotos
      if (sinDescriptor.length) {
        this.totalProgreso.set(sinDescriptor.length);
        for (let i = 0; i < sinDescriptor.length; i++) {
          const persona = sinDescriptor[i];
          this.progreso.set(i + 1);
          this.mensajeEstado.set(
            `Procesando foto de ${persona.nombre} (${i + 1}/${sinDescriptor.length})...`
          );

          const url        = this.svc.urlFotoPersona(persona.foto!);
          const descriptor = await this.faceSvc.getDescriptorFromUrl(url);

          if (descriptor) {
            await firstValueFrom(
              this.svc.guardarDescriptorFacial(persona.idpersonas, Array.from(descriptor), persona.foto!)
            );
            conDescriptor.push({ idpersonas: persona.idpersonas, descriptor: Array.from(descriptor) });
          }
        }
      }

      if (!conDescriptor.length) {
        this.estado.set('error');
        this.mensajeEstado.set('No se detectó ningún rostro en las fotos del sistema.');
        return;
      }

      // 4. Construir matcher
      this.matcher = this.faceSvc.buildMatcher(conDescriptor);

      // 5. Iniciar cámara
      this.mensajeEstado.set('Iniciando cámara...');
      await this.iniciarCamara();

      // 6. Iniciar bucle de detección y keepalive de sesión
      this.estado.set('activo');
      this.mensajeEstado.set(`Cámara activa — ${conDescriptor.length} personas en base de datos`);
      this.activo = true;
      this.runLoop();
      // Registra actividad cada 30 s para que InactividadService no bloquee la sesión
      this.keepAliveInterval = setInterval(
        () => this.inactividad.registrarActividad(),
        30_000
      );

    } catch (err: any) {
      this.estado.set('error');
      this.mensajeEstado.set(err?.message || 'Error al inicializar reconocimiento facial.');
    }
  }

  private async iniciarCamara() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false,
    });
    const video = this.videoRef.nativeElement;
    video.srcObject = this.stream;
    await new Promise<void>(resolve => { video.onloadedmetadata = () => resolve(); });
    await video.play();
  }

  private runLoop() {
    if (!this.activo) return;
    this.detectarYRegistrar()
      .catch(() => {})
      .finally(() => {
        this.loopTimeout = setTimeout(() => this.runLoop(), 400);
      });
  }

  private async detectarYRegistrar() {
    const video  = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    if (!this.matcher || video.readyState < 2 || !video.videoWidth) return;

    const detecciones = await this.faceSvc.detectInVideo(video);

    // Ajustar canvas al tamaño real del video
    const dims = { width: video.videoWidth, height: video.videoHeight };
    this.faceSvc.matchDimensions(canvas, video);
    const redim = this.faceSvc.resizeResults(detecciones, dims);

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < redim.length; i++) {
      const det   = redim[i];
      const orig  = detecciones[i];
      const match = this.matcher.findBestMatch(orig.descriptor);
      const box   = det.detection.box;

      const hayCoincidencia = match.label !== 'unknown';
      ctx.strokeStyle = hayCoincidencia ? '#22c55e' : '#ef4444';
      ctx.lineWidth   = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      if (hayCoincidencia) {
        const idpersonas = parseInt(match.label, 10);
        const persona    = this.personasAsistentes.find(p => p.idpersonas === idpersonas);
        const nombre     = persona?.nombre_completo ?? `ID ${idpersonas}`;

        // Etiqueta sobre el recuadro
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(box.x, box.y - 22, Math.min(box.width, nombre.length * 7 + 8), 22);
        ctx.fillStyle = 'white';
        ctx.font      = 'bold 12px sans-serif';
        ctx.fillText(nombre.slice(0, 32), box.x + 4, box.y - 6);

        // Registrar asistencia si no fue hecho en esta sesión
        if (!this.registradosIds.has(idpersonas)) {
          const yaAsiste = this.personasAsistentes.some(p => p.idpersonas === idpersonas && p.asiste);

          if (!yaAsiste) {
            this.registradosIds.add(idpersonas);
            this.svc.agregarAsistente(this.idActividad, { idpersonas }).subscribe({
              next: () => {
                this.reconocidos.update(list => [
                  { idpersonas, nombre_completo: nombre },
                  ...list,
                ]);
                this.asistenciaActualizada.emit();
              },
              error: () => this.registradosIds.delete(idpersonas),
            });
          } else {
            // Ya asiste — lo marcamos para no volver a comprobar
            this.registradosIds.add(idpersonas);
          }
        }
      }
    }
  }
}
