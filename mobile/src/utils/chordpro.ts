/**
 * ChordPro: parseo, transposición, números Nashville y capo.
 * (Copia de frontend/src/app/alabanza/chordpro.ts: mantener ambos iguales)
 *
 *   {title: Santo, Santo, Santo}
 *   {start_of_verse: Estrofa 1}
 *   [D]¡Santo! ¡Santo! [Bm]¡Santo!
 *   {end_of_verse}
 */

export interface Segmento { acorde: string | null; texto: string; }

export type Linea =
  | { tipo: 'letra'; segmentos: Segmento[]; soloAcordes: boolean }
  | { tipo: 'seccion'; nombre: string; clase: ClaseSeccion }
  | { tipo: 'comentario'; texto: string }
  | { tipo: 'vacia' };

export type ClaseSeccion = 'estrofa' | 'coro' | 'puente' | 'intro' | 'otro';

export interface CancionParseada {
  meta: Record<string, string>;
  lineas: Linea[];
}

const NOTAS_SOST = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTAS_BEM  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const INDICE: Record<string, number> = {
  C: 0, 'B#': 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, 'E#': 5, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11,
};

/** Tonalidades que se escriben con bemoles. */
const TONOS_BEMOL = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm']);

export const TONALIDADES = [
  'C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm',
];

const ACORDE_RE = /^([A-G](?:#|b)?)([^/]*)(?:\/([A-G](?:#|b)?))?$/;

/** Separa "F#m7/C#" en raíz, calidad y bajo. */
export function partesAcorde(acorde: string) {
  const m = ACORDE_RE.exec(acorde.trim());
  if (!m) return null;
  return { raiz: m[1], calidad: m[2] || '', bajo: m[3] || null };
}

function indiceNota(n: string): number | null {
  const i = INDICE[n];
  return i === undefined ? null : i;
}

function nota(i: number, bemoles: boolean) {
  const k = ((i % 12) + 12) % 12;
  return (bemoles ? NOTAS_BEM : NOTAS_SOST)[k];
}

/** ¿La tonalidad destino se escribe con bemoles? */
export function usaBemoles(tonalidad: string | null | undefined): boolean {
  return !!tonalidad && (TONOS_BEMOL.has(tonalidad) || /b/.test(tonalidad.replace(/m$/, '')));
}

/** Transpone un acorde N semitonos. Si no es un acorde reconocible lo deja igual. */
export function transponerAcorde(acorde: string, semitonos: number, bemoles = false): string {
  if (!semitonos) return acorde;
  const p = partesAcorde(acorde);
  if (!p) return acorde;
  const r = indiceNota(p.raiz);
  if (r === null) return acorde;
  let out = nota(r + semitonos, bemoles) + p.calidad;
  if (p.bajo) {
    const b = indiceNota(p.bajo);
    out += '/' + (b === null ? p.bajo : nota(b + semitonos, bemoles));
  }
  return out;
}

/** Semitonos para ir de una tonalidad a otra (-5..+6, el camino más corto). */
export function semitonosEntre(desde: string | null | undefined, hasta: string | null | undefined): number {
  if (!desde || !hasta) return 0;
  const a = indiceNota(desde.replace(/m$/, ''));
  const b = indiceNota(hasta.replace(/m$/, ''));
  if (a === null || b === null) return 0;
  let d = (b - a + 12) % 12;
  if (d > 6) d -= 12;
  return d;
}

/** Tonalidad resultante de transponer. Conserva el modo menor. */
export function transponerTonalidad(tonalidad: string | null | undefined, semitonos: number): string | null {
  if (!tonalidad) return null;
  const menor = tonalidad.endsWith('m');
  const raiz = tonalidad.replace(/m$/, '');
  const i = indiceNota(raiz);
  if (i === null) return tonalidad;
  const destinoSost = nota(i + semitonos, false) + (menor ? 'm' : '');
  const destinoBem  = nota(i + semitonos, true) + (menor ? 'm' : '');
  return usaBemoles(destinoBem) && destinoBem !== destinoSost ? destinoBem : destinoSost;
}

const GRADOS_MAYOR: Record<number, string> = { 0: '1', 1: 'b2', 2: '2', 3: 'b3', 4: '3', 5: '4', 6: 'b5', 7: '5', 8: 'b6', 9: '6', 10: 'b7', 11: '7' };

/** Acorde en número Nashville respecto a la tonalidad (G en D => 4). */
export function aNashville(acorde: string, tonalidad: string | null | undefined): string {
  const p = partesAcorde(acorde);
  if (!p || !tonalidad) return acorde;
  const menorTono = tonalidad.endsWith('m');
  const t = indiceNota(tonalidad.replace(/m$/, ''));
  const r = indiceNota(p.raiz);
  if (t === null || r === null) return acorde;
  // En tonalidad menor se numera desde la relativa mayor (convención más usada en iglesias)
  const base = menorTono ? (t + 3) % 12 : t;
  const grado = GRADOS_MAYOR[(r - base + 12) % 12];
  const calidad = p.calidad.replace(/^m(?!aj)/, '-');
  let out = grado + calidad;
  if (p.bajo) {
    const b = indiceNota(p.bajo);
    out += '/' + (b === null ? p.bajo : GRADOS_MAYOR[(b - base + 12) % 12]);
  }
  return out;
}

/** Formas cómodas para guitarra. */
const FORMAS_GUITARRA = ['C', 'G', 'D', 'A', 'E', 'Am', 'Em', 'Dm'];

/** Sugerencias de capo: con capo N se tocan las formas de `forma` y suena en `tonalidad`. */
export function sugerenciasCapo(tonalidad: string | null | undefined): { capo: number; forma: string }[] {
  if (!tonalidad) return [];
  const out: { capo: number; forma: string }[] = [];
  for (let capo = 1; capo <= 7; capo++) {
    const forma = transponerTonalidad(tonalidad, -capo);
    if (forma && FORMAS_GUITARRA.includes(forma)) out.push({ capo, forma });
  }
  return out;
}

const SECCIONES: Record<string, ClaseSeccion> = {
  start_of_verse: 'estrofa', sov: 'estrofa',
  start_of_chorus: 'coro', soc: 'coro',
  start_of_bridge: 'puente', sob: 'puente',
  start_of_intro: 'intro',
};
const NOMBRE_SECCION: Record<ClaseSeccion, string> = {
  estrofa: 'Estrofa', coro: 'Coro', puente: 'Puente', intro: 'Intro', otro: '',
};

/** Encabezados escritos como texto: "Coro:", "[Estrofa 2]", "Puente". */
const ENCABEZADO_RE = /^\s*(estrofa|verso|coro|pre-?coro|puente|intro|final|outro|interludio)(\s*\d+)?\s*:?\s*$/i;

function claseDeNombre(n: string): ClaseSeccion {
  const s = n.toLowerCase();
  if (s.startsWith('coro') || s.includes('precoro') || s.includes('pre-coro')) return 'coro';
  if (s.startsWith('puente')) return 'puente';
  if (s.startsWith('intro') || s.startsWith('interludio') || s.startsWith('final') || s.startsWith('outro')) return 'intro';
  if (s.startsWith('estrofa') || s.startsWith('verso')) return 'estrofa';
  return 'otro';
}

export function parsearChordPro(texto: string | null | undefined): CancionParseada {
  const meta: Record<string, string> = {};
  const lineas: Linea[] = [];
  for (const crudo of (texto || '').replace(/\r/g, '').split('\n')) {
    const linea = crudo.replace(/\s+$/, '');
    const dir = /^\s*\{([^}:]+)(?::\s*([^}]*))?\}\s*$/.exec(linea);
    if (dir) {
      const clave = dir[1].trim().toLowerCase();
      const valor = (dir[2] || '').trim();
      if (SECCIONES[clave]) {
        const clase = SECCIONES[clave];
        lineas.push({ tipo: 'seccion', clase, nombre: valor || NOMBRE_SECCION[clase] });
      } else if (clave === 'comment' || clave === 'c' || clave === 'comment_italic' || clave === 'ci') {
        lineas.push({ tipo: 'comentario', texto: valor });
      } else if (!clave.startsWith('end_of') && !/^eo[cvb]$/.test(clave)) {
        meta[clave === 't' ? 'title' : clave === 'st' ? 'subtitle' : clave] = valor;
      }
      continue;
    }
    if (!linea.trim()) {
      if (lineas.length && lineas[lineas.length - 1].tipo !== 'vacia') lineas.push({ tipo: 'vacia' });
      continue;
    }
    const enc = ENCABEZADO_RE.exec(linea);
    if (enc) {
      const nombre = linea.trim().replace(/:$/, '');
      lineas.push({ tipo: 'seccion', clase: claseDeNombre(nombre), nombre: nombre.charAt(0).toUpperCase() + nombre.slice(1) });
      continue;
    }
    lineas.push(parsearLetra(linea));
  }
  while (lineas.length && lineas[lineas.length - 1].tipo === 'vacia') lineas.pop();
  return { meta, lineas };
}

function parsearLetra(linea: string): Linea {
  const segmentos: Segmento[] = [];
  const re = /\[([^\]]*)\]/g;
  let ultimo = 0;
  let acorde: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(linea))) {
    const texto = linea.slice(ultimo, m.index);
    if (texto || acorde !== null) segmentos.push({ acorde, texto });
    acorde = m[1].trim();
    ultimo = m.index + m[0].length;
  }
  segmentos.push({ acorde, texto: linea.slice(ultimo) });
  const conTexto = segmentos.filter(s => s.texto.trim()).length;
  return { tipo: 'letra', segmentos, soloAcordes: conTexto === 0 };
}

export interface OpcionesVista {
  semitonos: number;
  bemoles: boolean;
  nashville: boolean;
  tonalidad: string | null;   // tonalidad resultante (para Nashville)
}

/** Aplica transposición / Nashville a un acorde según las opciones de vista. */
export function acordeVisible(acorde: string, o: OpcionesVista): string {
  const t = transponerAcorde(acorde, o.semitonos, o.bemoles);
  return o.nashville ? aNashville(t, o.tonalidad) : t;
}

/** Texto plano con los acordes arriba de la letra (para copiar / compartir por WhatsApp). */
export function aTextoPlano(c: CancionParseada, o: OpcionesVista): string {
  const out: string[] = [];
  for (const l of c.lineas) {
    if (l.tipo === 'vacia') out.push('');
    else if (l.tipo === 'seccion') out.push(`[${l.nombre}]`);
    else if (l.tipo === 'comentario') out.push(`(${l.texto})`);
    else {
      let acordes = '';
      let letra = '';
      for (const s of l.segmentos) {
        const ac = s.acorde ? acordeVisible(s.acorde, o) : '';
        if (acordes.length < letra.length) acordes = acordes.padEnd(letra.length);
        if (letra.length < acordes.length && ac) letra = letra.padEnd(acordes.length);
        acordes += ac ? ac + ' ' : '';
        letra += s.texto;
      }
      if (acordes.trim()) out.push(acordes.trimEnd());
      if (letra.trim()) out.push(letra);
    }
  }
  return out.join('\n');
}

/**
 * Convierte el formato "acordes arriba de la letra" (el que se copia de internet)
 * a ChordPro. Una línea es de acordes si todas sus palabras son acordes.
 */
export function convertirAcordesArriba(texto: string): string {
  const lineas = texto.replace(/\r/g, '').split('\n');
  const esLineaAcordes = (l: string) => {
    const t = l.trim().split(/\s+/).filter(Boolean);
    return t.length > 0 && t.every(p => !!partesAcorde(p.replace(/[()|]/g, '')) || p === '|' || p === '-');
  };
  const out: string[] = [];
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    if (esLineaAcordes(l)) {
      const sig = lineas[i + 1];
      const posiciones: { pos: number; ac: string }[] = [];
      const re = /\S+/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(l))) posiciones.push({ pos: m.index, ac: m[0] });
      if (sig !== undefined && sig.trim() && !esLineaAcordes(sig)) {
        let letra = sig.padEnd(Math.max(...posiciones.map(p => p.pos)) + 1);
        for (const p of [...posiciones].reverse()) {
          letra = letra.slice(0, p.pos) + `[${p.ac}]` + letra.slice(p.pos);
        }
        out.push(letra.replace(/\s+$/, ''));
        i++;
      } else {
        out.push(posiciones.map(p => `[${p.ac}]`).join(' '));
      }
    } else {
      out.push(l);
    }
  }
  return out.join('\n');
}
