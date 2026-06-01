import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { PersonasService, Cumpleanero } from '../personas.service';

type Vista = 'mes' | 'semana' | 'anio';

interface DiaCalendario {
  fecha: Date;
  esHoy: boolean;
  esMesActual: boolean;
  cumpleaneros: Cumpleanero[];
}

// Paleta de colores de la iglesia
const PURPLE      = '#57446C';
const PURPLE_LIGHT= '#836AA3';
const BLUE        = '#53819A';
const BLUE_LIGHT  = '#50B8D4';
const BLUE_LIGHTER= '#83D3EB';
const GREEN       = '#40996D';
const SIDEBAR_TOP = '#1d3a47';
const SIDEBAR_BOT = '#2d1f3e';

@Component({
  selector: 'app-cumpleaneros',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './cumpleaneros.html',
  styleUrl: './cumpleaneros.scss',
})
export class CumpleaneroesComponent implements OnInit {
  vista = signal<Vista>('mes');
  cargando = signal(false);
  error    = signal('');
  msgExito = signal('');

  mesActual  = new Date().getMonth() + 1;
  anioActual = new Date().getFullYear();
  cumpleaneros = signal<Cumpleanero[]>([]);

  // Modal tarjeta
  personaSelec: Cumpleanero | null = null;
  cardDataUrl  = signal<string | null>(null);
  cardCargando = signal(false);
  enviandoEmail= signal(false);
  msgWhatsapp  = signal('');

  readonly MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  readonly DIAS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

  constructor(private svc: PersonasService, private http: HttpClient) {}

  ngOnInit() { this.cargar(); }

  cargar() {
    this.cargando.set(true);
    this.svc.cumpleaneros(this.mesActual, this.anioActual).subscribe({
      next: (r) => { this.cumpleaneros.set(r.cumpleaneros); this.cargando.set(false); },
      error: (err) => { this.error.set(err.message || 'Error'); this.cargando.set(false); },
    });
  }

  mesAnterior()  { if (this.mesActual===1){this.mesActual=12;this.anioActual--;}else this.mesActual--; this.cargar(); }
  mesSiguiente() { if (this.mesActual===12){this.mesActual=1;this.anioActual++;}else this.mesActual++; this.cargar(); }
  irHoy() { this.mesActual=new Date().getMonth()+1; this.anioActual=new Date().getFullYear(); this.cargar(); }
  get nombreMes(): string { return this.MESES[this.mesActual-1]; }

  // ── Vista Mensual ─────────────────────────────────────────────
  get diasCalendario(): DiaCalendario[] {
    const hoy = new Date();
    const primerDia = new Date(this.anioActual, this.mesActual-1, 1);
    const ultimoDia = new Date(this.anioActual, this.mesActual, 0);
    const dias: DiaCalendario[] = [];
    for (let i=primerDia.getDay()-1; i>=0; i--)
      dias.push({ fecha:new Date(this.anioActual,this.mesActual-1,-i), esHoy:false, esMesActual:false, cumpleaneros:[] });
    for (let d=1; d<=ultimoDia.getDate(); d++) {
      const fecha = new Date(this.anioActual, this.mesActual-1, d);
      dias.push({ fecha, esHoy:fecha.toDateString()===hoy.toDateString(),
        esMesActual:true, cumpleaneros:this.cumpleaneros().filter(c=>c.dia_nac===d) });
    }
    for (let d=1; dias.length<42; d++)
      dias.push({ fecha:new Date(this.anioActual,this.mesActual,d), esHoy:false, esMesActual:false, cumpleaneros:[] });
    return dias;
  }

  // ── Vista Semanal ─────────────────────────────────────────────
  semanaOffset = 0;
  get diasSemana(): DiaCalendario[] {
    const hoy = new Date();
    const ini = new Date(hoy); ini.setDate(hoy.getDate()-hoy.getDay()+this.semanaOffset*7);
    return Array.from({length:7}, (_,i) => {
      const fecha = new Date(ini); fecha.setDate(ini.getDate()+i);
      return { fecha, esHoy:fecha.toDateString()===hoy.toDateString(), esMesActual:fecha.getMonth()+1===this.mesActual,
        cumpleaneros:this.cumpleaneros().filter(c=>c.dia_nac===fecha.getDate()&&c.mes_nac===fecha.getMonth()+1) };
    });
  }
  semanaAnterior()  { this.semanaOffset--; }
  semanaSiguiente() { this.semanaOffset++; }
  get rangoSemana(): string {
    const d=this.diasSemana;
    return `${d[0].fecha.getDate()} ${this.MESES[d[0].fecha.getMonth()]} – ${d[6].fecha.getDate()} ${this.MESES[d[6].fecha.getMonth()]} ${d[6].fecha.getFullYear()}`;
  }

  // ── Vista Anual ───────────────────────────────────────────────
  cumpleanerosByMes = computed(() =>
    Array.from({length:12},(_,i)=>({ mes:i+1, nombre:this.MESES[i], personas:this.cumpleaneros().filter(c=>c.mes_nac===i+1) }))
  );
  anioAnterior()  { this.anioActual--; this.cargar(); }
  anioSiguiente() { this.anioActual++; this.cargar(); }

  // ── Helpers ──────────────────────────────────────────────────
  fotoUrl(c: Cumpleanero): string { return this.svc.fotoUrl(c.foto); }
  cumpleHoy(c: Cumpleanero): boolean {
    const h=new Date(); return c.dia_nac===h.getDate()&&c.mes_nac===h.getMonth()+1;
  }

  // ── Tarjeta ───────────────────────────────────────────────────
  async abrirTarjeta(c: Cumpleanero) {
    this.personaSelec = c;
    this.cardDataUrl.set(null);
    this.msgWhatsapp.set('');
    this.cardCargando.set(true);
    try {
      this.cardDataUrl.set(await this.generarTarjeta(c));
    } catch {
      this.error.set('No se pudo generar la tarjeta');
    } finally {
      this.cardCargando.set(false);
    }
  }

  cerrarTarjeta() { this.personaSelec=null; this.cardDataUrl.set(null); this.msgWhatsapp.set(''); }

  // ── Canvas con paleta de la iglesia ───────────────────────────
  private async generarTarjeta(c: Cumpleanero): Promise<string> {
    const W=800, H=1350;
    const cv = document.createElement('canvas');
    cv.width=W; cv.height=H;
    const ctx = cv.getContext('2d')!;

    // --- Fondo: degradado suave lila/azul ---
    const bg = ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,'#f8f5ff'); bg.addColorStop(0.5,'#eef6fb'); bg.addColorStop(1,'#f0ffe8');
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

    // Círculos decorativos de fondo (marca de agua)
    const drawCircleBg = (x:number,y:number,r:number,color:string,alpha:number) => {
      ctx.save(); ctx.globalAlpha=alpha;
      ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
      ctx.restore();
    };
    drawCircleBg(80,  200, 90,  BLUE_LIGHT, .08);
    drawCircleBg(720, 300, 110, PURPLE_LIGHT,.07);
    drawCircleBg(100, 800, 80,  GREEN,       .06);
    drawCircleBg(700, 850, 100, BLUE,        .06);
    drawCircleBg(400, 1050,60,  PURPLE,      .05);

    // --- BANNER SUPERIOR ---
    const bannerH = 240;
    const bannerGrad = ctx.createLinearGradient(0,0,W,bannerH);
    bannerGrad.addColorStop(0, SIDEBAR_TOP);
    bannerGrad.addColorStop(1, SIDEBAR_BOT);
    ctx.fillStyle=bannerGrad; ctx.fillRect(0,0,W,bannerH);

    // Guirnalda triangular sobre el banner
    const flagColors = [BLUE_LIGHT, PURPLE_LIGHT, '#f57f17', BLUE_LIGHTER, '#f06292', GREEN];
    for (let i=0,x=0; x<W; i++,x+=40) {
      ctx.fillStyle = flagColors[i%flagColors.length];
      ctx.beginPath();
      ctx.moveTo(x,0); ctx.lineTo(x+20, i%2===0?42:-42); ctx.lineTo(x+40,0);
      ctx.closePath(); ctx.fill();
    }

    // Logo de la iglesia
    let logoH = 0;
    try {
      const logo = await this.loadImage('/logo.png');
      const lw=130, lh=Math.round(130*(logo.naturalHeight/logo.naturalWidth||1));
      // Dibujar logo en blanco (filtro visual)
      ctx.save();
      ctx.drawImage(logo, W/2-lw/2, 30, lw, lh);
      ctx.restore();
      logoH = lh;
    } catch { logoH = 0; }

    // Nombre de la iglesia en el banner
    const nameY = 30 + logoH + 14;
    ctx.fillStyle=BLUE_LIGHTER; ctx.font='bold 15px "Nunito",Arial'; ctx.textAlign='center';
    ctx.fillText('IGLESIA DEL NAZARENO', W/2, nameY);
    ctx.fillStyle='#A688BF'; ctx.font='bold 18px "Nunito",Arial';
    ctx.fillText('MÁS QUE VENCEDORES', W/2, nameY+22);

    // Línea decorativa debajo del banner
    const lineGrad = ctx.createLinearGradient(0,bannerH,W,bannerH);
    lineGrad.addColorStop(0,BLUE_LIGHT); lineGrad.addColorStop(.5,PURPLE_LIGHT); lineGrad.addColorStop(1,BLUE_LIGHT);
    ctx.strokeStyle=lineGrad; ctx.lineWidth=4;
    ctx.beginPath(); ctx.moveTo(0,bannerH); ctx.lineTo(W,bannerH); ctx.stroke();

    // --- "DESEA UN:" ---
    ctx.fillStyle='#9e9e9e'; ctx.font='bold 14px Arial'; ctx.letterSpacing='4px';
    ctx.fillText('DESEA UN:', W/2, bannerH+42); ctx.letterSpacing='0px';

    // --- "Felíz" en teal ---
    ctx.fillStyle=BLUE_LIGHT;
    ctx.font='italic bold 90px Georgia,"Times New Roman",serif';
    ctx.shadowColor='rgba(80,184,212,.25)'; ctx.shadowBlur=12;
    ctx.fillText('Felíz', W/2, bannerH+138);
    ctx.shadowBlur=0;

    // --- "Cumpleaños" en púrpura ---
    ctx.fillStyle=PURPLE;
    ctx.font='italic bold 72px Georgia,"Times New Roman",serif';
    ctx.shadowColor='rgba(87,68,108,.2)'; ctx.shadowBlur=10;
    ctx.fillText('Cumpleaños', W/2, bannerH+220);
    ctx.shadowBlur=0;

    // Separador decorativo
    const sepY = bannerH + 248;
    const deco = ctx.createLinearGradient(120,0,W-120,0);
    deco.addColorStop(0,'transparent'); deco.addColorStop(.3,BLUE_LIGHT);
    deco.addColorStop(.7,PURPLE_LIGHT); deco.addColorStop(1,'transparent');
    ctx.strokeStyle=deco; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(120,sepY); ctx.lineTo(W-120,sepY); ctx.stroke();

    // Diamante central en separador
    ctx.fillStyle=BLUE_LIGHT;
    ctx.save(); ctx.translate(W/2, sepY); ctx.rotate(Math.PI/4);
    ctx.fillRect(-5,-5,10,10); ctx.restore();

    // --- NOMBRE ---
    const partes = c.nombre_completo.split(' ');
    const primerNombre   = partes[0]||'';
    const primerApellido = partes[2]||partes[1]||'';
    const nameRowY = sepY + 56;

    ctx.font='bold 30px "Nunito",Arial'; ctx.fillStyle=PURPLE;
    // Primer nombre (izq)
    ctx.textAlign='center';
    ctx.fillText(primerNombre, W*0.27, nameRowY);
    ctx.strokeStyle=BLUE_LIGHT; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(60,nameRowY+8); ctx.lineTo(W*0.46,nameRowY+8); ctx.stroke();

    // Primer apellido (der)
    ctx.fillText(primerApellido, W*0.73, nameRowY);
    ctx.beginPath(); ctx.moveTo(W*0.54,nameRowY+8); ctx.lineTo(W-60,nameRowY+8); ctx.stroke();

    // --- GLOBOS DECORATIVOS ---
    const globos: [number,number,number,string][] = [
      [90,  nameRowY+130, 38, BLUE_LIGHT],
      [55,  nameRowY+80,  30, PURPLE_LIGHT],
      [130, nameRowY+155, 28, GREEN],
      [W-90, nameRowY+130,38, '#f06292'],
      [W-55, nameRowY+80, 30, BLUE_LIGHTER],
      [W-130,nameRowY+155,28, '#ffb74d'],
    ];
    for (const [gx,gy,gr,gc] of globos) {
      // Globo
      ctx.fillStyle=gc; ctx.beginPath(); ctx.ellipse(gx,gy,gr,gr*1.2,0,0,Math.PI*2); ctx.fill();
      // Brillo
      ctx.fillStyle='rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(gx-gr*.3,gy-gr*.4,gr*.35,gr*.25,-Math.PI/4,0,Math.PI*2); ctx.fill();
      // Hilo
      ctx.strokeStyle=gc+'99'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(gx,gy+gr*1.2); ctx.quadraticCurveTo(gx+8,gy+gr*1.2+30,gx-4,gy+gr*1.2+60); ctx.stroke();
    }

    // --- FOTO CIRCULAR ---
    const photoX=W/2, photoY=nameRowY+230, photoR=145;

    // Anillo exterior decorativo (gradiente)
    const ringGrad = ctx.createLinearGradient(photoX-photoR-15,photoY-photoR-15,photoX+photoR+15,photoY+photoR+15);
    ringGrad.addColorStop(0,BLUE_LIGHT); ringGrad.addColorStop(.5,PURPLE_LIGHT); ringGrad.addColorStop(1,GREEN);
    ctx.strokeStyle=ringGrad; ctx.lineWidth=6;
    ctx.beginPath(); ctx.arc(photoX,photoY,photoR+12,0,Math.PI*2); ctx.stroke();

    // Anillo interior blanco
    ctx.strokeStyle='#fff'; ctx.lineWidth=6;
    ctx.beginPath(); ctx.arc(photoX,photoY,photoR+4,0,Math.PI*2); ctx.stroke();

    // Foto o avatar
    ctx.save();
    ctx.beginPath(); ctx.arc(photoX,photoY,photoR,0,Math.PI*2); ctx.clip();
    if (c.foto) {
      try {
        const img = await this.loadImage(this.svc.fotoUrl(c.foto));
        ctx.drawImage(img, photoX-photoR, photoY-photoR, photoR*2, photoR*2);
      } catch {
        this.drawAvatarFallback(ctx, photoX, photoY, photoR, c.nombre_completo);
      }
    } else {
      this.drawAvatarFallback(ctx, photoX, photoY, photoR, c.nombre_completo);
    }
    ctx.restore();

    // Pequeñas estrellas alrededor de la foto
    this.drawStar(ctx, photoX+photoR+18, photoY-photoR+10,  10, BLUE_LIGHT);
    this.drawStar(ctx, photoX-photoR-18, photoY+photoR-10,  8,  PURPLE_LIGHT);
    this.drawStar(ctx, photoX+photoR+8,  photoY+photoR+18,  7,  GREEN);
    this.drawStar(ctx, photoX-photoR-8,  photoY-photoR-15,  9,  '#f57f17');

    // --- VERSÍCULO BÍBLICO (debajo de la foto) ---
    const versiculo = this.VERSICULOS_PROMESAS[Math.floor(Math.random() * this.VERSICULOS_PROMESAS.length)];
    const verseX = 60, verseW = W - 120;
    const verseStartY = photoY + photoR + 24;

    ctx.font = 'italic 19px Georgia,"Times New Roman",serif';
    const verseLines = this.wrapText(ctx, versiculo.texto, verseW - 48);
    const verseLineH = 28;
    const verseBoxH = 32 + verseLines.length * verseLineH + 38;

    // Fondo y borde del cuadro del versículo
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = PURPLE;
    this.roundRect(ctx, verseX, verseStartY, verseW, verseBoxH, 14);
    ctx.fill();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = PURPLE_LIGHT;
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, verseX, verseStartY, verseW, verseBoxH, 14);
    ctx.stroke();
    ctx.restore();

    // Cruz decorativa pequeña en la parte superior del cuadro
    ctx.fillStyle = PURPLE_LIGHT;
    ctx.font = '17px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('✝', W/2, verseStartY + 20);

    // Texto del versículo
    ctx.font = 'italic 19px Georgia,"Times New Roman",serif';
    ctx.fillStyle = '#5a3c78';
    ctx.textAlign = 'center';
    let verseTextY = verseStartY + 44;
    for (const vLine of verseLines) {
      ctx.fillText(vLine, W/2, verseTextY);
      verseTextY += verseLineH;
    }

    // Referencia bíblica
    ctx.font = 'bold italic 15px "Nunito",Arial';
    ctx.fillStyle = PURPLE;
    ctx.fillText(versiculo.ref, W/2, verseTextY + 14);

    // --- PASTEL ---
    ctx.font='72px serif'; ctx.textAlign='center';
    ctx.fillText('🎂', W/2, photoY+photoR+260);

    // Pequeñas estrellas/confetti
    ctx.font='30px serif';
    ctx.fillText('✨', W/2-100, photoY+photoR+240);
    ctx.fillText('✨', W/2+100, photoY+photoR+240);
    ctx.fillText('🎉', 80,  photoY+photoR+225);
    ctx.fillText('🎉', W-80, photoY+photoR+225);

    // Confetti puntos
    const confettiColors = [BLUE_LIGHT, PURPLE_LIGHT, '#f57f17', GREEN, '#f06292', BLUE_LIGHTER];
    for (let i=0; i<40; i++) {
      ctx.fillStyle = confettiColors[i%confettiColors.length];
      ctx.globalAlpha = 0.6;
      const cx = 40 + Math.random()*(W-80);
      const cy = photoY+photoR+280 + Math.random()*80;
      ctx.beginPath();
      ctx.arc(cx, cy, 3+Math.random()*4, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha=1;

    // --- BANNER PIE ---
    const footerY = H - 60;
    const footerGrad = ctx.createLinearGradient(0,footerY,W,H);
    footerGrad.addColorStop(0, SIDEBAR_TOP); footerGrad.addColorStop(1, SIDEBAR_BOT);
    ctx.fillStyle=footerGrad; ctx.fillRect(0,footerY,W,60);

    ctx.fillStyle='rgba(255,255,255,.7)'; ctx.font='13px "Nunito",Arial'; ctx.textAlign='center';
    ctx.fillText('Con cariño, tu familia en Cristo ✝', W/2, footerY+24);
    ctx.fillStyle=BLUE_LIGHTER; ctx.font='11px Arial';
    ctx.fillText('Iglesia del Nazareno · Más que Vencedores', W/2, footerY+44);

    return cv.toDataURL('image/png');
  }

  private drawAvatarFallback(ctx: CanvasRenderingContext2D, x:number, y:number, r:number, nombre:string) {
    const grad = ctx.createLinearGradient(x-r,y-r,x+r,y+r);
    grad.addColorStop(0,BLUE); grad.addColorStop(1,PURPLE);
    ctx.fillStyle=grad; ctx.fillRect(x-r,y-r,r*2,r*2);
    ctx.fillStyle='rgba(255,255,255,.9)';
    ctx.font=`bold ${r*0.75}px Arial`; ctx.textAlign='center';
    ctx.fillText(nombre[0]?.toUpperCase()||'?', x, y+r*0.28);
  }

  private drawStar(ctx: CanvasRenderingContext2D, x:number, y:number, size:number, color:string) {
    ctx.save(); ctx.translate(x,y); ctx.fillStyle=color;
    ctx.beginPath();
    for (let i=0; i<5; i++) {
      const angle = (i*4*Math.PI/5)-Math.PI/2;
      const innerAngle = ((i*4+2)*Math.PI/5)-Math.PI/2;
      if (i===0) ctx.moveTo(Math.cos(angle)*size, Math.sin(angle)*size);
      else ctx.lineTo(Math.cos(angle)*size, Math.sin(angle)*size);
      ctx.lineTo(Math.cos(innerAngle)*size*.45, Math.sin(innerAngle)*size*.45);
    }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  private async loadImageWithAuth(url: string): Promise<HTMLImageElement> {
    const token = localStorage.getItem('mqv_token') || '';
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('No se pudo cargar la foto');
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload  = () => { URL.revokeObjectURL(objectUrl); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(); };
      img.src = objectUrl;
    });
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image(); img.crossOrigin='anonymous';
      img.onload=()=>resolve(img); img.onerror=reject; img.src=src;
    });
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private readonly VERSICULOS_PROMESAS = [
    // Promesas de futuro y esperanza
    { texto: '"Porque yo sé los planes que tengo para vosotros, planes de bienestar y no de calamidad, para daros un futuro y una esperanza."', ref: '— Jeremías 29:11' },
    { texto: '"El Señor te bendiga y te guarde; el Señor haga resplandecer su rostro sobre ti, y tenga de ti misericordia."', ref: '— Números 6:24-25' },
    { texto: '"El Señor bendecirá tu salida y tu entrada, desde ahora y para siempre."', ref: '— Salmos 121:8' },
    { texto: '"Porque él dará sus ángeles mandato sobre ti, que te guarden en todos tus caminos."', ref: '— Salmos 91:11' },
    { texto: '"Porque con Dios nada será imposible."', ref: '— Lucas 1:37' },
    // Fortaleza y valentía
    { texto: '"Todo lo puedo en Cristo que me fortalece."', ref: '— Filipenses 4:13' },
    { texto: '"Sean fuertes y valientes. No teman ni se asusten, porque el Señor su Dios estará con ustedes dondequiera que vayan."', ref: '— Josué 1:9' },
    { texto: '"No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo; siempre te ayudaré, siempre te sustentaré."', ref: '— Isaías 41:10' },
    { texto: '"Esfuérzate y sé valiente; no temas ni te intimides, porque el Señor tu Dios estará contigo dondequiera que vayas."', ref: '— Josué 1:9' },
    { texto: '"El que comenzó en vosotros la buena obra, la perfeccionará hasta el día de Jesucristo."', ref: '— Filipenses 1:6' },
    { texto: '"Mas los que esperan en el Señor renovarán sus fuerzas; se remontarán con alas como las águilas."', ref: '— Isaías 40:31' },
    // Confianza y guía
    { texto: '"Confía en el Señor con todo tu corazón, y no te apoyes en tu propio entendimiento; reconócelo en todos tus caminos, y él enderezará tus veredas."', ref: '— Proverbios 3:5-6' },
    { texto: '"Encomienda al Señor tu camino, confía en él, y él actuará."', ref: '— Salmos 37:5' },
    { texto: '"Deleítate en el Señor, y él te concederá los deseos de tu corazón."', ref: '— Salmos 37:4' },
    { texto: '"Lámpara es a mis pies tu palabra, y lumbre a mi camino."', ref: '— Salmos 119:105' },
    { texto: '"El Señor es mi luz y mi salvación; ¿a quién temeré? El Señor es la fortaleza de mi vida; ¿de quién me he de atemorizar?"', ref: '— Salmos 27:1' },
    // Paz y descanso
    { texto: '"Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar."', ref: '— Mateo 11:28' },
    { texto: '"La paz os dejo, mi paz os doy; yo no os la doy como el mundo la da. No se turbe vuestro corazón, ni tenga miedo."', ref: '— Juan 14:27' },
    { texto: '"Y la paz de Dios, que sobrepasa todo entendimiento, guardará vuestros corazones y vuestros pensamientos en Cristo Jesús."', ref: '— Filipenses 4:7' },
    { texto: '"Echa sobre el Señor tu carga, y él te sustentará; no dejará para siempre caído al justo."', ref: '— Salmos 55:22' },
    // Amor de Dios
    { texto: '"Porque de tal manera amó Dios al mundo, que dio a su Hijo unigénito, para que todo aquel que en él cree no se pierda, mas tenga vida eterna."', ref: '— Juan 3:16' },
    { texto: '"Con amor eterno te he amado; por tanto, te prolongué mi misericordia."', ref: '— Jeremías 31:3' },
    { texto: '"Nada nos podrá separar del amor de Dios, que es en Cristo Jesús Señor nuestro."', ref: '— Romanos 8:39' },
    { texto: '"¡Cuán grande amor nos ha dado el Padre, para que seamos llamados hijos de Dios!"', ref: '— 1 Juan 3:1' },
    // Alabanza y gratitud
    { texto: '"El Señor es mi pastor; nada me faltará."', ref: '— Salmos 23:1' },
    { texto: '"Grandes cosas ha hecho el Señor con nosotros; estaremos alegres."', ref: '— Salmos 126:3' },
    { texto: '"Bendice, alma mía, al Señor, y no olvides ninguno de sus beneficios."', ref: '— Salmos 103:2' },
    { texto: '"Dad gracias en todo, porque esta es la voluntad de Dios para con vosotros en Cristo Jesús."', ref: '— 1 Tesalonicenses 5:18' },
    // Prosperidad y plenitud
    { texto: '"Y sabemos que a los que aman a Dios, todas las cosas les ayudan a bien."', ref: '— Romanos 8:28' },
    { texto: '"El Señor está cerca de los quebrantados de corazón; y salva a los contritos de espíritu."', ref: '— Salmos 34:18' },
    { texto: '"Yo he venido para que tengan vida, y para que la tengan en abundancia."', ref: '— Juan 10:10' },
    { texto: '"Porque yo Jehová soy tu Dios, quien te sostiene de tu mano derecha, y te dice: No temas, yo te ayudo."', ref: '— Isaías 41:13' },
    { texto: '"Mi Dios, pues, suplirá todo lo que os falta conforme a sus riquezas en gloria en Cristo Jesús."', ref: '— Filipenses 4:19' },
    // Nuevas misericordias y renovación
    { texto: '"Las misericordias del Señor jamás terminan, pues nunca fallan sus bondades; son nuevas cada mañana."', ref: '— Lamentaciones 3:22-23' },
    { texto: '"De modo que si alguno está en Cristo, nueva criatura es; las cosas viejas pasaron; he aquí todas son hechas nuevas."', ref: '— 2 Corintios 5:17' },
    { texto: '"Él sana a los quebrantados de corazón, y venda sus heridas."', ref: '— Salmos 147:3' },
    { texto: '"Pelea la buena batalla de la fe, echa mano de la vida eterna, a la cual asimismo fuiste llamado."', ref: '— 1 Timoteo 6:12' },
    // Motivación y propósito
    { texto: '"Así que no os afanéis por el día de mañana, porque el día de mañana traerá su afán. Basta a cada día su propio mal."', ref: '— Mateo 6:34' },
    { texto: '"Mas buscad primeramente el reino de Dios y su justicia, y todas estas cosas os serán añadidas."', ref: '— Mateo 6:33' },
    { texto: '"Todo lo que hagáis, hacedlo de corazón, como para el Señor y no para los hombres."', ref: '— Colosenses 3:23' },
    { texto: '"No nos cansemos, pues, de hacer bien; porque a su tiempo segaremos, si no desmayamos."', ref: '— Gálatas 6:9' },
    { texto: '"Porque para Dios somos hechura suya, creados en Cristo Jesús para buenas obras."', ref: '— Efesios 2:10' },
    { texto: '"El joven que sigue la justicia y la misericordia hallará vida, justicia y honra."', ref: '— Proverbios 21:21' },
  ];

  // ── Compartir ─────────────────────────────────────────────────
  descargarTarjeta() {
    const url = this.cardDataUrl();
    if (!url || !this.personaSelec) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `feliz-cumpleanios-${this.personaSelec.nombre_completo.replace(/\s+/g,'_')}.png`;
    a.click();
  }

  async compartirWhatsapp() {
    const url = this.cardDataUrl();
    if (!url || !this.personaSelec) return;
    this.msgWhatsapp.set('');

    try {
      // Intento 1: Web Share API (funciona en móvil y algunos navegadores)
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], 'feliz-cumpleanios.png', { type: 'image/png' });

      if (navigator.share && (navigator as any).canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `🎂 Feliz Cumpleaños ${this.personaSelec.nombre_completo}`,
        });
        return;
      }
    } catch {}

    // Fallback: descargar imagen + abrir WhatsApp Web
    this.descargarTarjeta();
    this.msgWhatsapp.set('✅ Imagen descargada. Ahora ábrela desde tu galería y compártela en WhatsApp.');
    setTimeout(() => window.open('https://web.whatsapp.com/', '_blank'), 600);
  }

  async enviarEmail() {
    if (!this.personaSelec) return;
    this.enviandoEmail.set(true); this.error.set('');
    this.http.post<any>(`/api/personas/${this.personaSelec.idpersonas}/email-cumpleaneros`, {}).subscribe({
      next: (r) => { this.msgExito.set(r.message); this.enviandoEmail.set(false); setTimeout(()=>this.msgExito.set(''),4000); },
      error:(err) => { this.error.set(err.message||'Error al enviar correo'); this.enviandoEmail.set(false); },
    });
  }
}
