const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** 'YYYY-MM-DD[ HH:mm:ss]' → '27 sep 2026'. */
export const formatFecha = (f: string | null | undefined) => {
  if (!f) return '—';
  const [y, m, d] = String(f).split(' ')[0].split('-');
  if (!y || !m || !d) return '—';
  return `${Number(d)} ${MESES[Number(m) - 1] ?? m} ${y}`;
};

/** 'YYYY-MM-DD HH:mm:ss' → '27 sep 2026, 14:05'. */
export const formatFechaHora = (f: string | null | undefined) => {
  if (!f) return '';
  const hora = String(f).split(' ')[1]?.slice(0, 5);
  return hora ? `${formatFecha(f)}, ${hora}` : formatFecha(f);
};

/**
 * Fecha del servidor como Date local. Las fechas de las solicitudes vienen
 * como texto sin zona; created_at de las notificaciones viene en ISO (UTC).
 */
export const parseFecha = (f: string | null | undefined): Date | null => {
  if (!f) return null;
  const d = new Date(String(f).includes('T') ? String(f) : String(f).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "hace 5 min", "hace 2 h", "ayer", "hace 3 días", o la fecha. */
export const tiempoRelativo = (f: string | null | undefined) => {
  const d = parseFecha(f);
  if (!d) return '';
  const min = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.floor(h / 24);
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
};

/** Fecha local en formato YYYY-MM-DD (toISOString usaría UTC). */
export const fechaLocal = (d: Date): string => {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

export const sumarDias = (fecha: string, dias: number) => {
  const [y, m, d] = fecha.split('-').map(Number);
  return fechaLocal(new Date(y, m - 1, d + dias));
};

export const diasDesde = (fecha: string | null): number => {
  const d = parseFecha(fecha);
  return d ? Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000)) : 0;
};

export const iniciales = (nombre: string | null | undefined) =>
  (nombre ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('') || '?';

export const primerNombre = (nombre: string | null | undefined) => (nombre ?? '').split(/\s+/)[0] || '';

/** Texto comparable para búsquedas: minúsculas y sin tildes. */
export const normalizar = (s: unknown) =>
  String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** 'YYYY-MM-DD' → 'domingo 15 nov'. */
export const fechaLarga = (f: string | null | undefined) => {
  const d = parseFecha(f ? String(f).slice(0, 10) + ' 00:00:00' : null);
  return d ? `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}` : '—';
};

/** "Hoy", "Mañana", "En 3 días" para una fecha futura 'YYYY-MM-DD'. */
export const cuandoEs = (f: string | null | undefined) => {
  const d = parseFecha(f ? String(f).slice(0, 10) + ' 00:00:00' : null);
  if (!d) return '';
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const dias = Math.round((d.getTime() - hoy.getTime()) / 86_400_000);
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  if (dias === -1) return 'Ayer';
  if (dias > 1) return `En ${dias} días`;
  return `Hace ${-dias} días`;
};
