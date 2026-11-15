import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Linking, RefreshControl, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import { Cargando, MensajeError, Tarjeta, TituloSeccion } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../navigation/Navigator';
import { getPrograma } from '../api/alabanza';
import { olvidarRepertorio } from './CancionScreen';
import { ElementoPrograma, ProgramaServicio } from '../types';
import { cuandoEs, fechaLarga, iniciales } from '../utils/formato';
import { colors, radius, shadow } from '../theme';

const ICONOS: Record<string, string> = {
  'Bienvenida': '👋', 'Oración': '🙏', 'Alabanza y adoración': '🎵', 'Lectura bíblica': '📖',
  'Diezmos y ofrendas': '💝', 'Anuncios': '📢', 'Predicación': '🎤', 'Santa Cena': '🍞',
  'Llamado / Ministración': '🤲', 'Bendición final': '✨',
};

const aMin = (h: string) => { const [a, b] = h.split(':').map(Number); return a * 60 + (b || 0); };
const deMin = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export default function ServicioScreen({ id }: { id: number }) {
  const { api, baseUrl } = useAuth();
  const { navigate } = useNavigation();
  const insets = useSafeAreaInsets();
  const [datos, setDatos] = useState<ProgramaServicio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setDatos(await getPrograma(api, id));
      olvidarRepertorio(id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }, [api, id]);

  useEffect(() => { cargar(); }, [cargar]);

  /** Hora de cada elemento: la fija o la estimada sumando duraciones desde el inicio. */
  const horas = useMemo(() => {
    if (!datos) return [];
    let min: number | null = datos.actividad.hora_inicio ? aMin(datos.actividad.hora_inicio) : null;
    return datos.programa.map(it => {
      if (it.hora) min = aMin(it.hora);
      const h = min === null ? null : deMin(min);
      if (min !== null) min += Number(it.duracion_min) || 0;
      return h;
    });
  }, [datos]);

  const canciones = datos?.programa.filter(p => p.tipo === 'cancion') ?? [];

  function abrir(it: ElementoPrograma) {
    if (it.tipo === 'cancion' && it.idcanciones) {
      navigate({
        name: 'cancion', id: it.idcanciones, tono: it.tonalidad, titulo: it.cancion_titulo ?? undefined,
        servicio: id, pos: canciones.indexOf(it),
      });
    }
  }

  async function compartir() {
    if (!datos) return;
    const a = datos.actividad;
    const lineas = datos.programa.map((it, i) =>
      `${horas[i] ? horas[i] + '  ' : ''}${it.tipo === 'cancion' ? `🎵 ${it.cancion_titulo}${it.tonalidad ? ` (${it.tonalidad})` : ''}` : it.titulo}${it.responsable ? ` – ${it.responsable}` : ''}`);
    const equipo = datos.musicos.map(m => `• ${m.instrumento || '—'}: ${m.nombre}`);
    await Share.share({
      message: `*${a.nombre}*\n${fechaLarga(a.fecha_inicio)}${a.hora_inicio ? ' · ' + a.hora_inicio : ''}${a.lugar ? ' · ' + a.lugar : ''}\n\n${lineas.join('\n')}${equipo.length ? `\n\n*Equipo*\n${equipo.join('\n')}` : ''}`,
    });
  }

  if (cargando && !datos) return (<View style={styles.container}><ScreenHeader title="Programa" /><Cargando texto="Cargando programa…" /></View>);

  const a = datos?.actividad;
  return (
    <View style={styles.container}>
      <ScreenHeader
        title={a?.nombre ?? 'Programa'}
        subtitle={a ? `${cuandoEs(a.fecha_inicio)} · ${fechaLarga(a.fecha_inicio)}` : undefined}
        right={datos ? (
          <TouchableOpacity onPress={compartir} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Compartir">
            <Ionicons name="share-social-outline" size={24} color={colors.white} />
          </TouchableOpacity>
        ) : undefined}
      />
      {!!error && <MensajeError texto={error} onReintentar={cargar} />}
      {datos && a && (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 30 + insets.bottom }}
          refreshControl={<RefreshControl refreshing={cargando} onRefresh={() => { setCargando(true); cargar(); }} colors={[colors.primary]} />}
        >
          <Tarjeta style={styles.info}>
            <View style={styles.infoFila}><Ionicons name="calendar-outline" size={18} color={colors.primary} /><Text style={styles.infoText}>{fechaLarga(a.fecha_inicio)}{a.hora_inicio ? ` · ${a.hora_inicio}${a.hora_fin ? ' – ' + a.hora_fin : ''}` : ''}</Text></View>
            {!!a.lugar && <View style={styles.infoFila}><Ionicons name="location-outline" size={18} color={colors.primary} /><Text style={styles.infoText}>{a.lugar}</Text></View>}
            {!!a.descripcion && <Text style={styles.desc}>{a.descripcion}</Text>}
          </Tarjeta>

          {canciones.length > 0 && (
            <TouchableOpacity style={styles.ensayar} activeOpacity={0.88} onPress={() => abrir(canciones[0])}>
              <Ionicons name="play-circle" size={30} color={colors.white} />
              <View style={{ flex: 1 }}>
                <Text style={styles.ensayarTit}>Ensayar el repertorio</Text>
                <Text style={styles.ensayarSub}>{canciones.length} canción(es) · los acordes ya vienen en el tono del día</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.white} />
            </TouchableOpacity>
          )}

          <TituloSeccion>Programa</TituloSeccion>
          {datos.programa.length === 0 && <Text style={styles.vacio}>El programa todavía no se ha armado.</Text>}
          <View style={styles.timeline}>
            {datos.programa.map((it, i) => {
              const esCancion = it.tipo === 'cancion';
              return (
                <TouchableOpacity key={it.idprograma} activeOpacity={esCancion ? 0.8 : 1} onPress={() => abrir(it)} style={styles.paso}>
                  <View style={styles.pasoIzq}>
                    <Text style={styles.hora}>{horas[i] ?? ''}</Text>
                    <View style={[styles.punto, esCancion && { backgroundColor: colors.blueLight }]} />
                    {i < datos.programa.length - 1 && <View style={styles.linea} />}
                  </View>
                  <View style={[styles.pasoCard, esCancion && styles.pasoCancion]}>
                    {esCancion ? (
                      <>
                        <View style={styles.cancionFila}>
                          <Text style={styles.pasoTitulo} numberOfLines={2}>🎵 {it.cancion_titulo ?? '(canción eliminada)'}</Text>
                          {!!it.tonalidad && (
                            <View style={[styles.tono, it.tonalidad !== it.cancion_tonalidad && { backgroundColor: colors.warning }]}>
                              <Text style={styles.tonoText}>{it.tonalidad}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.pasoSub}>
                          {[it.cancion_autor, it.cancion_bpm ? `${it.cancion_bpm} BPM` : null, it.total_audios ? `🎧 ${it.total_audios}` : null, it.responsable ? `🎤 ${it.responsable}` : null].filter(Boolean).join(' · ')}
                        </Text>
                        {!!it.notas && <Text style={styles.nota}>📝 {it.notas}</Text>}
                        <Text style={styles.abrirText}>Toca para ver acordes y pistas ›</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.pasoTitulo}>{ICONOS[it.titulo ?? ''] ?? '📌'} {it.titulo}</Text>
                        {(!!it.responsable || !!it.duracion_min) && (
                          <Text style={styles.pasoSub}>{[it.responsable ? `👤 ${it.responsable}` : null, it.duracion_min ? `⏱ ${it.duracion_min} min` : null].filter(Boolean).join(' · ')}</Text>
                        )}
                        {!!it.notas && <Text style={styles.nota}>{it.notas}</Text>}
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {datos.musicos.length > 0 && (
            <>
              <TituloSeccion>Equipo de alabanza</TituloSeccion>
              <Tarjeta style={{ paddingVertical: 6 }}>
                {datos.musicos.map(m => (
                  <View key={m.idactividades_musicos} style={styles.musico}>
                    <View style={styles.avatar}>
                      {m.foto ? <Image source={{ uri: `${baseUrl}/uploads/personas/${m.foto}` }} style={styles.avatarImg} />
                              : <Text style={styles.avatarText}>{iniciales(m.nombre)}</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.musicoNombre}>{m.nombre}</Text>
                      <Text style={styles.musicoInst}>{m.instrumento || 'Sin instrumento'}</Text>
                    </View>
                    {!!m.celular && (
                      <TouchableOpacity onPress={() => Linking.openURL(`https://wa.me/${m.celular!.replace(/\D/g, '').replace(/^(\d{8})$/, '502$1')}`)}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="logo-whatsapp" size={22} color={colors.success} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </Tarjeta>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  info: { gap: 6 },
  infoFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 14, color: colors.text, textTransform: 'capitalize', flex: 1 },
  desc: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  ensayar: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.blue, borderRadius: radius.lg, padding: 14, marginTop: 12, ...shadow },
  ensayarTit: { color: colors.white, fontWeight: '800', fontSize: 16 },
  ensayarSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  vacio: { color: colors.textMuted, fontStyle: 'italic', textAlign: 'center', padding: 20 },
  timeline: {},
  paso: { flexDirection: 'row', minHeight: 64 },
  pasoIzq: { width: 58, alignItems: 'center' },
  hora: { fontSize: 12, fontWeight: '800', color: colors.primary, height: 18, fontVariant: ['tabular-nums'] },
  punto: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primaryLight, marginTop: 4 },
  linea: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 2 },
  pasoCard: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: 12, marginBottom: 10, ...shadow, shadowOpacity: 0.06 },
  pasoCancion: { backgroundColor: '#F7FBFD', borderLeftWidth: 4, borderLeftColor: colors.blueLight },
  cancionFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pasoTitulo: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.text },
  pasoSub: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  nota: { fontSize: 13, color: colors.text, marginTop: 6, fontStyle: 'italic' },
  abrirText: { fontSize: 12, color: colors.blue, fontWeight: '700', marginTop: 6 },
  tono: { backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  tonoText: { color: colors.white, fontWeight: '800', fontSize: 14 },
  musico: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.bg },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 40, height: 40 },
  avatarText: { color: colors.white, fontWeight: '800' },
  musicoNombre: { fontSize: 15, fontWeight: '700', color: colors.text, textTransform: 'capitalize' },
  musicoInst: { fontSize: 12, color: colors.textMuted },
});
