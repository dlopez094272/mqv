import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import ScreenHeader from '../../components/ScreenHeader';
import { Boton, Cargando, MensajeError, Tarjeta, TituloSeccion } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../navigation/Navigator';
import { getCertificado, getMiCurso, rutaArchivoCurso, rutaVideoCurso, urlLogoCurso } from '../../api/crecimiento';
import { CursoDetalle } from '../../types';
import { descargarYCompartir, iconoArchivo, tamanoLegible } from '../../utils/archivos';
import { esVisualizable } from '../../utils/visor';
import { descargarCertificado } from '../../utils/certificado';
import { colors, radius, shadow } from '../../theme';

const htmlVideo = (src: string) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1" />
<style>html,body{margin:0;height:100%;background:#000}video{width:100%;height:100%;object-fit:contain}</style></head>
<body><video src="${src.replace(/"/g, '&quot;')}" controls playsinline preload="metadata"></video></body></html>`;

export default function CursoScreen({ id }: { id: number }) {
  const { api, baseUrl, filesUrl, token, urlConToken } = useAuth();
  const { navigate } = useNavigation();
  const insets = useSafeAreaInsets();
  const [curso, setCurso] = useState<CursoDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abiertos, setAbiertos] = useState<Set<number>>(new Set());
  const [descargando, setDescargando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const c = await getMiCurso(api, id);
      setCurso(c);
      // El primer bloque abierto para empezar
      setAbiertos(prev => (prev.size || !c.contenido.length ? prev : new Set([c.contenido[0].idcontenido])));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }, [api, id]);

  useEffect(() => { cargar(); }, [cargar]);

  const toggle = (idc: number) => setAbiertos(prev => {
    const s = new Set(prev);
    if (s.has(idc)) s.delete(idc); else s.add(idc);
    return s;
  });

  const certificado = async () => {
    if (!curso) return;
    setDescargando('certificado');
    try {
      const d = await getCertificado(api, curso.idcursos);
      await descargarCertificado(d, filesUrl, d.curso_logo ? urlLogoCurso(baseUrl, d.curso_logo) : null);
    } catch (err) {
      Alert.alert('Certificado', (err as Error).message);
    } finally {
      setDescargando(null);
    }
  };

  const archivo = (lista: { filename: string; nombre_original: string; mimetype: string }[], filename: string) => {
    navigate({
      name: 'visor',
      archivos: lista.map(x => ({ nombre: x.nombre_original || x.filename, mime: x.mimetype, url: `${baseUrl}${rutaArchivoCurso(x.filename)}` })),
      indice: Math.max(0, lista.findIndex(x => x.filename === filename)),
    });
  };

  if (cargando && !curso) {
    return <View style={styles.container}><ScreenHeader title="Curso" /><Cargando texto="Cargando curso…" /></View>;
  }

  const color = curso?.color || colors.primary;

  return (
    <View style={styles.container}>
      <ScreenHeader title={curso?.nombre || 'Curso'} subtitle="Mis cursos" />
      {!!error && <MensajeError texto={error} onReintentar={cargar} />}
      {curso && (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 30 + insets.bottom }}
          refreshControl={<RefreshControl refreshing={cargando} onRefresh={() => { setCargando(true); cargar(); }} colors={[colors.primary]} />}
        >
          <View style={[styles.hero, { backgroundColor: color }]}>
            <View style={styles.heroLogo}>
              {curso.logo
                ? <Image source={{ uri: urlLogoCurso(baseUrl, curso.logo) }} style={styles.heroLogoImg} resizeMode="contain" />
                : <Ionicons name="book" size={34} color={colors.white} />}
            </View>
            <Text style={styles.heroTitulo}>{curso.nombre}</Text>
            {!!curso.descripcion && <Text style={styles.heroDesc}>{curso.descripcion}</Text>}
            <View style={styles.heroStats}>
              <Text style={styles.heroStat}>📚 {curso.contenido.length} bloque(s)</Text>
              {curso.total_preguntas > 0 && <Text style={styles.heroStat}>❓ {curso.total_preguntas} pregunta(s)</Text>}
            </View>
            {!!curso.evaluacion_aprobada && (
              <View style={styles.badge}>
                <Ionicons name="trophy" size={15} color={colors.gold} />
                <Text style={styles.badgeText}>Completado con {Number(curso.evaluacion_aprobada.puntaje)}%</Text>
              </View>
            )}
          </View>

          {curso.evaluacion_aprobada ? (
            <Boton titulo="Descargar certificado (PDF)" icono="ribbon-outline" variante="exito"
                   cargando={descargando === 'certificado'} onPress={certificado} style={{ marginTop: 14 }} />
          ) : curso.total_preguntas > 0 ? (
            <Tarjeta style={{ marginTop: 14 }}>
              <Text style={styles.evalTitulo}>¿Listo para la evaluación?</Text>
              <Text style={styles.evalTexto}>
                Responde {curso.total_preguntas} pregunta(s). Necesitas al menos 80 % para aprobar y obtener tu certificado.
              </Text>
              <Boton titulo="Tomar evaluación" icono="create-outline" style={{ marginTop: 12 }}
                     onPress={() => navigate({ name: 'evaluacion', id: curso.idcursos, nombre: curso.nombre, color: curso.color, logo: curso.logo })} />
            </Tarjeta>
          ) : null}

          <TituloSeccion>Contenido del curso</TituloSeccion>
          {!curso.contenido.length && <Text style={styles.vacio}>Este curso aún no tiene contenido.</Text>}
          {curso.contenido.map((b, i) => {
            const abierto = abiertos.has(b.idcontenido);
            return (
              <View key={b.idcontenido} style={styles.bloque}>
                <TouchableOpacity style={styles.bloqueHeader} onPress={() => toggle(b.idcontenido)} activeOpacity={0.8}>
                  <View style={[styles.bloqueNum, { backgroundColor: color }]}><Text style={styles.bloqueNumText}>{i + 1}</Text></View>
                  <Text style={styles.bloqueTitulo}>{b.titulo}</Text>
                  {!!b.video_filename && <Ionicons name="videocam" size={16} color={colors.textMuted} />}
                  {b.archivos.length > 0 && <Ionicons name="attach" size={16} color={colors.textMuted} />}
                  <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
                </TouchableOpacity>
                {abierto && (
                  <View style={styles.bloqueBody}>
                    {!!b.descripcion && <Text style={styles.bloqueDesc}>{b.descripcion}</Text>}
                    {!!b.video_filename && (
                      <View style={styles.video}>
                        <WebView
                          source={{ html: htmlVideo(urlConToken(rutaVideoCurso(b.video_filename))), baseUrl: filesUrl }}
                          allowsFullscreenVideo
                          allowsInlineMediaPlayback
                          mediaPlaybackRequiresUserAction
                          style={{ backgroundColor: '#000' }}
                        />
                      </View>
                    )}
                    {b.archivos.map(a => (
                      <TouchableOpacity key={a.idarchivo} style={styles.archivo} onPress={() => archivo(b.archivos, a.filename)}>
                        <Ionicons name={iconoArchivo(a.mimetype) as any} size={22} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.archivoNombre} numberOfLines={2}>{a.nombre_original}</Text>
                          <Text style={styles.archivoSub}>{tamanoLegible(a.tamanio)}</Text>
                        </View>
                        <Ionicons name={esVisualizable(a.nombre_original, a.mimetype) ? 'eye-outline' : 'open-outline'} size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                    ))}
                    {!b.descripcion && !b.video_filename && !b.archivos.length && <Text style={styles.vacio}>Sin contenido en este bloque.</Text>}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: { borderRadius: radius.xl, padding: 18, alignItems: 'center', ...shadow },
  heroLogo: { width: 66, height: 66, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  heroLogoImg: { width: 48, height: 48, tintColor: colors.white },
  heroTitulo: { color: colors.white, fontSize: 21, fontWeight: '800', textAlign: 'center' },
  heroDesc: { color: 'rgba(255,255,255,0.88)', fontSize: 14, textAlign: 'center', marginTop: 6 },
  heroStats: { flexDirection: 'row', gap: 14, marginTop: 10 },
  heroStat: { color: colors.white, fontSize: 13, fontWeight: '700' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.22)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginTop: 12 },
  badgeText: { color: colors.white, fontWeight: '800' },
  evalTitulo: { fontSize: 16, fontWeight: '800', color: colors.text },
  evalTexto: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  vacio: { color: colors.textMuted, fontStyle: 'italic', paddingVertical: 6 },
  bloque: { backgroundColor: colors.card, borderRadius: radius.lg, marginBottom: 10, overflow: 'hidden', ...shadow },
  bloqueHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  bloqueNum: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  bloqueNumText: { color: colors.white, fontWeight: '800' },
  bloqueTitulo: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  bloqueBody: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  bloqueDesc: { fontSize: 15, color: colors.text, lineHeight: 22 },
  video: { height: 210, borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#000' },
  archivo: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg, borderRadius: radius.md, padding: 12 },
  archivoNombre: { fontSize: 14, fontWeight: '700', color: colors.text },
  archivoSub: { fontSize: 12, color: colors.textMuted },
});
