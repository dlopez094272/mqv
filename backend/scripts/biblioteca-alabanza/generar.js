// Genera backend/migrations/alabanza_biblioteca_inicial.sql
// Uso: node backend/scripts/biblioteca-alabanza/generar.js  (edita himnos.js / melodias.abc y vuelve a generar)
const fs = require('fs');
const path = require('path');
const himnos = require('./himnos');
const abcjs = require(path.join(__dirname, '..', '..', '..', 'frontend', 'node_modules', 'abcjs'));

const DIR = __dirname;
const ABC_FILE = path.join(DIR, 'melodias.abc');
const SALIDA = path.join(__dirname, '..', '..', 'migrations', 'alabanza_biblioteca_inicial.sql');

// ── Melodías: bloques X:n del archivo verificado ────────────────────────
const bloques = {};
let actual = null;
for (const linea of fs.readFileSync(ABC_FILE, 'utf8').replace(/\r/g, '').split('\n')) {
  const x = /^X:\s*(\d+)/.exec(linea);
  if (x) { actual = Number(x[1]); bloques[actual] = []; continue; }
  if (actual !== null && linea.trim()) bloques[actual].push(linea);
}

function abcDe(h) {
  const lineas = bloques[h.abc];
  if (!lineas) throw new Error(`Sin melodía X:${h.abc} para ${h.titulo}`);
  const tonada = (lineas.find(l => l.startsWith('T:')) || 'T:').slice(2).trim();
  const cuerpo = lineas.filter(l => !l.startsWith('T:'))
    .map(l => l.replace(/\.-/g, '-'));            // ligadura punteada → ligadura normal
  return ['X:1', `T:${h.titulo}`, `T:(${tonada})`, ...cuerpo].join('\n');
}

// ── Letra + acordes en ChordPro ─────────────────────────────────────────
/** Reparte los acordes sobre las palabras de la línea (primero al inicio, último en la última palabra). */
function conAcordes(linea, acordes) {
  const palabras = linea.split(' ');
  const n = palabras.length, k = acordes.length;
  const pos = new Map();                            // palabra → acordes
  acordes.forEach((a, i) => {
    let p = k === 1 ? 0 : Math.round((i * (n - 1)) / (k - 1));
    while (pos.has(p) && p < n - 1) p++;           // no encimar dos acordes en la misma palabra
    pos.set(p, [...(pos.get(p) || []), a]);
  });
  // Si una palabra recibe varios acordes, se reparten dentro de ella (es[F]tá) en vez de pegarlos.
  return palabras.map((w, i) => {
    const ac = pos.get(i);
    if (!ac) return w;
    if (ac.length === 1) return `[${ac[0]}]${w}`;
    let res = '', desde = 0;
    ac.forEach((a, j) => {
      const corte = j === 0 ? 0 : Math.max(desde, Math.round((j * w.length) / ac.length));
      res += w.slice(desde, corte) + `[${a}]`;
      desde = corte;
    });
    return res + w.slice(desde);
  }).join(' ');
}

function chordPro(h) {
  const estrofas = h.letra.trim().split(/\n\s*\n/);
  const out = [];
  let num = 0;
  for (const e of estrofas) {
    let lineas = e.split('\n').map(l => l.trim()).filter(Boolean);
    const esCoro = /^(coro|estribillo):?$/i.test(lineas[0]);
    if (esCoro) {
      const nombre = lineas[0].replace(/:$/, '');
      lineas = lineas.slice(1);
      const plantilla = h.coroAcordes || h.acordes;
      out.push(`{start_of_chorus: ${nombre}}`);
      lineas.forEach((l, i) => out.push(conAcordes(l, plantilla[i % plantilla.length])));
      out.push('{end_of_chorus}', '');
    } else {
      num++;
      const nombre = estrofas.length === 1 ? 'Estrofa' : `Estrofa ${num}`;
      out.push(`{start_of_verse: ${nombre}}`);
      lineas.forEach((l, i) => out.push(conAcordes(l, h.acordes[i % h.acordes.length])));
      out.push('{end_of_verse}', '');
    }
  }
  return out.join('\n').trim();
}

// ── Validaciones ────────────────────────────────────────────────────────
const errores = [];
const titulos = new Set();
for (const h of himnos) {
  if (titulos.has(h.titulo)) errores.push(`Título repetido: ${h.titulo}`);
  titulos.add(h.titulo);
  if (/[\[\]]/.test(h.letra)) errores.push(`Corchetes en la letra de ${h.titulo} (se tomarían como acordes)`);
  const abc = abcDe(h);
  const [tune] = abcjs.parseOnly(abc);
  const avisos = (tune && tune.warnings) || [];
  if (!tune || !tune.lines || !tune.lines.length) errores.push(`ABC vacío: ${h.titulo}`);
  if (avisos.length) errores.push(`ABC de ${h.titulo}: ${avisos.map(a => String(a).replace(/<[^>]+>/g, '')).join(' | ')}`);
  const k = /^K:\s*(\S+)/m.exec(abc)[1];
  if (k !== h.tonalidad) errores.push(`Tonalidad ${h.titulo}: datos ${h.tonalidad} vs partitura ${k}`);
}
if (errores.length) { console.error(errores.join('\n')); process.exit(1); }

// ── SQL ─────────────────────────────────────────────────────────────────
const q = v => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`);

const filas = himnos.map(h => `(${[
  q(h.titulo), q(h.autor), q('himno'), q(h.tonalidad), h.bpm ?? 'NULL', q(h.compas), q(h.categoria), q(h.etiquetas),
  q(chordPro(h)), q(abcDe(h)), q(h.notas ?? null), 1,
].join(',\n ')})`);

const sql = `-- ============================================================
-- Alabanza: biblioteca inicial de himnos - MQV
-- Requiere haber ejecutado antes: backend/migrations/alabanza.sql
-- Generado automáticamente: ${himnos.length} himnos completos, cada uno con
--   · letra en español (traducciones de dominio público tomadas de himnarios
--     de 1893-1914 escaneados en archive.org y de hymnary.org),
--   · acordes en ChordPro (armonización básica, en la tonalidad de la partitura),
--   · partitura de la melodía en notación ABC (Open Hymnal Project y freehymns,
--     a partir de himnarios antiguos; se dibuja y reproduce en la web y la app).
--
-- Se puede re-ejecutar:
--   · inserta los himnos cuyo título aún no existe,
--   · actualiza los que ya cargó este script (usuario = 'biblioteca-inicial'),
--   · quita lo que dejó la versión anterior de este script y ya no está en la
--     biblioteca (si no se usa en el programa de alguna actividad).
-- No toca canciones creadas por los usuarios.
-- ============================================================

SET NAMES utf8mb4;

DROP TEMPORARY TABLE IF EXISTS tmp_canciones;
CREATE TEMPORARY TABLE tmp_canciones (
  titulo          VARCHAR(255) NOT NULL,
  autor           VARCHAR(255) NULL,
  tipo            VARCHAR(30)  NOT NULL,
  tonalidad       VARCHAR(5)   NULL,
  bpm             SMALLINT     NULL,
  compas          VARCHAR(5)   NULL,
  categoria       VARCHAR(60)  NULL,
  etiquetas       VARCHAR(255) NULL,
  letra_acordes   MEDIUMTEXT   NULL,
  partitura_abc   MEDIUMTEXT   NULL,
  notas           TEXT         NULL,
  dominio_publico TINYINT(1)   NOT NULL
) DEFAULT CHARSET=utf8mb4;

INSERT INTO tmp_canciones
  (titulo, autor, tipo, tonalidad, bpm, compas, categoria, etiquetas, letra_acordes, partitura_abc, notas, dominio_publico)
VALUES
${filas.join(',\n\n')};

-- 1. Quita lo que dejó la versión anterior de este script y ya no forma parte de la
--    biblioteca (fichas sin letra o himnos descartados), salvo que se use en algún programa.
DELETE c FROM alabanza_canciones c
LEFT JOIN tmp_canciones t ON t.titulo = c.titulo
WHERE c.usuario = 'biblioteca-inicial'
  AND t.titulo IS NULL
  AND NOT EXISTS (SELECT 1 FROM actividades_programa p WHERE p.idcanciones = c.idcanciones);

-- 2. Actualiza los himnos que ya había cargado este script
UPDATE alabanza_canciones c
JOIN tmp_canciones t ON t.titulo = c.titulo
SET c.autor = t.autor, c.tipo = t.tipo, c.tonalidad = t.tonalidad, c.bpm = t.bpm, c.compas = t.compas,
    c.categoria = t.categoria, c.etiquetas = t.etiquetas, c.letra_acordes = t.letra_acordes,
    c.partitura_abc = t.partitura_abc, c.notas = t.notas, c.dominio_publico = t.dominio_publico
WHERE c.usuario = 'biblioteca-inicial';

-- 3. Inserta los que aún no existen (por título)
INSERT INTO alabanza_canciones
  (titulo, autor, tipo, tonalidad, bpm, compas, categoria, etiquetas, letra_acordes, partitura_abc, notas, dominio_publico, activo, usuario)
SELECT t.titulo, t.autor, t.tipo, t.tonalidad, t.bpm, t.compas, t.categoria, t.etiquetas, t.letra_acordes, t.partitura_abc,
       t.notas, t.dominio_publico, 1, 'biblioteca-inicial'
FROM tmp_canciones t
WHERE NOT EXISTS (SELECT 1 FROM alabanza_canciones c WHERE c.titulo = t.titulo);

DROP TEMPORARY TABLE IF EXISTS tmp_canciones;

-- Resumen
SELECT categoria, COUNT(*) AS himnos
FROM alabanza_canciones
WHERE usuario = 'biblioteca-inicial'
GROUP BY categoria
ORDER BY himnos DESC;
`;

fs.writeFileSync(SALIDA, sql, 'utf8');
console.log(`OK: ${himnos.length} himnos → ${SALIDA} (${(sql.length / 1024).toFixed(1)} KB)`);
