import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import { MensajeError, Vacio } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../navigation/Navigator';
import { getMisServicios } from '../api/alabanza';
import { Servicio } from '../types';
import { cuandoEs, fechaLarga } from '../utils/formato';
import { colors, radius, shadow } from '../theme';

export default function ServiciosScreen() {
  const { api } = useAuth();
  const { navigate } = useNavigation();
  const insets = useSafeAreaInsets();
  const [pasadas, setPasadas] = useState(false);
  const [lista, setLista] = useState<Servicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setLista(await getMisServicios(api, pasadas));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }, [api, pasadas]);

  useEffect(() => { setCargando(true); cargar(); }, [cargar]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Mis servicios" subtitle="Programas donde participas" />
      <View style={styles.tabs}>
        {[false, true].map(p => (
          <TouchableOpacity key={String(p)} style={[styles.tab, pasadas === p && styles.tabOn]} onPress={() => setPasadas(p)}>
            <Text style={[styles.tabText, pasadas === p && styles.tabTextOn]}>{p ? 'Anteriores' : 'Próximos'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {!!error && <MensajeError texto={error} onReintentar={cargar} />}
      <FlatList
        data={lista}
        keyExtractor={s => String(s.idactividades)}
        contentContainerStyle={{ padding: 16, paddingBottom: 30 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={() => { setCargando(true); cargar(); }} colors={[colors.primary]} />}
        ListEmptyComponent={!cargando ? (
          <Vacio icono="calendar-outline" titulo={pasadas ? 'Sin servicios anteriores' : 'Sin servicios próximos'}
                 texto="Aquí aparecen las actividades donde estás en el equipo de alabanza." />
        ) : null}
        renderItem={({ item: s }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => navigate({ name: 'servicio', id: s.idactividades })}>
            <View style={[styles.fecha, { backgroundColor: s.categoria_color || colors.primary }]}>
              <Text style={styles.dia}>{Number(s.fecha_inicio.slice(8, 10))}</Text>
              <Text style={styles.mes}>{fechaLarga(s.fecha_inicio).split(' ')[2]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.titulo} numberOfLines={2}>{s.nombre}</Text>
              <Text style={styles.sub}>
                {cuandoEs(s.fecha_inicio)} · {fechaLarga(s.fecha_inicio).split(' ')[0]}{s.hora_inicio ? ` · ${s.hora_inicio}` : ''}
              </Text>
              <View style={styles.chips}>
                {!!s.es_musico && (
                  <View style={[styles.chip, { backgroundColor: colors.blueSoft }]}>
                    <Ionicons name="musical-note" size={12} color={colors.blueDark} />
                    <Text style={[styles.chipText, { color: colors.blueDark }]}>{s.mi_instrumento || 'En el equipo'}</Text>
                  </View>
                )}
                <View style={styles.chip}>
                  <Text style={styles.chipText}>🎵 {s.total_canciones}</Text>
                </View>
                {!!s.lugar && <View style={styles.chip}><Text style={styles.chipText}>📍 {s.lugar}</Text></View>}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  tabs: { flexDirection: 'row', backgroundColor: colors.primary, paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center' },
  tabOn: { backgroundColor: colors.white },
  tabText: { color: colors.white, fontWeight: '700' },
  tabTextOn: { color: colors.primary },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: 12, marginBottom: 10, ...shadow },
  fecha: { width: 54, height: 60, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  dia: { color: colors.white, fontSize: 22, fontWeight: '800', lineHeight: 24 },
  mes: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  titulo: { fontSize: 16, fontWeight: '800', color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
});
