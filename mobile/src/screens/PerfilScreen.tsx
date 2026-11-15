import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import ScreenHeader from '../components/ScreenHeader';
import BottomSheet from '../components/BottomSheet';
import { Boton, Tarjeta, TituloSeccion } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../navigation/Navigator';
import { ApiError } from '../api/client';
import { autenticarBiometria } from '../utils/biometria';
import { iniciales } from '../utils/formato';
import { colors, radius } from '../theme';

export default function PerfilScreen() {
  const { usuario, server, biometria, bioActiva, setBioActiva, login, logout } = useAuth();
  const { navigate } = useNavigation();
  const insets = useSafeAreaInsets();

  const [pidiendoPassword, setPidiendoPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cambiarBiometria(activar: boolean) {
    if (!activar) return setBioActiva(false);
    setPassword('');
    setError(null);
    setPidiendoPassword(true);
  }

  async function confirmarActivacion() {
    if (!usuario || !password) return;
    setVerificando(true);
    setError(null);
    try {
      await login(usuario.usuario, password);
      if (!(await autenticarBiometria(`Confirma tu ${biometria.nombre} para activarla`))) {
        setError(`No se confirmó la ${biometria.nombre}.`);
        return;
      }
      await setBioActiva(true, { codigo: usuario.usuario, password });
      setPidiendoPassword(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo verificar la contraseña');
    } finally {
      setVerificando(false);
    }
  }

  function confirmarSalida() {
    Alert.alert('Cerrar sesión', '¿Deseas salir de la app?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ]);
  }

  const opcion = (icono: string, titulo: string, texto: string, onPress: () => void) => (
    <TouchableOpacity style={styles.fila} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.filaIcono}><Ionicons name={icono as any} size={20} color={colors.primary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.filaTitulo}>{titulo}</Text>
        <Text style={styles.filaTexto}>{texto}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Mi perfil" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 + insets.bottom }}>
        <Tarjeta style={styles.perfil}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{iniciales(usuario?.nombre)}</Text></View>
          <Text style={styles.nombre}>{usuario?.nombre}</Text>
          <Text style={styles.dato}>@{usuario?.usuario}</Text>
        </Tarjeta>

        <TituloSeccion>Cuenta</TituloSeccion>
        <Tarjeta style={{ paddingVertical: 4 }}>
          {opcion('person-circle-outline', 'Mis datos', 'Teléfono, correo, dirección y foto', () => navigate({ name: 'misDatos' }))}
          <View style={styles.sep} />
          {opcion('key-outline', 'Cambiar contraseña', 'Actualiza tu contraseña de acceso', () => navigate({ name: 'cambiarPassword' }))}
        </Tarjeta>

        <TituloSeccion>Seguridad</TituloSeccion>
        <Tarjeta>
          <View style={styles.fila}>
            <View style={styles.filaIcono}><Ionicons name={biometria.esRostro ? 'scan-outline' : 'finger-print'} size={20} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.filaTitulo}>Ingresar con {biometria.nombre}</Text>
              <Text style={styles.filaTexto}>
                {biometria.disponible ? 'Entra sin escribir tu contraseña.' : 'Registra una huella o rostro en los ajustes del teléfono para usarlo.'}
              </Text>
            </View>
            <Switch
              value={bioActiva}
              disabled={!biometria.disponible}
              onValueChange={cambiarBiometria}
              trackColor={{ true: colors.primaryLight, false: colors.border }}
              thumbColor={bioActiva ? colors.primary : '#f4f3f4'}
            />
          </View>
        </Tarjeta>

        <TituloSeccion>Aplicación</TituloSeccion>
        <Tarjeta>
          <Text style={styles.filaTexto}>Servidor: {server}</Text>
          <Text style={styles.filaTexto}>Versión: {Constants.expoConfig?.version ?? '1.0.0'}</Text>
        </Tarjeta>

        <Boton titulo="Cerrar sesión" icono="log-out-outline" variante="peligro" onPress={confirmarSalida} style={{ marginTop: 24 }} />
      </ScrollView>

      <BottomSheet visible={pidiendoPassword} onClose={() => setPidiendoPassword(false)} title={`Activar ${biometria.nombre}`} bloqueado={verificando}>
        <Text style={styles.filaTexto}>Confirma tu contraseña; se guardará cifrada en este teléfono.</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoFocus
          placeholder="Contraseña"
          placeholderTextColor={colors.textLight}
          onSubmitEditing={confirmarActivacion}
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Boton titulo="Activar" icono="finger-print" onPress={confirmarActivacion} cargando={verificando} deshabilitado={!password} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  perfil: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: colors.white, fontSize: 28, fontWeight: '800' },
  nombre: { fontSize: 19, fontWeight: '800', color: colors.text, textAlign: 'center' },
  dato: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  filaIcono: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  filaTitulo: { fontSize: 15, fontWeight: '700', color: colors.text },
  filaTexto: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  sep: { height: 1, backgroundColor: colors.bg },
  input: {
    backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text, marginVertical: 14,
  },
  error: { color: colors.danger, marginBottom: 10 },
});
