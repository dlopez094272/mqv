import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import ScreenHeader from '../../components/ScreenHeader';
import { Cargando, MensajeError } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../navigation/Navigator';
import { eliminarCorreo, getCorreo, rutaAdjuntoCorreo } from '../../api/correo';
import { CorreoCompleto } from '../../types';
import { iconoArchivo, tamanoLegible } from '../../utils/archivos';
import { iniciales } from '../../utils/formato';
import { colors, radius } from '../../theme';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function documento(c: CorreoCompleto) {
  const cuerpo = c.html ? c.html : `<pre>${esc(c.texto || '')}</pre>`;
  return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<style>body{font-family:-apple-system,Roboto,sans-serif;font-size:15px;color:#414042;margin:14px;word-wrap:break-word;overflow-wrap:anywhere}
img{max-width:100%!important;height:auto!important}table{max-width:100%!important}pre{white-space:pre-wrap;font-family:inherit;margin:0}
a{color:#53819A}</style></head><body>${cuerpo}</body></html>`;
}

function fechaLarga(f: string) {
  const d = new Date(f);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-GT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Texto citado para responder / reenviar. */
function citado(c: CorreoCompleto) {
  const texto = (c.texto || '').trim().split('\n').map(l => `> ${l}`).join('\n');
  return `\n\n\nEl ${fechaLarga(c.fecha)}, ${c.deNombre || c.de} <${c.de}> escribió:\n${texto}`;
}

export default function CorreoLeerScreen({ uid, carpeta }: { uid: number; carpeta: string }) {
  const { api, baseUrl, token } = useAuth();
  const { navigate, goBack, replace } = useNavigation();
  const insets = useSafeAreaInsets();
  const [correo, setCorreo] = useState<CorreoCompleto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setCorreo(await getCorreo(api, uid, carpeta));
    } catch (err) {
      setError((err as Error).message);
    }
  }, [api, uid, carpeta]);

  useEffect(() => { cargar(); }, [cargar]);

  const eliminar = () => {
    Alert.alert('Eliminar correo', '¿Eliminar este correo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          try { await eliminarCorreo(api, uid, carpeta); goBack(); }
          catch (err) { Alert.alert('Correo', (err as Error).message); }
        },
      },
    ]);
  };

  const adjunto = (a: CorreoCompleto['adjuntos'][number]) => {
    if (!correo) return;
    navigate({
      name: 'visor',
      archivos: correo.adjuntos.map(x => ({ nombre: x.filename, mime: x.contentType, url: `${baseUrl}${rutaAdjuntoCorreo(uid, carpeta, x.filename)}` })),
      indice: Math.max(0, correo.adjuntos.indexOf(a)),
    });
  };

  const responder = () => correo && replace({
    name: 'correoRedactar',
    para: correo.de,
    asunto: /^re:/i.test(correo.asunto) ? correo.asunto : `Re: ${correo.asunto}`,
    cuerpo: citado(correo),
  });

  const reenviar = () => correo && navigate({
    name: 'correoRedactar',
    asunto: /^(fw|rv|fwd):/i.test(correo.asunto) ? correo.asunto : `Rv: ${correo.asunto}`,
    cuerpo: `\n\n---------- Mensaje reenviado ----------\nDe: ${correo.deNombre} <${correo.de}>\nFecha: ${fechaLarga(correo.fecha)}\nAsunto: ${correo.asunto}\nPara: ${correo.para}\n\n${correo.texto || ''}`,
  });

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Correo"
        subtitle={correo?.asunto}
        right={correo ? (
          <TouchableOpacity onPress={eliminar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Eliminar">
            <Ionicons name="trash-outline" size={22} color={colors.white} />
          </TouchableOpacity>
        ) : undefined}
      />
      {!!error && <MensajeError texto={error} onReintentar={cargar} />}
      {!correo && !error && <Cargando texto="Abriendo correo…" />}
      {correo && (
        <>
          <View style={styles.cabecera}>
            <Text style={styles.asunto}>{correo.asunto}</Text>
            <View style={styles.deFila}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{iniciales(correo.deNombre || correo.de)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.de} numberOfLines={1}>{correo.deNombre || correo.de}</Text>
                <Text style={styles.sub} numberOfLines={1}>{correo.de}</Text>
                {!!correo.para && <Text style={styles.sub} numberOfLines={1}>Para: {correo.para}</Text>}
              </View>
              <Text style={styles.fecha}>{fechaLarga(correo.fecha)}</Text>
            </View>
            {correo.adjuntos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 10 }}>
                {correo.adjuntos.map(a => (
                  <TouchableOpacity key={a.filename} style={styles.adjunto} onPress={() => adjunto(a)}>
                    <Ionicons name={iconoArchivo(a.contentType) as any} size={20} color={colors.primary} />
                    <View style={{ maxWidth: 160 }}>
                      <Text style={styles.adjuntoNombre} numberOfLines={1}>{a.filename}</Text>
                      <Text style={styles.sub}>{tamanoLegible(a.size)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
          <WebView
            style={{ flex: 1 }}
            originWhitelist={['*']}
            source={{ html: documento(correo) }}
            setSupportMultipleWindows={false}
            onShouldStartLoadWithRequest={req => {
              if (req.url.startsWith('about:') || req.url.startsWith('data:')) return true;
              Linking.openURL(req.url).catch(() => {});
              return false;
            }}
          />
          <View style={[styles.acciones, { paddingBottom: 10 + insets.bottom }]}>
            <TouchableOpacity style={styles.accion} onPress={responder}>
              <Ionicons name="arrow-undo" size={20} color={colors.primary} />
              <Text style={styles.accionText}>Responder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.accion} onPress={reenviar}>
              <Ionicons name="arrow-redo" size={20} color={colors.primary} />
              <Text style={styles.accionText}>Reenviar</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  cabecera: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  asunto: { fontSize: 19, fontWeight: '800', color: colors.text, marginBottom: 12 },
  deFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontWeight: '800' },
  de: { fontSize: 15, fontWeight: '800', color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted },
  fecha: { fontSize: 11, color: colors.textMuted, maxWidth: 90, textAlign: 'right' },
  adjunto: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  adjuntoNombre: { fontSize: 13, fontWeight: '700', color: colors.text },
  acciones: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  accion: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border },
  accionText: { color: colors.primary, fontWeight: '800', fontSize: 15 },
});
