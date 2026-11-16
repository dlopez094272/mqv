import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import BottomSheet from '../../components/BottomSheet';
import { Campo } from '../../components/Formulario';
import { Boton, Cargando, MensajeError, Tarjeta, Vacio } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../navigation/Navigator';
import {
  eliminarCredenciales, getBandeja, getCarpetas, getCredenciales, guardarCredenciales, iconoCarpeta, nombreCarpeta, ordenCarpeta,
} from '../../api/correo';
import { CarpetaCorreo, CorreoResumen } from '../../types';
import { iniciales } from '../../utils/formato';
import { colors, radius, shadow } from '../../theme';

const LIMITE = 25;
// Se recuerda la carpeta al volver de leer un correo.
let ultimaCarpeta = 'INBOX';

function fechaCorta(f: string) {
  const d = new Date(f);
  if (Number.isNaN(d.getTime())) return '';
  const hoy = new Date();
  if (d.toDateString() === hoy.toDateString()) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d.getDate()} ${meses[d.getMonth()]}${d.getFullYear() !== hoy.getFullYear() ? ` ${d.getFullYear()}` : ''}`;
}

export default function CorreoScreen() {
  const { api } = useAuth();
  const { navigate } = useNavigation();
  const insets = useSafeAreaInsets();

  const [cuenta, setCuenta] = useState<string | null>(null);
  const [configurado, setConfigurado] = useState<boolean | null>(null);
  const [carpetas, setCarpetas] = useState<CarpetaCorreo[]>([]);
  const [carpeta, setCarpeta] = useState(ultimaCarpeta);
  const [correos, setCorreos] = useState<CorreoResumen[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [masCargando, setMasCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ajustes, setAjustes] = useState(false);

  // Formulario de configuración
  const [formCuenta, setFormCuenta] = useState('');
  const [formPass, setFormPass] = useState('');
  const [conectando, setConectando] = useState(false);
  const peticion = useRef(0);

  const cargarBandeja = useCallback(async (c: string) => {
    const n = ++peticion.current;
    setError(null);
    setCargando(true);
    try {
      const r = await getBandeja(api, c, 1, LIMITE);
      if (n !== peticion.current) return;
      setCorreos(r.correos);
      setTotal(r.total);
      setPagina(1);
    } catch (err) {
      if (n === peticion.current) setError((err as Error).message);
    } finally {
      if (n === peticion.current) setCargando(false);
    }
  }, [api]);

  const iniciar = useCallback(async () => {
    setError(null);
    setCargando(true);
    try {
      const cred = await getCredenciales(api);
      setConfigurado(cred.configurado);
      setCuenta(cred.cuenta ?? null);
      if (!cred.configurado) { setCargando(false); return; }
      getCarpetas(api)
        .then(r => setCarpetas([...r.carpetas].sort((a, b) => ordenCarpeta(a) - ordenCarpeta(b))))
        .catch(() => setCarpetas([{ path: 'INBOX', name: 'INBOX' }]));
      await cargarBandeja(ultimaCarpeta);
    } catch (err) {
      setError((err as Error).message);
      setCargando(false);
    }
  }, [api, cargarBandeja]);

  useEffect(() => { iniciar(); }, [iniciar]);

  const cambiarCarpeta = (c: string) => {
    if (c === carpeta) return;
    ultimaCarpeta = c;
    setCarpeta(c);
    setCorreos([]);
    cargarBandeja(c);
  };

  const cargarMas = async () => {
    if (masCargando || cargando || correos.length >= total) return;
    setMasCargando(true);
    try {
      const r = await getBandeja(api, carpeta, pagina + 1, LIMITE);
      setCorreos(prev => {
        const vistos = new Set(prev.map(m => m.uid));
        return [...prev, ...r.correos.filter(m => !vistos.has(m.uid))];
      });
      setPagina(p => p + 1);
    } catch {
      // se puede reintentar al volver a desplazar
    } finally {
      setMasCargando(false);
    }
  };

  const conectar = async () => {
    if (!formCuenta.trim() || !formPass) { Alert.alert('Correo', 'Escribe tu cuenta y contraseña.'); return; }
    setConectando(true);
    try {
      await guardarCredenciales(api, formCuenta.trim(), formPass);
      setFormPass('');
      await iniciar();
    } catch (err) {
      Alert.alert('No se pudo conectar', (err as Error).message);
    } finally {
      setConectando(false);
    }
  };

  const desconectar = () => {
    Alert.alert('Desconectar correo', 'Se quitará tu cuenta de correo de MQV (también en la web). ¿Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desconectar', style: 'destructive', onPress: async () => {
          try {
            await eliminarCredenciales(api);
            setAjustes(false);
            setCorreos([]);
            setConfigurado(false);
          } catch (err) {
            Alert.alert('Correo', (err as Error).message);
          }
        },
      },
    ]);
  };

  if (configurado === null && cargando) {
    return <View style={styles.container}><ScreenHeader title="Correo" /><Cargando texto="Conectando…" /></View>;
  }

  if (configurado === false) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Correo" subtitle="Configura tu cuenta" />
        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          <Tarjeta>
            <View style={styles.setupIcono}><Ionicons name="mail" size={34} color={colors.primary} /></View>
            <Text style={styles.setupTitulo}>Conecta tu correo de la iglesia</Text>
            <Text style={styles.setupTexto}>Usa tu cuenta @iglesiamqv.org. Es la misma configuración que en la web.</Text>
            <Campo etiqueta="Cuenta de correo" icono="at" value={formCuenta} onChangeText={setFormCuenta}
                   autoCapitalize="none" keyboardType="email-address" placeholder="nombre@iglesiamqv.org" />
            <Campo etiqueta="Contraseña del correo" icono="lock-closed-outline" value={formPass} onChangeText={setFormPass} secureTextEntry />
            <Boton titulo="Conectar" icono="log-in-outline" cargando={conectando} onPress={conectar} style={{ marginTop: 18 }} />
          </Tarjeta>
          {!!error && <MensajeError texto={error} onReintentar={iniciar} />}
        </ScrollView>
      </View>
    );
  }

  const actual = carpetas.find(c => c.path === carpeta);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={actual ? nombreCarpeta(actual) : carpeta === 'INBOX' ? 'Recibidos' : carpeta}
        subtitle={cuenta ?? 'Correo'}
        right={
          <TouchableOpacity onPress={() => setAjustes(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Ajustes de correo">
            <Ionicons name="settings-outline" size={22} color={colors.white} />
          </TouchableOpacity>
        }
      />
      {carpetas.length > 1 && (
        <View style={styles.carpetasWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carpetas}>
            {carpetas.map(c => (
              <TouchableOpacity key={c.path} style={[styles.carpeta, c.path === carpeta && styles.carpetaOn]} onPress={() => cambiarCarpeta(c.path)}>
                <Ionicons name={iconoCarpeta(c) as any} size={15} color={c.path === carpeta ? colors.primary : colors.white} />
                <Text style={[styles.carpetaText, c.path === carpeta && { color: colors.primary }]}>{nombreCarpeta(c)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      {!!error && <MensajeError texto={error} onReintentar={() => cargarBandeja(carpeta)} />}
      <FlatList
        data={correos}
        keyExtractor={m => String(m.uid)}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={() => cargarBandeja(carpeta)} colors={[colors.primary]} />}
        onEndReached={cargarMas}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={!cargando ? <Vacio icono="mail-open-outline" titulo="No hay correos en esta carpeta" /> : null}
        ListFooterComponent={masCargando ? <ActivityIndicator color={colors.primary} style={{ margin: 16 }} /> : null}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item: m }) => (
          <TouchableOpacity style={styles.correo} activeOpacity={0.7}
                            onPress={() => { setCorreos(prev => prev.map(x => (x.uid === m.uid ? { ...x, leido: true } : x))); navigate({ name: 'correoLeer', uid: m.uid, carpeta }); }}>
            <View style={[styles.avatar, !m.leido && { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, !m.leido && { color: colors.white }]}>{iniciales(m.deNombre || m.de)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.correoFila}>
                <Text style={[styles.de, !m.leido && styles.noLeido]} numberOfLines={1}>{m.deNombre || m.de}</Text>
                <Text style={[styles.fecha, !m.leido && { color: colors.primary, fontWeight: '800' }]}>{fechaCorta(m.fecha)}</Text>
              </View>
              <Text style={[styles.asunto, !m.leido && styles.noLeido]} numberOfLines={2}>{m.asunto}</Text>
            </View>
            {!m.leido && <View style={styles.puntoNoLeido} />}
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={[styles.fab, { bottom: 24 + insets.bottom }]} activeOpacity={0.85} onPress={() => navigate({ name: 'correoRedactar' })}>
        <Ionicons name="create" size={20} color={colors.white} />
        <Text style={styles.fabText}>Redactar</Text>
      </TouchableOpacity>

      <BottomSheet visible={ajustes} onClose={() => setAjustes(false)} title="Cuenta de correo">
        <View style={styles.cuentaFila}>
          <Ionicons name="mail-outline" size={22} color={colors.primary} />
          <Text style={styles.cuentaText}>{cuenta}</Text>
        </View>
        <Text style={styles.setupTexto}>{total} correo(s) en esta carpeta.</Text>
        <Boton titulo="Desconectar cuenta" variante="peligro" icono="log-out-outline" onPress={desconectar} style={{ marginTop: 16 }} />
        <Boton titulo="Cerrar" variante="secundario" onPress={() => setAjustes(false)} style={{ marginTop: 10 }} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  setupIcono: { alignSelf: 'center', width: 70, height: 70, borderRadius: 35, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  setupTitulo: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  setupTexto: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  carpetasWrap: { backgroundColor: colors.primary, paddingBottom: 10 },
  carpetas: { paddingHorizontal: 16, gap: 8 },
  carpeta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.14)' },
  carpetaOn: { backgroundColor: colors.white },
  carpetaText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  sep: { height: 1, backgroundColor: colors.border, marginLeft: 70 },
  correo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.card },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '800' },
  correoFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  de: { flex: 1, fontSize: 15, color: colors.text },
  fecha: { fontSize: 12, color: colors.textMuted },
  asunto: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  noLeido: { fontWeight: '800', color: colors.text },
  puntoNoLeido: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.blueLight },
  fab: { position: 'absolute', right: 20, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 28, paddingHorizontal: 18, paddingVertical: 14, ...shadow, shadowOpacity: 0.3, elevation: 6 },
  fabText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  cuentaFila: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: 14 },
  cuentaText: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
});
