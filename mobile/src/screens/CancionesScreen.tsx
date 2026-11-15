import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import { MensajeError, Vacio } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../navigation/Navigator';
import { ETIQUETA_TIPO, getCanciones } from '../api/alabanza';
import { CancionResumen, TipoCancion } from '../types';
import { normalizar } from '../utils/formato';
import { colors, radius, shadow } from '../theme';

type Filtro = '' | TipoCancion | 'audio';

const FILTROS: { clave: Filtro; texto: string }[] = [
  { clave: '', texto: 'Todas' },
  { clave: 'cancion', texto: 'Canciones' },
  { clave: 'himno', texto: 'Himnos' },
  { clave: 'coro', texto: 'Coros' },
  { clave: 'audio', texto: '🎧 Con pistas' },
];

export default function CancionesScreen() {
  const { api } = useAuth();
  const { navigate } = useNavigation();
  const insets = useSafeAreaInsets();
  const [canciones, setCanciones] = useState<CancionResumen[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setCanciones((await getCanciones(api)).filter(c => c.activo));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }, [api]);

  useEffect(() => { cargar(); }, [cargar]);

  const filtradas = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return canciones.filter(c =>
      (!filtro || (filtro === 'audio' ? c.total_audios > 0 : c.tipo === filtro)) &&
      (!q || normalizar(`${c.titulo} ${c.autor} ${c.categoria} ${c.etiquetas}`).includes(q)));
  }, [canciones, busqueda, filtro]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Biblioteca" subtitle={`${canciones.length} canciones, himnos y coros`} />
      <View style={styles.buscador}>
        <View style={styles.inputRow}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar por título, autor o etiqueta"
            placeholderTextColor={colors.textLight}
            autoCorrect={false}
          />
          {!!busqueda && (
            <TouchableOpacity onPress={() => setBusqueda('')}><Ionicons name="close-circle" size={18} color={colors.textLight} /></TouchableOpacity>
          )}
        </View>
        <FlatList
          horizontal
          data={FILTROS}
          keyExtractor={f => f.clave || 'todas'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingTop: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.chip, filtro === item.clave && styles.chipOn]} onPress={() => setFiltro(item.clave)}>
              <Text style={[styles.chipText, filtro === item.clave && styles.chipTextOn]}>{item.texto}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
      {!!error && <MensajeError texto={error} onReintentar={cargar} />}
      <FlatList
        data={filtradas}
        keyExtractor={c => String(c.idcanciones)}
        contentContainerStyle={{ padding: 16, paddingBottom: 30 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={() => { setCargando(true); cargar(); }} colors={[colors.primary]} />}
        ListEmptyComponent={!cargando ? <Vacio icono="musical-notes-outline" titulo="Sin resultados" texto="Prueba con otra búsqueda." /> : null}
        renderItem={({ item: c }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.85}
                            onPress={() => navigate({ name: 'cancion', id: c.idcanciones, titulo: c.titulo })}>
            <View style={styles.tonoCaja}>
              <Text style={styles.tono}>{c.tonalidad || '—'}</Text>
              {!!c.bpm && <Text style={styles.bpm}>{c.bpm}</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.titulo} numberOfLines={1}>{c.titulo}</Text>
              <Text style={styles.autor} numberOfLines={1}>{ETIQUETA_TIPO[c.tipo]} · {c.autor || 'Autor desconocido'}</Text>
              <View style={styles.recursos}>
                {!!c.tiene_acordes && <Text style={styles.recurso}>🎸 Acordes</Text>}
                {!!(c.tiene_partitura || c.total_partituras) && <Text style={styles.recurso}>🎼 Partitura</Text>}
                {c.total_audios > 0 && <Text style={styles.recurso}>🎧 {c.total_audios}</Text>}
                {!!c.youtube_url && <Text style={styles.recurso}>▶️</Text>}
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
  buscador: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.white, borderRadius: radius.md, paddingHorizontal: 12 },
  input: { flex: 1, paddingVertical: 10, fontSize: 15, color: colors.text },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.14)' },
  chipOn: { backgroundColor: colors.white },
  chipText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  chipTextOn: { color: colors.primary },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: 12, marginBottom: 8, ...shadow },
  tonoCaja: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  tono: { fontSize: 18, fontWeight: '800', color: colors.primary },
  bpm: { fontSize: 10, color: colors.textMuted, fontWeight: '700' },
  titulo: { fontSize: 16, fontWeight: '800', color: colors.text },
  autor: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  recursos: { flexDirection: 'row', gap: 8, marginTop: 4 },
  recurso: { fontSize: 11, color: colors.blue, fontWeight: '700' },
});
