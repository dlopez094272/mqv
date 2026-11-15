import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../theme';

interface Props {
  abc: string;
  semitonos?: number;
}

/**
 * Partitura interactiva: abcjs dibuja la notación ABC, la reproduce con su
 * sintetizador y resalta la nota que suena. Corre dentro de un WebView
 * (abcjs se descarga del CDN la primera vez; luego queda en la caché).
 */
export default function Partitura({ abc, semitonos = 0 }: Props) {
  const [alto, setAlto] = useState(260);
  const [cargando, setCargando] = useState(true);

  const html = useMemo(() => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/abcjs@6.4.4/abcjs-audio.css">
<style>
  body{margin:0;padding:6px;font-family:sans-serif;background:#fff}
  .abcjs-highlight{fill:#C62828!important}
  #controles{margin-top:8px}
  .abcjs-inline-audio{border-radius:10px;background:${colors.primary}}
  #err{color:#B45309;font-size:13px}
</style>
<script src="https://cdn.jsdelivr.net/npm/abcjs@6.4.4/dist/abcjs-basic-min.js"></script>
</head><body>
<div id="papel"></div><div id="controles"></div><div id="err"></div>
<script>
(function(){
  var post = function(m){ window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(m)); };
  try {
    var abc = ${JSON.stringify(abc)};
    var visual = ABCJS.renderAbc('papel', abc, { responsive:'resize', add_classes:true, visualTranspose:${semitonos}, paddingleft:4, paddingright:4 });
    if (ABCJS.synth.supportsAudio()) {
      var papel = document.getElementById('papel');
      var cursor = {
        onEvent: function(ev){
          papel.querySelectorAll('.abcjs-highlight').forEach(function(e){ e.classList.remove('abcjs-highlight'); });
          (ev.elements||[]).forEach(function(g){ (g||[]).forEach(function(e){ e.classList.add('abcjs-highlight'); }); });
        },
        onFinished: function(){ papel.querySelectorAll('.abcjs-highlight').forEach(function(e){ e.classList.remove('abcjs-highlight'); }); }
      };
      var synth = new ABCJS.synth.SynthController();
      synth.load('#controles', cursor, { displayLoop:true, displayRestart:true, displayPlay:true, displayProgress:true, displayWarp:true });
      synth.setTune(visual[0], false);
    }
  } catch(e) { document.getElementById('err').textContent = 'No se pudo dibujar la partitura: ' + e.message; }
  setTimeout(function(){ post({ alto: document.body.scrollHeight }); }, 400);
  window.addEventListener('resize', function(){ post({ alto: document.body.scrollHeight }); });
})();
</script></body></html>`, [abc, semitonos]);

  return (
    <View style={[styles.caja, { height: alto }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        onLoadEnd={() => setCargando(false)}
        onMessage={e => {
          try {
            const m = JSON.parse(e.nativeEvent.data);
            if (m.alto) setAlto(Math.min(Math.max(160, m.alto + 12), 2000));
          } catch { /* mensaje ajeno */ }
        }}
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={false}
        style={styles.web}
      />
      {cargando && <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.primary} />}
    </View>
  );
}

const styles = StyleSheet.create({
  caja: { borderRadius: 12, overflow: 'hidden', backgroundColor: colors.white },
  web: { backgroundColor: 'transparent' },
});
