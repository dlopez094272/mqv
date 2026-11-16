import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ScreenHeader';
import { Cargando, MensajeError, Vacio } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../navigation/Navigator';
import { Tesoreria, getTesorerias, num, quetzales } from '../../api/tesoreria';
import { colors, radius, shadow } from '../../theme';

/** Tesorerías a las que el usuario tiene acceso (responsable o asignado). */
export default function TesoreriasScreen() {
  const { api, usuario } = useAuth();
  const { navigate } = useNavigation();
  const insets = useSafeAreaInsets();
  const [lista, setLista] = useState<Tesoreria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setLista(await getTesorerias(api));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }, [api]);

  useEffect(() => { cargar(); }, [cargar]);

  const activas = lista.filter(t => t.activo);
  const total = activas.reduce((s, t) => s + num(t.saldo), 0);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Tesorería" subtitle={`${lista.length} tesorería(s)`} />
      {!!error && <MensajeError texto={error} onReintentar={cargar} />}
      {cargando ? <Cargando /> : (
        <FlatList
          data={lista}
          keyExtractor={t => String(t.idtesoreria)}
          contentContainerStyle={{ padding: 16, paddingBottom: 30 + insets.bottom, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} colors={[colors.primary]} />}
          ListHeaderComponent={activas.length > 1 ? (
            <View style={styles.total}>
              <Text style={styles.totalLabel}>Saldo total (activas)</Text>
              <Text style={[styles.totalValor, total < 0 && { color: '#FFB4B4' }]}>{quetzales(total)}</Text>
            </View>
          ) : null}
          ListEmptyComponent={<Vacio icono="wallet-outline" titulo="Sin tesorerías" texto="Cuando seas responsable o te asignen a una tesorería, aparecerá aquí." />}
          renderItem={({ item: t }) => {
            const saldo = num(t.saldo);
            const esResp = t.responsable === usuario?.usuario;
            return (
              <TouchableOpacity style={[styles.item, !t.activo && { opacity: 0.6 }]} activeOpacity={0.85}
                                onPress={() => navigate({ name: 'tesoreria', id: t.idtesoreria })}>
                <View style={styles.icono}>
                  <Ionicons name="wallet" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nombre} numberOfLines={2}>{t.nombre}</Text>
                  <View style={styles.fila}>
                    {esResp && <Text style={[styles.tag, styles.tagResp]}>Responsable</Text>}
                    {!t.activo && <Text style={[styles.tag, styles.tagInactiva]}>Inactiva</Text>}
                    {!esResp && !!t.responsable && <Text style={styles.sub} numberOfLines={1}>Resp.: {t.responsable}</Text>}
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.saldo, saldo < 0 && { color: colors.danger }]}>{quetzales(saldo)}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  total: { backgroundColor: colors.primary, borderRadius: radius.xl, padding: 18, marginBottom: 14 },
  totalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700' },
  totalValor: { color: colors.white, fontSize: 28, fontWeight: '800', marginTop: 4, fontVariant: ['tabular-nums'] },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, marginBottom: 10, ...shadow },
  icono: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  nombre: { fontSize: 15, fontWeight: '800', color: colors.text },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  sub: { fontSize: 12, color: colors.textMuted, flexShrink: 1 },
  tag: { fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  tagResp: { backgroundColor: colors.successSoft, color: colors.success },
  tagInactiva: { backgroundColor: colors.dangerSoft, color: colors.danger },
  saldo: { fontSize: 16, fontWeight: '800', color: colors.success, fontVariant: ['tabular-nums'] },
});
