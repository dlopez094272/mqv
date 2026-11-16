import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { ApiError, request } from '../api/client';
import { resolveApiBaseUrl } from '../config';
import { autenticarBiometria, biometriaRechazada } from '../utils/biometria';
import { colors, radius, shadow } from '../theme';

type Modo = 'login' | 'olvide';

/** `listo`: la intro ya terminó (la huella no se pide encima de la animación). */
export default function LoginScreen({ listo = true }: { listo?: boolean }) {
  const { login, loginConBiometria, server, ultimoUsuario, biometria, bioActiva, setBioActiva, avisoSesion } = useAuth();
  const [modo, setModo] = useState<Modo>('login');
  const [usuario, setUsuario] = useState(ultimoUsuario ?? '');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [servidor, setServidor] = useState(server);
  const [verServidor, setVerServidor] = useState(false);
  const [error, setError] = useState<string | null>(avisoSesion);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usarPassword, setUsarPassword] = useState(!bioActiva);
  const passwordRef = useRef<TextInput>(null);
  const intentoAutomatico = useRef(false);

  const iconoBio = biometria.esRostro ? 'scan-outline' : 'finger-print';

  async function ingresarConBiometria() {
    setError(null);
    setLoading(true);
    try {
      await loginConBiometria();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión');
      setUsarPassword(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (listo && bioActiva && !intentoAutomatico.current) {
      intentoAutomatico.current = true;
      ingresarConBiometria();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, bioActiva]);

  function ofrecerBiometria(cod: string, pass: string) {
    Alert.alert(
      `¿Ingresar con tu ${biometria.nombre}?`,
      `La próxima vez podrás entrar solo con tu ${biometria.nombre}, sin escribir la contraseña. ` +
        'Si prefieres no usarla, no te lo volveremos a preguntar (puedes activarla luego en tu perfil).',
      [
        { text: 'No, gracias', style: 'cancel', onPress: () => setBioActiva(false, { codigo: cod, password: '' }) },
        {
          text: 'Activar',
          onPress: async () => {
            if (await autenticarBiometria(`Confirma tu ${biometria.nombre} para activarla`)) {
              await setBioActiva(true, { codigo: cod, password: pass });
            }
          },
        },
      ]
    );
  }

  async function handleLogin() {
    const u = usuario.trim();
    if (!u || !password) return setError('Ingresa tu usuario y contraseña');
    setError(null);
    setLoading(true);
    try {
      await login(u, password, servidor);
      if (biometria.disponible && !bioActiva && !(await biometriaRechazada(u))) ofrecerBiometria(u, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al iniciar sesión');
      setLoading(false);
    }
  }

  async function handleOlvide() {
    const id = usuario.trim();
    if (!id) return setError('Escribe tu usuario o correo electrónico');
    setError(null);
    setLoading(true);
    try {
      const r = await request<{ message: string }>(resolveApiBaseUrl(servidor), '/auth/forgot-password', {
        method: 'POST',
        body: { identificador: id },
      });
      setMensaje(r.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo enviar el correo');
    } finally {
      setLoading(false);
    }
  }

  function cambiarModo(m: Modo) {
    setModo(m);
    setError(null);
    setMensaje(null);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={styles.header}>
          <Paloma size={30} style={{ left: 24, top: 30 }} retraso={0} />
          <Paloma size={40} style={{ right: 28, top: 50 }} retraso={900} espejo />
          <Paloma size={22} style={{ left: '60%', bottom: 58 }} retraso={1700} espejo />
          <Image source={require('../../assets/logo-blanco.png')} style={styles.logo} resizeMode="contain" />
        </View>

        <View style={styles.card}>
          <Text style={styles.bienvenida}>{modo === 'login' ? '¡Bienvenido!' : 'Recuperar contraseña'}</Text>
          <Text style={styles.sub}>
            {modo === 'login' ? 'Ingresa con tu usuario del sistema MQV' : 'Te enviaremos un enlace a tu correo para crear una nueva'}
          </Text>

          {!!error && (
            <View style={styles.error}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          {!!mensaje && (
            <View style={styles.ok}>
              <Ionicons name="mail-outline" size={18} color={colors.success} />
              <Text style={styles.okText}>{mensaje}</Text>
            </View>
          )}

          {modo === 'olvide' ? (
            <>
              <Text style={styles.label}>Usuario o correo</Text>
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={19} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Tu usuario o correo electrónico"
                  placeholderTextColor={colors.textLight}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={usuario}
                  onChangeText={setUsuario}
                  onSubmitEditing={handleOlvide}
                />
              </View>
              <TouchableOpacity style={styles.button} onPress={handleOlvide} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Enviar enlace</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => cambiarModo('login')} style={[styles.link, { alignSelf: 'center' }]}>
                <Text style={styles.linkText}>Volver a ingresar</Text>
              </TouchableOpacity>
            </>
          ) : bioActiva && !usarPassword ? (
            <View style={styles.bioBox}>
              <TouchableOpacity style={styles.bioBtn} onPress={ingresarConBiometria} disabled={loading} activeOpacity={0.8}>
                {loading ? <ActivityIndicator color={colors.white} size="large" /> : <Ionicons name={iconoBio} size={48} color={colors.white} />}
              </TouchableOpacity>
              <Text style={styles.bioText}>{loading ? 'Ingresando...' : `Toca para ingresar con tu ${biometria.nombre}`}</Text>
              {!!ultimoUsuario && <Text style={styles.bioUsuario}>Usuario: {ultimoUsuario}</Text>}
              <TouchableOpacity onPress={() => setUsarPassword(true)} style={styles.link}>
                <Text style={styles.linkText}>Usar contraseña</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.label}>Usuario</Text>
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={19} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Usuario o correo"
                  placeholderTextColor={colors.textLight}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  value={usuario}
                  onChangeText={setUsuario}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>

              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={19} color={colors.textMuted} />
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  placeholder="Contraseña"
                  placeholderTextColor={colors.textLight}
                  secureTextEntry={!verPassword}
                  returnKeyType="go"
                  value={password}
                  onChangeText={setPassword}
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setVerPassword(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={verPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Ingresar</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => cambiarModo('olvide')} style={[styles.link, { alignSelf: 'center' }]}>
                <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>

              {bioActiva && (
                <TouchableOpacity style={styles.bioLink} onPress={() => { setUsarPassword(false); ingresarConBiometria(); }}>
                  <Ionicons name={iconoBio} size={20} color={colors.primary} />
                  <Text style={styles.linkText}>Ingresar con {biometria.nombre}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <TouchableOpacity style={styles.servidorToggle} onPress={() => setVerServidor(v => !v)}>
          <Ionicons name="server-outline" size={14} color={colors.textMuted} />
          <Text style={styles.servidorText}>Servidor: {servidor}</Text>
        </TouchableOpacity>
        {verServidor && (
          <View style={styles.servidorBox}>
            <TextInput
              style={styles.servidorInput}
              value={servidor}
              onChangeText={setServidor}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="admin.iglesiamqv.org"
              placeholderTextColor={colors.textLight}
            />
            <Text style={styles.servidorHint}>Dominio del sistema MQV, o IP:puerto para pruebas en la red local.</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, paddingBottom: 32 },
  header: {
    height: 260,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
    paddingBottom: 30,
  },
  paloma: { position: 'absolute' },
  logo: { width: 240, height: 240 * (432 / 799) },
  card: { backgroundColor: colors.white, marginHorizontal: 20, marginTop: -34, borderRadius: radius.xl, padding: 22, ...shadow, shadowOpacity: 0.14 },
  bienvenida: { fontSize: 24, fontWeight: '800', color: colors.primary },
  sub: { fontSize: 14, color: colors.textMuted, marginTop: 2, marginBottom: 8 },
  label: { color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg,
    borderRadius: radius.md, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border,
  },
  input: { flex: 1, color: colors.text, paddingVertical: 13, fontSize: 16 },
  button: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: 22 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  error: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.dangerSoft, padding: 10, borderRadius: radius.sm, marginTop: 10 },
  errorText: { color: colors.danger, flex: 1, fontSize: 13 },
  ok: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.successSoft, padding: 10, borderRadius: radius.sm, marginTop: 10 },
  okText: { color: colors.success, flex: 1, fontSize: 13 },
  bioBox: { alignItems: 'center', paddingVertical: 18 },
  bioBtn: { width: 104, height: 104, borderRadius: 52, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow, shadowOpacity: 0.3 },
  bioText: { marginTop: 16, fontSize: 15, color: colors.text, fontWeight: '600' },
  bioUsuario: { marginTop: 4, fontSize: 13, color: colors.textMuted },
  link: { marginTop: 16, padding: 6 },
  linkText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  bioLink: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 8, padding: 6 },
  servidorToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 22 },
  servidorText: { color: colors.textMuted, fontSize: 12 },
  servidorBox: { marginHorizontal: 20, marginTop: 10 },
  servidorInput: {
    backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: colors.text,
  },
  servidorHint: { color: colors.textLight, fontSize: 12, marginTop: 6 },
});

/** Paloma del Espíritu Santo que "flota" suavemente sobre el encabezado. */
function Paloma({ size, style, retraso, espejo }: { size: number; style: object; retraso: number; espejo?: boolean }) {
  const vuelo = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.delay(retraso),
      Animated.timing(vuelo, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(vuelo, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [vuelo, retraso]);
  const translateY = vuelo.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const rotate = vuelo.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] });
  return (
    <Animated.View style={[styles.paloma, style, { transform: [{ translateY }, { rotate }, { scaleX: espejo ? -1 : 1 }] }]}>
      <FontAwesome5 name="dove" size={size} color="rgba(255,255,255,0.22)" solid />
    </Animated.View>
  );
}
