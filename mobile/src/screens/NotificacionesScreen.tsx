import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import ScreenHeader from '../components/ScreenHeader';
import { Cargando, MensajeError, Vacio } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../navigation/Navigator';
import { Notificacion, eliminarNotificacion, listarNotificaciones, marcarLeida, marcarTodasLeidas } from '../api/notificaciones';
import { pantallaDeNotificacion } from '../utils/notificaciones';
import { tiempoRelativo } from '../utils/formato';
import { colors, radius, shadow } from '../theme';

const ICONOS: Record<string, { icono: string; color: string; fondo: string }> = {
  curso:     { icono: 'school', color: colors.blueDark, fondo: colors.blueSoft },
  servicio:  { icono: 'musical-notes', color: colors.primary, fondo: colors.primarySoft },
  tesoreria: { icono: 'wallet', color: colors.success, fondo: colors.successSoft },
  general:   { icono: 'notifications', color: colors.warning, fondo: colors.warningSoft },
};

export default function NotificacionesScreen() {
  const { api } = useAuth();
  const { navigate } = useNavigation();
  const insets = useSafeAreaInsets();
  const [lista, setLista] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [masCargando, setMasCargando] = useState(false);
  const [hayMas, setHayMas] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const r = await listarNotificaciones(api);
      setLista(r.notificaciones);
      setNoLeidas(r.no_leidas);
      setHayMas(r.notificaciones.length >= 40);
      Notifications.setBadgeCountAsync(r.no_leidas).catch(() => {});
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }, [api]);

  useEffect(() => { cargar(); }, [cargar]);

  const cargarMas = async () => {
    if (!hayMas || masCargando || !lista.length) return;
    setMasCargando(true);
    try {
      const r = await listarNotificaciones(api, lista[lista.length - 1].idnotificaciones);
      setLista(prev => [...prev, ...r.notificaciones]);
      setHayMas(r.notificaciones.length >= 40);
    } catch { /* se reintenta al volver a llegar al final */ }
    finally { setMasCargando(false); }
  };

  const abrir = (n: Notificacion) => {
    if (!n.leida) {
      marcarLeida(api, n.idnotificaciones).catch(() => {});
      setLista(prev => prev.map(x => (x.idnotificaciones === n.idnotificaciones ? { ...x, leida: 1 } : x)));
      setNoLeidas(c => Math.max(0, c - 1));
    }
    const destino = pantallaDeNotificacion(n.datos);
    if (destino) navigate(destino);
  };

  const leerTodas = async () => {
    try {
      await marcarTodasLeidas(api);
      setLista(prev => prev.map(x => ({ ...x, leida: 1 })));
      setNoLeidas(0);
      Notifications.setBadgeCountAsync(0).catch(() => {});
    } catch (err) {
      Alert.alert('Notificaciones', (err as Error).message);
    }
  };

  const borrar = (n: Notificacion) => {
    Alert.alert('Eliminar notificación', n.titulo, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          try {
            await eliminarNotificacion(api, n.idnotificaciones);
            setLista(prev => prev.filter(x => x.idnotificaciones !== n.idnotificaciones));
            if (!n.leida) setNoLeidas(c => Math.max(0, c - 1));
          } catch (err) { Alert.alert('Notificaciones', (err as Error).message); }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Notificaciones"
        subtitle={noLeidas ? `${noLeidas} sin leer` : 'Al día'}
        right={noLeidas > 0 ? (
          <TouchableOpacity onPress={leerTodas} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Marcar todas como leídas">
            <Ionicons name="checkmark-done" size={24} color={colors.white} />
          </TouchableOpacity>
        ) : undefined}
      />
      {!!error && <MensajeError texto={error} onReintentar={cargar} />}
      {cargando ? <Cargando /> : (
        <FlatList
          data={lista}
          keyExtractor={n => String(n.idnotificaciones)}
          contentContainerStyle={{ padding: 16, paddingBottom: 30 + insets.bottom, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} colors={[colors.primary]} />}
          onEndReached={cargarMas}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<Vacio icono="notifications-off-outline" titulo="Sin notificaciones" texto="Aquí verás el material nuevo de tus cursos, los servicios donde te asignen y los movimientos de tus tesorerías." />}
          ListFooterComponent={masCargando ? <ActivityIndicator color={colors.primary} style={{ marginTop: 10 }} /> : null}
          renderItem={({ item: n }) => {
            const ic = ICONOS[n.tipo] ?? ICONOS.general;
            return (
              <TouchableOpacity style={[styles.item, !n.leida && styles.itemNueva]} onPress={() => abrir(n)} onLongPress={() => borrar(n)} activeOpacity={0.8}>
                <View style={[styles.icono, { backgroundColor: ic.fondo }]}>
                  <Ionicons name={ic.icono as any} size={20} color={ic.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.titulo, !n.leida && { fontWeight: '800' }]} numberOfLines={2}>{n.titulo}</Text>
                  {!!n.cuerpo && <Text style={styles.cuerpo} numberOfLines={3}>{n.cuerpo}</Text>}
                  <Text style={styles.fecha}>{tiempoRelativo(n.fecha)}</Text>
                </View>
                {!n.leida && <View style={styles.punto} />}
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
  item: { flexDirection: 'row', gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: 12, marginBottom: 8, ...shadow },
  itemNueva: { borderLeftWidth: 4, borderLeftColor: colors.primaryLight },
  icono: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 15, fontWeight: '600', color: colors.text },
  cuerpo: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  fecha: { fontSize: 11, color: colors.textLight, marginTop: 4 },
  punto: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger, marginTop: 4 },
});
