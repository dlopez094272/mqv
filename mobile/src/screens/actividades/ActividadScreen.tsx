import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, RefreshControl, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import { Cargando, MensajeError, Tarjeta, TituloSeccion } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../navigation/Navigator';
import { adjuntosDe, eliminarActividad, getActividad, rutaAdjuntoActividad, urlLogoActividad } from '../../api/actividades';
import { Actividad } from '../../types';
import { iconoArchivo, tamanoLegible } from '../../utils/archivos';
import { esVisualizable } from '../../utils/visor';
import { cuandoEs, fechaLarga } from '../../utils/formato';
import { horario } from './ActividadesScreen';
import { colors, radius, shadow } from '../../theme';

export default function ActividadScreen({ id }: { id: number }) {
  const { api, baseUrl, puede } = useAuth();
  const { navigate, goBack } = useNavigation();
  const insets = useSafeAreaInsets();
  const [act, setAct] = useState<Actividad | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setAct(await getActividad(api, id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }, [api, id]);

  useEffect(() => { cargar(); }, [cargar]);

  const eliminar = () => {
    if (!act) return;
    Alert.alert('Eliminar actividad', `¿Eliminar "${act.nombre}"? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          try {
            await eliminarActividad(api, act.idactividades);
            goBack();
          } catch (err) {
            Alert.alert('Eliminar', (err as Error).message);
          }
        },
      },
    ]);
  };

  const compartir = () => {
    if (!act) return;
    const fi = act.fecha_inicio.slice(0, 10), ff = (act.fecha_fin || fi).slice(0, 10);
    const lineas = [
      `📅 *${act.nombre}*`,
      `${fechaLarga(fi)}${ff !== fi ? ` al ${fechaLarga(ff)}` : ''} · ${horario(act)}`,
      act.lugar ? `📍 ${act.lugar}` : '',
      act.descripcion ? `\n${act.descripcion}` : '',
    ].filter(Boolean);
    Share.share({ message: lineas.join('\n') });
  };

  const adjunto = (filename: string) => {
    const lista = act ? adjuntosDe(act) : [];
    navigate({
      name: 'visor',
      archivos: lista.map(x => ({ nombre: x.originalname || x.filename, mime: x.mimetype, url: `${baseUrl}${rutaAdjuntoActividad(x.filename)}` })),
      indice: Math.max(0, lista.findIndex(x => x.filename === filename)),
    });
  };

  const acciones = act ? [
    { titulo: 'Programa', icono: 'musical-notes-outline', visible: true, onPress: () => navigate({ name: 'servicio', id: act.idactividades }) },
    { titulo: 'Asistencia', icono: 'people-outline', visible: puede('actividades_asistentes', 'S'), onPress: () => navigate({ name: 'asistencia', id: act.idactividades, nombre: act.nombre }) },
    { titulo: 'Editar', icono: 'create-outline', visible: puede('actividades', 'E'), onPress: () => navigate({ name: 'actividadForm', id: act.idactividades }) },
    { titulo: 'Compartir', icono: 'share-social-outline', visible: true, onPress: compartir },
  ].filter(a => a.visible) : [];

  const color = act?.categoria_color || colors.primary;
  const fi = act?.fecha_inicio.slice(0, 10) ?? '';
  const ff = (act?.fecha_fin || fi).slice(0, 10);
  const adjuntos = act ? adjuntosDe(act) : [];

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={act?.nombre || 'Actividad'}
        subtitle={act?.categoria || 'Actividades'}
        right={act && puede('actividades', 'D') ? (
          <TouchableOpacity onPress={eliminar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Eliminar">
            <Ionicons name="trash-outline" size={22} color={colors.white} />
          </TouchableOpacity>
        ) : undefined}
      />
      {!!error && <MensajeError texto={error} onReintentar={cargar} />}
      {cargando && !act ? <Cargando /> : act && (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 30 + insets.bottom }}
          refreshControl={<RefreshControl refreshing={cargando} onRefresh={() => { setCargando(true); cargar(); }} colors={[colors.primary]} />}
        >
          <View style={styles.hero}>
            <View style={[styles.heroBanda, { backgroundColor: color }]} />
            <View style={styles.heroFila}>
              {act.logo
                ? <Image source={{ uri: urlLogoActividad(baseUrl, act.logo) }} style={styles.logo} />
                : <View style={[styles.logo, { backgroundColor: color, alignItems: 'center', justifyContent: 'center' }]}><Ionicons name="calendar" size={30} color={colors.white} /></View>}
              <View style={{ flex: 1 }}>
                <Text style={styles.titulo}>{act.nombre}</Text>
                {!!act.categoria && (
                  <View style={[styles.chip, { backgroundColor: color + '22' }]}>
                    <View style={[styles.punto, { backgroundColor: color }]} />
                    <Text style={[styles.chipText, { color }]}>{act.categoria}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.dato}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={styles.datoText}>
                {cuandoEs(fi)} · {fechaLarga(fi)}{ff !== fi ? ` → ${fechaLarga(ff)}` : ''}
              </Text>
            </View>
            <View style={styles.dato}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              <Text style={styles.datoText}>{horario(act)}</Text>
            </View>
            {!!act.lugar && (
              <View style={styles.dato}>
                <Ionicons name="location-outline" size={18} color={colors.primary} />
                <Text style={styles.datoText}>{act.lugar}</Text>
              </View>
            )}
          </View>

          <View style={styles.acciones}>
            {acciones.map(a => (
              <TouchableOpacity key={a.titulo} style={styles.accion} onPress={a.onPress} activeOpacity={0.8}>
                <View style={styles.accionIcono}><Ionicons name={a.icono as any} size={24} color={colors.primary} /></View>
                <Text style={styles.accionText}>{a.titulo}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!!act.descripcion && (
            <>
              <TituloSeccion>Descripción</TituloSeccion>
              <Tarjeta><Text style={styles.desc}>{act.descripcion}</Text></Tarjeta>
            </>
          )}

          {adjuntos.length > 0 && (
            <>
              <TituloSeccion>{`Archivos adjuntos (${adjuntos.length})`}</TituloSeccion>
              {adjuntos.map(a => (
                <TouchableOpacity key={a.filename} style={styles.archivo}
                                  onPress={() => adjunto(a.filename)}>
                  <Ionicons name={iconoArchivo(a.mimetype) as any} size={22} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.archivoNombre} numberOfLines={2}>{a.originalname}</Text>
                    <Text style={styles.archivoSub}>{tamanoLegible(a.size)}</Text>
                  </View>
                  <Ionicons name={esVisualizable(a.originalname, a.mimetype) ? 'eye-outline' : 'open-outline'} size={20} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </>
          )}

          {!!act.usuario && <Text style={styles.creado}>Registrada por {act.usuario}</Text>}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: { backgroundColor: colors.card, borderRadius: radius.xl, padding: 16, paddingTop: 20, overflow: 'hidden', ...shadow },
  heroBanda: { position: 'absolute', top: 0, left: 0, right: 0, height: 6 },
  heroFila: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  logo: { width: 64, height: 64, borderRadius: 16, backgroundColor: colors.bg },
  titulo: { fontSize: 20, fontWeight: '800', color: colors.text },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 6 },
  punto: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 12, fontWeight: '800' },
  dato: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.border },
  datoText: { flex: 1, fontSize: 15, color: colors.text, textTransform: 'capitalize' },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  accion: { flexGrow: 1, flexBasis: '22%', backgroundColor: colors.card, borderRadius: radius.lg, paddingVertical: 12, alignItems: 'center', ...shadow },
  accionIcono: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  accionText: { fontSize: 12, fontWeight: '800', color: colors.text },
  desc: { fontSize: 15, color: colors.text, lineHeight: 22 },
  archivo: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: radius.md, padding: 12, marginBottom: 8, ...shadow },
  archivoNombre: { fontSize: 14, fontWeight: '700', color: colors.text },
  archivoSub: { fontSize: 12, color: colors.textMuted },
  creado: { textAlign: 'center', color: colors.textLight, fontSize: 12, marginTop: 20 },
});
