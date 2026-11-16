import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { DatosCertificado } from '../types';
import { imagenComoDataUri } from './archivos';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function fechaTexto(f: string) {
  const d = new Date(String(f).includes('T') ? f : String(f).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return String(f).slice(0, 10);
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

/** Mismo diseño que el certificado imprimible de la web (crecimiento/certificado). */
function htmlCertificado(d: DatosCertificado, logoIglesia: string | null, logoCurso: string | null) {
  const color = d.curso_color || '#1a237e';
  const imgIglesia = logoIglesia ? `<img src="${logoIglesia}" class="iglesia-logo" />` : '';
  const imgCurso = logoCurso ? `<img src="${logoCurso}" class="curso-logo-cert" />` : '<span style="font-size:28px">📚</span>';
  return `<!doctype html><html><head><meta charset="utf-8" />
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 297mm; height: 210mm; font-family: Georgia, 'Times New Roman', serif; background: #fff; }
  .page { width: 297mm; height: 210mm; padding: 12mm; }
  .cert-border { height: 100%; border: 12px solid #1a237e; border-radius: 4px; padding: 6px; }
  .cert-inner { height: 100%; border: 3px solid #c9a84c; padding: 22px 40px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; }
  .cert-header { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
  .iglesia-logo { height: 64px; object-fit: contain; }
  .logo-box { width: 70px; display: flex; justify-content: center; }
  .cert-header-center { text-align: center; flex: 1; }
  .cert-iglesia-name { font-size: 22px; font-weight: bold; color: #1a237e; letter-spacing: 2px; text-transform: uppercase; }
  .cert-iglesia-sub { font-size: 14px; color: #5c6bc0; letter-spacing: 3px; text-transform: uppercase; margin-top: 2px; }
  .curso-logo-wrap { width: 64px; height: 64px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: ${esc(color)}; }
  .curso-logo-cert { max-width: 48px; max-height: 48px; object-fit: contain; filter: brightness(0) invert(1); }
  .cert-divider { width: 100%; height: 2px; background: linear-gradient(90deg, transparent, #c9a84c, transparent); }
  .cert-divider-sm { width: 60%; height: 1px; background: linear-gradient(90deg, transparent, #1a237e 40%, transparent); }
  .cert-label { font-size: 16px; font-weight: bold; color: #c9a84c; letter-spacing: 4px; text-transform: uppercase; text-align: center; }
  .cert-subtitle { font-size: 14px; color: #555; font-style: italic; text-align: center; margin-top: 4px; }
  .cert-nombre { font-size: 36px; font-weight: bold; color: #1a237e; text-align: center; border-bottom: 2px solid #c9a84c; padding: 0 20px 4px; min-width: 340px; letter-spacing: 1px; }
  .cert-body-text { font-size: 15px; color: #444; font-style: italic; text-align: center; }
  .cert-curso-nombre { font-size: 26px; font-weight: bold; text-align: center; letter-spacing: 1px; color: ${esc(color)}; }
  .cert-puntaje { font-size: 14px; color: #555; text-align: center; }
  .cert-puntaje strong { color: #1a237e; font-size: 17px; }
  .cert-fecha-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 2px; text-align: center; }
  .cert-fecha { font-size: 15px; color: #1a237e; font-weight: 600; text-align: center; }
  .cert-firmas { width: 100%; display: flex; align-items: flex-end; justify-content: space-between; gap: 30px; }
  .firma-block { text-align: center; flex: 1; }
  .firma-line { height: 1px; background: #333; margin-bottom: 6px; }
  .firma-label { font-size: 11px; font-weight: bold; color: #333; text-transform: uppercase; letter-spacing: 1px; }
  .firma-org { font-size: 10px; color: #666; font-style: italic; }
  .sello-circle { width: 84px; height: 84px; border-radius: 50%; border: 3px solid ${esc(color)}; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: .5; }
  .sello-circle img { height: 30px; object-fit: contain; margin-bottom: 2px; }
  .sello-text { font-size: 10px; font-weight: bold; color: #1a237e; letter-spacing: 2px; }
  .cert-footer { width: 100%; text-align: center; font-size: 10px; color: #888; letter-spacing: 1px; border-top: 1px solid #ddd; padding-top: 6px; }
</style></head><body><div class="page"><div class="cert-border"><div class="cert-inner">
  <div class="cert-header">
    <div class="logo-box">${imgIglesia}</div>
    <div class="cert-header-center">
      <div class="cert-iglesia-name">Iglesia del Nazareno</div>
      <div class="cert-iglesia-sub">Más que Vencedores</div>
    </div>
    <div class="logo-box"><div class="curso-logo-wrap">${imgCurso}</div></div>
  </div>
  <div class="cert-divider"></div>
  <div>
    <div class="cert-label">Certificado de aprobación</div>
    <div class="cert-subtitle">Se certifica que</div>
  </div>
  <div class="cert-nombre">${esc(d.nombre_completo)}</div>
  <div class="cert-body-text">ha completado satisfactoriamente el curso</div>
  <div class="cert-curso-nombre">${esc(d.curso_nombre)}</div>
  <div class="cert-puntaje">con una calificación de <strong>${esc(Number(d.puntaje))}%</strong></div>
  <div class="cert-divider-sm"></div>
  <div>
    <div class="cert-fecha-label">Fecha de obtención</div>
    <div class="cert-fecha">${esc(fechaTexto(d.completado_at))}</div>
  </div>
  <div class="cert-firmas">
    <div class="firma-block"><div class="firma-line"></div><div class="firma-label">Director General</div><div class="firma-org">Iglesia del Nazareno — MQV</div></div>
    <div class="sello-circle">${logoIglesia ? `<img src="${logoIglesia}" />` : ''}<div class="sello-text">MQV</div></div>
    <div class="firma-block"><div class="firma-line"></div><div class="firma-label">Coordinador de Formación</div><div class="firma-org">Más que Vencedores</div></div>
  </div>
  <div class="cert-footer">Iglesia del Nazareno · Más que Vencedores · ${new Date().getFullYear()}</div>
</div></div></div></body></html>`;
}

/**
 * Genera el certificado en PDF (A4 horizontal) y abre el menú del sistema
 * para guardarlo, imprimirlo o enviarlo.
 * @param filesUrl raíz del servidor (sin /api), donde está /logo.png
 * @param urlLogoCurso URL pública del logo del curso, si tiene
 */
export async function descargarCertificado(d: DatosCertificado, filesUrl: string, urlLogoCurso: string | null) {
  const [logoIglesia, logoCurso] = await Promise.all([
    imagenComoDataUri(`${filesUrl}/logo.png`),
    urlLogoCurso ? imagenComoDataUri(urlLogoCurso) : Promise.resolve(null),
  ]);
  const { uri } = await Print.printToFileAsync({ html: htmlCertificado(d, logoIglesia, logoCurso), width: 842, height: 595 });
  const nombre = `Certificado - ${d.curso_nombre}`;
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: nombre, UTI: 'com.adobe.pdf' });
  } else {
    await Print.printAsync({ uri });
  }
}
