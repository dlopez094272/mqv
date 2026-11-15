import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../theme';

interface Props {
  /** URL (con token) del archivo .musicxml / .mxl */
  url: string;
  /** Origen del servidor: la página se carga "desde" ahí para poder descargar el archivo sin CORS. */
  origen: string;
}

/**
 * Partitura MusicXML / MXL (exportada de MuseScore, Finale, Sibelius...)
 * dibujada con OpenSheetMusicDisplay dentro de un WebView.
 */
export default function PartituraMusicXml({ url, origen }: Props) {
  const [alto, setAlto] = useState(320);
  const [cargando, setCargando] = useState(true);

  const html = useMemo(() => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=3">
<style>body{margin:0;padding:4px;background:#fff;font-family:sans-serif}#err{color:#B45309;font-size:13px;padding:8px}</style>
<script src="https://cdn.jsdelivr.net/npm/opensheetmusicdisplay@1.9.9/build/opensheetmusicdisplay.min.js"></script>
</head><body><div id="papel"></div><div id="err"></div>
<script>
(async function(){
  var post = function(m){ window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(m)); };
  try {
    var r = await fetch(${JSON.stringify(url)});
    if (!r.ok) throw new Error('No se pudo descargar (' + r.status + ')');
    var osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay('papel', { autoResize: true, drawTitle: true, backend: 'svg' });
    osmd.zoom = 0.7;
    await osmd.load(await r.blob());
    osmd.render();
  } catch (e) { document.getElementById('err').textContent = 'No se pudo dibujar la partitura: ' + e.message; }
  post({ listo: true, alto: document.body.scrollHeight });
  window.addEventListener('resize', function(){ post({ alto: document.body.scrollHeight }); });
})();
</script></body></html>`, [url]);

  return (
    <View style={[styles.caja, { height: alto }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: origen }}
        onMessage={e => {
          try {
            const m = JSON.parse(e.nativeEvent.data);
            if (m.alto) setAlto(Math.min(Math.max(160, m.alto + 12), 6000));
            if (m.listo) setCargando(false);
          } catch { /* mensaje ajeno */ }
        }}
        scrollEnabled={false}
        style={styles.web}
      />
      {cargando && <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.primary} />}
    </View>
  );
}

const styles = StyleSheet.create({
  caja: { borderRadius: 12, overflow: 'hidden', backgroundColor: colors.white, marginTop: 10 },
  web: { backgroundColor: 'transparent' },
});
