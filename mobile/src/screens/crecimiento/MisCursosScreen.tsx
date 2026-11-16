import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import { MensajeError, Vacio } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../navigation/Navigator';
import { getMisCursos, urlLogoCurso } from '../../api/crecimiento';
import { MiCurso } from '../../types';
import { colors, radius, shadow } from '../../theme';

export default function MisCursosScreen() {
  const { api, baseUrl } = useAuth();
  const { navigate } = useNavigation();
  const insets = useSafeAreaInsets();
  const [cursos, setCursos] = useState<MiCurso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setCursos(await getMisCursos(api));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }, [api]);

  useEffect(() => { cargar(); }, [cargar]);

  const aprobados = cursos.filter(c => c.idevaluacion_aprobada).length;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Mis cursos" subtitle={cursos.length ? `${aprobados} de ${cursos.length} completado(s)` : 'Crecimiento'} />
      {!!error && <MensajeError texto={error} onReintentar={cargar} />}
      <FlatList
        data={cursos}
        keyExtractor={c => String(c.idcursos)}
        contentContainerStyle={{ padding: 16, paddingBottom: 30 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={() => { setCargando(true); cargar(); }} colors={[colors.primary]} />}
        ListEmptyComponent={!cargando ? (
          <Vacio icono="school-outline" titulo="No tienes cursos asignados"
                 texto="Cuando te asignen un curso de crecimiento aparecerá aquí." />
        ) : null}
        renderItem={({ item: c }) => {
          const color = c.color || colors.primary;
          return (
            <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => navigate({ name: 'curso', id: c.idcursos })}>
              <View style={[styles.logo, { backgroundColor: color }]}>
                {c.logo
                  ? <Image source={{ uri: urlLogoCurso(baseUrl, c.logo) }} style={styles.logoImg} resizeMode="contain" />
                  : <Ionicons name="book" size={28} color={colors.white} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.titulo} numberOfLines={2}>{c.nombre}</Text>
                {!!c.descripcion && <Text style={styles.desc} numberOfLines={2}>{c.descripcion}</Text>}
                <View style={[styles.estado, { backgroundColor: c.idevaluacion_aprobada ? colors.successSoft : colors.warningSoft }]}>
                  <Ionicons name={c.idevaluacion_aprobada ? 'trophy' : 'time-outline'} size={13}
                            color={c.idevaluacion_aprobada ? colors.success : colors.warning} />
                  <Text style={[styles.estadoText, { color: c.idevaluacion_aprobada ? colors.success : colors.warning }]}>
                    {c.idevaluacion_aprobada ? 'Completado · certificado disponible' : 'En curso'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: 12, marginBottom: 10, ...shadow },
  logo: { width: 60, height: 60, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  logoImg: { width: 44, height: 44, tintColor: colors.white },
  titulo: { fontSize: 16, fontWeight: '800', color: colors.text },
  desc: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 6 },
  estadoText: { fontSize: 12, fontWeight: '700' },
});
