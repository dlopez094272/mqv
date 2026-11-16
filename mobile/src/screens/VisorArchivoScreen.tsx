import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, LayoutChangeEvent, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import ScreenHeader from '../components/ScreenHeader';
import { useAuth } from '../context/AuthContext';
import { colors, radius } from '../theme';
import { descargarYCompartir, iconoArchivo } from '../utils/archivos';
import { ArchivoVisor, mimeDe, tipoVista } from '../utils/visor';

const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174';

interface Props {
  archivos: ArchivoVisor[];
  indice?: number;
}

/**
 * Visor de archivos: PDF (pdf.js), imágenes con zoom (pellizcar), texto,
 * video y un reproductor de audio (MP3, M4A, WAV…). Si el formato no se puede
 * mostrar, ofrece abrirlo con otra app.
 */
export default function VisorArchivoScreen({ archivos, indice = 0 }: Props) {
  const { token, filesUrl } = useAuth();
  const [i, setI] = useState(Math.min(Math.max(indice, 0), archivos.length - 1));
  const [compartiendo, setCompartiendo] = useState(false);
  const insets = useSafeAreaInsets();
  const a = archivos[i];
  const tipo = tipoVista(a.nombre, a.mime);
  const mime = mimeDe(a.nombre, a.mime);

  const compartir = async () => {
    setCompartiendo(true);
    try {
      await descargarYCompartir(a.url, a.nombre, token, mime);
    } catch (err) {
      Alert.alert('Archivo', (err as Error).message);
    } finally {
      setCompartiendo(false);
    }
  };

  return (
    <View style={[styles.fondo, { paddingBottom: archivos.length > 1 ? 0 : insets.bottom }]}>
      <ScreenHeader
        title={a.nombre}
        subtitle={archivos.length > 1 ? `${i + 1} de ${archivos.length}` : undefined}
        right={
          <TouchableOpacity style={styles.accion} onPress={compartir} disabled={compartiendo} accessibilityLabel="Compartir o guardar">
            {compartiendo ? <ActivityIndicator color={colors.white} size="small" /> : <Ionicons name="share-outline" size={20} color={colors.white} />}
          </TouchableOpacity>
        }
      />

      <View style={styles.cuerpo}>
        {tipo === 'audio' ? (
          <ReproductorArchivo key={a.url} archivo={a} token={token} />
        ) : tipo === 'otro' ? (
          <View style={styles.centro}>
            <Ionicons name={iconoArchivo(mime) as any} size={64} color="rgba(255,255,255,0.7)" />
            <Text style={styles.msg}>No hay vista previa para este tipo de archivo.</Text>
            <TouchableOpacity style={styles.boton} onPress={compartir} disabled={compartiendo}>
              <Ionicons name="open-outline" size={18} color={colors.white} />
              <Text style={styles.botonTexto}>Abrir con otra app</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <VistaWeb key={a.url} archivo={a} tipo={tipo} mime={mime} token={token} origen={filesUrl} onCompartir={compartir} />
        )}
      </View>

      {archivos.length > 1 && (
        <View style={[styles.pie, { paddingBottom: 8 + insets.bottom }]}>
          <TouchableOpacity style={[styles.nav, i === 0 && styles.navOff]} disabled={i === 0} onPress={() => setI(i - 1)}>
            <Ionicons name="chevron-back" size={22} color={colors.white} />
            <Text style={styles.navTexto}>Anterior</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.nav, i === archivos.length - 1 && styles.navOff]} disabled={i === archivos.length - 1} onPress={() => setI(i + 1)}>
            <Text style={styles.navTexto}>Siguiente</Text>
            <Ionicons name="chevron-forward" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── PDF, imagen, texto y video dentro de un WebView ─────────────────────────

function VistaWeb({ archivo, tipo, mime, token, origen, onCompartir }: {
  archivo: ArchivoVisor; tipo: 'pdf' | 'imagen' | 'texto' | 'video'; mime: string;
  token: string | null; origen: string; onCompartir: () => void;
}) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [pagina, setPagina] = useState<{ n: number; total: number } | null>(null);

  // La página se carga "desde" el servidor, así el fetch con el token no choca con CORS.
  const html = useMemo(() => construirHtml(tipo, archivo.url, mime, token), [tipo, archivo.url, mime, token]);

  return (
    <View style={{ flex: 1 }}>
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: origen }}
        style={styles.web}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        setBuiltInZoomControls
        setDisplayZoomControls={false}
        onMessage={e => {
          try {
            const m = JSON.parse(e.nativeEvent.data);
            if (m.listo) setCargando(false);
            if (m.error) { setError(m.error); setCargando(false); }
            if (m.total) setPagina({ n: m.pagina || 1, total: m.total });
          } catch { /* mensaje ajeno */ }
        }}
      />
      {cargando && !error && (
        <View style={[StyleSheet.absoluteFill, styles.centro]}>
          <ActivityIndicator color={colors.white} size="large" />
          <Text style={styles.msg}>Cargando…</Text>
        </View>
      )}
      {!!error && (
        <View style={[StyleSheet.absoluteFill, styles.centro, styles.fondoError]}>
          <Ionicons name="alert-circle-outline" size={56} color={colors.gold} />
          <Text style={styles.msg}>{error}</Text>
          <TouchableOpacity style={styles.boton} onPress={onCompartir}>
            <Ionicons name="open-outline" size={18} color={colors.white} />
            <Text style={styles.botonTexto}>Abrir con otra app</Text>
          </TouchableOpacity>
        </View>
      )}
      {tipo === 'pdf' && pagina && !cargando && (
        <View style={styles.pagina} pointerEvents="none">
          <Text style={styles.paginaTexto}>{pagina.n} / {pagina.total}</Text>
        </View>
      )}
    </View>
  );
}

function construirHtml(tipo: string, url: string, mime: string, token: string | null): string {
  const cabeceras = JSON.stringify(token ? { Authorization: `Bearer ${token}` } : {});
  const comun = `
var post = function(m){ window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(m)); };
async function bajar(){
  var r = await fetch(${JSON.stringify(url)}, { headers: ${cabeceras} });
  if (!r.ok) throw new Error(r.status === 403 ? 'No tiene permiso para ver este archivo.' : r.status === 404 ? 'El archivo ya no existe en el servidor.' : 'No se pudo descargar el archivo (' + r.status + ').');
  return r;
}
function fallo(e){ post({ error: (e && e.message) || 'No se pudo abrir el archivo.' }); }`;

  const head = (extra = '') => `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=6,user-scalable=yes">
<style>html,body{margin:0;padding:0;background:#14101a;color:#fff;font-family:sans-serif}${extra}</style>`;

  if (tipo === 'pdf') {
    return `${head(`#hojas{padding:8px 0}.pg{margin:0 auto 10px;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.5);position:relative}.pg canvas{display:block;width:100%;height:100%}`)}
<script src="${PDFJS}/pdf.min.js"></script></head><body><div id="hojas"></div><script>
${comun}
(async function(){
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '${PDFJS}/pdf.worker.min.js';
    var buf = await (await bajar()).arrayBuffer();
    var pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
    var cont = document.getElementById('hojas');
    var ancho = window.innerWidth - 16;
    var calidad = Math.min((window.devicePixelRatio || 1) * 1.5, 4);
    var hojas = [];
    var primera = await pdf.getPage(1);
    var v1 = primera.getViewport({ scale: 1 });
    for (var n = 1; n <= pdf.numPages; n++) {
      var d = document.createElement('div');
      d.className = 'pg'; d.dataset.n = n;
      d.style.width = ancho + 'px'; d.style.height = (ancho * v1.height / v1.width) + 'px';
      cont.appendChild(d); hojas.push(d);
    }
    async function dibujar(d){
      if (d.dataset.ok) return; d.dataset.ok = '1';
      var p = await pdf.getPage(+d.dataset.n);
      var v = p.getViewport({ scale: 1 });
      var esc = ancho / v.width;
      d.style.height = (v.height * esc) + 'px';
      var vp = p.getViewport({ scale: esc * calidad });
      var c = document.createElement('canvas');
      c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
      d.innerHTML = ''; d.appendChild(c);
      await p.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    }
    function liberar(d){ if (!d.dataset.ok) return; delete d.dataset.ok; d.innerHTML = ''; }
    var visibles = {};
    var io = new IntersectionObserver(function(ents){
      ents.forEach(function(e){
        var n = +e.target.dataset.n;
        if (e.isIntersecting) { visibles[n] = 1; dibujar(e.target).catch(function(){}); }
        else { delete visibles[n]; }
      });
      var ns = Object.keys(visibles).map(Number);
      if (ns.length) {
        var actual = Math.min.apply(null, ns);
        post({ pagina: actual, total: pdf.numPages });
        // Libera la memoria de las hojas lejanas
        hojas.forEach(function(h, k){ if (Math.abs(k + 1 - actual) > 4) liberar(h); });
      }
    }, { rootMargin: '600px 0px' });
    hojas.forEach(function(h){ io.observe(h); });
    await dibujar(hojas[0]);
    post({ listo: true, pagina: 1, total: pdf.numPages });
  } catch (e) { fallo(e); }
})();
</script></body></html>`;
  }

  if (tipo === 'imagen') {
    return `${head(`body{display:flex;align-items:center;justify-content:center;min-height:100vh}img{max-width:100vw;max-height:100vh;object-fit:contain;display:block}`)}
</head><body><img id="img" alt=""><script>
${comun}
(async function(){
  try {
    var b = await (await bajar()).blob();
    var img = document.getElementById('img');
    img.onload = function(){ post({ listo: true }); };
    img.onerror = function(){ fallo(new Error('El formato de la imagen no es compatible.')); };
    img.src = URL.createObjectURL(new Blob([b], { type: ${JSON.stringify(mime)} }));
  } catch (e) { fallo(e); }
})();
</script></body></html>`;
  }

  if (tipo === 'video') {
    return `${head(`body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#000}video{width:100vw;max-height:100vh}`)}
</head><body><video id="v" controls playsinline></video><script>
${comun}
(async function(){
  try {
    var b = await (await bajar()).blob();
    var v = document.getElementById('v');
    v.onloadedmetadata = function(){ post({ listo: true }); };
    v.onerror = function(){ fallo(new Error('El formato del video no es compatible.')); };
    v.src = URL.createObjectURL(new Blob([b], { type: ${JSON.stringify(mime)} }));
  } catch (e) { fallo(e); }
})();
</script></body></html>`;
  }

  // texto
  return `${head(`pre{white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.45;padding:12px;margin:0;color:#eee}`)}
</head><body><pre id="t"></pre><script>
${comun}
(async function(){
  try {
    var t = await (await bajar()).text();
    document.getElementById('t').textContent = t.length > 2000000 ? t.slice(0, 2000000) + '\\n…' : t;
    post({ listo: true });
  } catch (e) { fallo(e); }
})();
</script></body></html>`;
}

// ─── Reproductor de audio ────────────────────────────────────────────────────

const VELOCIDADES = [1, 1.25, 1.5, 2, 0.75, 0.5];

function ReproductorArchivo({ archivo, token }: { archivo: ArchivoVisor; token: string | null }) {
  const fuente = useMemo(
    () => ({ uri: archivo.url, headers: token ? { Authorization: `Bearer ${token}` } : undefined }),
    [archivo.url, token]
  );
  const player = useAudioPlayer(fuente, { updateInterval: 250 });
  const st = useAudioPlayerStatus(player);
  const [velocidad, setVelocidad] = useState(1);
  const [repetir, setRepetir] = useState(false);
  const [arrastre, setArrastre] = useState<number | null>(null);
  const anchoBarra = useRef(1);
  const duracionRef = useRef(0);
  duracionRef.current = st.duration || 0;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => {});
  }, []);

  useEffect(() => { player.loop = repetir; }, [player, repetir]);

  // Al terminar (sin repetir) vuelve al inicio, listo para escuchar de nuevo
  useEffect(() => {
    if (st.didJustFinish && !repetir) { player.pause(); player.seekTo(0); }
  }, [st.didJustFinish, repetir, player]);

  const alternar = () => {
    if (st.playing) player.pause();
    else { player.setPlaybackRate(velocidad, 'high'); player.play(); }
  };
  const irA = (seg: number) => player.seekTo(Math.max(0, Math.min(seg, duracionRef.current || seg)));
  const cambiarVelocidad = () => {
    const v = VELOCIDADES[(VELOCIDADES.indexOf(velocidad) + 1) % VELOCIDADES.length];
    setVelocidad(v);
    player.setPlaybackRate(v, 'high');
  };

  // Barra de progreso arrastrable
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: e => setArrastre(Math.max(0, Math.min(1, e.nativeEvent.locationX / anchoBarra.current))),
    onPanResponderMove: e => setArrastre(Math.max(0, Math.min(1, e.nativeEvent.locationX / anchoBarra.current))),
    onPanResponderRelease: e => {
      const p = Math.max(0, Math.min(1, e.nativeEvent.locationX / anchoBarra.current));
      player.seekTo(p * duracionRef.current);
      setArrastre(null);
    },
    onPanResponderTerminate: () => setArrastre(null),
  }), [player]);

  const duracion = st.duration || 0;
  const progreso = arrastre ?? (duracion ? st.currentTime / duracion : 0);
  const cargando = !st.isLoaded;

  return (
    <View style={styles.centro}>
      <View style={[styles.disco, st.playing && styles.discoOn]}>
        <Ionicons name="musical-notes" size={64} color={colors.white} />
      </View>
      <Text style={styles.audioTitulo} numberOfLines={2}>{archivo.nombre}</Text>

      <View style={styles.barra} onLayout={(e: LayoutChangeEvent) => { anchoBarra.current = e.nativeEvent.layout.width || 1; }} {...pan.panHandlers}>
        <View style={styles.barraFondo} pointerEvents="none" />
        <View style={[styles.barraLlena, { width: `${progreso * 100}%` }]} pointerEvents="none" />
        <View style={[styles.perilla, { left: `${progreso * 100}%` }]} pointerEvents="none" />
      </View>
      <View style={styles.tiempos}>
        <Text style={styles.tiempo}>{fmt(arrastre != null ? arrastre * duracion : st.currentTime)}</Text>
        <Text style={styles.tiempo}>{cargando ? 'Cargando…' : fmt(duracion)}</Text>
      </View>

      <View style={styles.controles}>
        <TouchableOpacity style={styles.ctl} onPress={() => irA(st.currentTime - 10)} accessibilityLabel="Atrás 10 segundos">
          <Ionicons name="play-back" size={22} color={colors.white} />
          <Text style={styles.ctlTexto}>10</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.play} onPress={alternar} disabled={cargando} accessibilityLabel={st.playing ? 'Pausar' : 'Reproducir'}>
          {cargando || st.isBuffering && !st.playing
            ? <ActivityIndicator color={colors.primary} />
            : <Ionicons name={st.playing ? 'pause' : 'play'} size={34} color={colors.primary} style={!st.playing && { marginLeft: 4 }} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctl} onPress={() => irA(st.currentTime + 10)} accessibilityLabel="Adelante 10 segundos">
          <Ionicons name="play-forward" size={22} color={colors.white} />
          <Text style={styles.ctlTexto}>10</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.extras}>
        <TouchableOpacity style={[styles.chip, velocidad !== 1 && styles.chipOn]} onPress={cambiarVelocidad}>
          <Ionicons name="speedometer-outline" size={16} color={velocidad !== 1 ? colors.primaryDark : colors.white} />
          <Text style={[styles.chipTexto, velocidad !== 1 && { color: colors.primaryDark }]}>{velocidad}×</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.chip, repetir && styles.chipOn]} onPress={() => setRepetir(r => !r)}>
          <Ionicons name="repeat" size={16} color={repetir ? colors.primaryDark : colors.white} />
          <Text style={[styles.chipTexto, repetir && { color: colors.primaryDark }]}>Repetir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function fmt(s: number) {
  if (!isFinite(s) || s < 0) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colors.primary },
  cuerpo: { flex: 1, backgroundColor: '#14101a' },
  accion: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  web: { flex: 1, backgroundColor: '#14101a' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  fondoError: { backgroundColor: '#14101a' },
  msg: { color: 'rgba(255,255,255,0.85)', fontSize: 15, textAlign: 'center' },
  boton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primaryLight, borderRadius: radius.md, paddingHorizontal: 18, paddingVertical: 12, marginTop: 6 },
  botonTexto: { color: colors.white, fontWeight: '700' },
  pagina: { position: 'absolute', bottom: 12, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5 },
  paginaTexto: { color: colors.white, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pie: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.primaryDark },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.12)' },
  navOff: { opacity: 0.35 },
  navTexto: { color: colors.white, fontWeight: '700' },
  disco: { width: 170, height: 170, borderRadius: 85, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 6, borderColor: colors.blue, marginBottom: 8 },
  discoOn: { borderColor: colors.gold },
  audioTitulo: { color: colors.white, fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  barra: { width: '100%', height: 32, justifyContent: 'center' },
  barraFondo: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)' },
  barraLlena: { position: 'absolute', left: 0, height: 6, borderRadius: 3, backgroundColor: colors.gold },
  perilla: { position: 'absolute', width: 18, height: 18, borderRadius: 9, marginLeft: -9, backgroundColor: colors.white },
  tiempos: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  tiempo: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontVariant: ['tabular-nums'] },
  controles: { flexDirection: 'row', alignItems: 'center', gap: 28, marginTop: 8 },
  ctl: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  ctlTexto: { color: colors.white, fontSize: 10, fontWeight: '700' },
  play: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  extras: { flexDirection: 'row', gap: 10, marginTop: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: colors.gold },
  chipTexto: { color: colors.white, fontWeight: '700', fontSize: 13 },
});
