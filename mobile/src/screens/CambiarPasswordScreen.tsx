import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import { Boton, Tarjeta } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../navigation/Navigator';
import { ApiError } from '../api/client';
import { cambiarPassword } from '../api/alabanza';
import { colors, radius } from '../theme';

/** Fortaleza simple: largo, mayúsculas, números y símbolos. */
function fortaleza(p: string) {
  let n = 0;
  if (p.length >= 8) n++;
  if (p.length >= 12) n++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) n++;
  if (/\d/.test(p)) n++;
  if (/[^A-Za-z0-9]/.test(p)) n++;
  return Math.min(4, n);
}
const NIVELES = [
  { texto: 'Muy débil', color: colors.danger },
  { texto: 'Débil', color: '#EF6C00' },
  { texto: 'Aceptable', color: '#F9A825' },
  { texto: 'Buena', color: colors.success },
  { texto: 'Excelente', color: colors.success },
];

/**
 * Cambio de contraseña. `obligatorio`: primer ingreso, no se puede salir sin
 * cambiarla (solo cerrar sesión).
 */
export default function CambiarPasswordScreen({ obligatorio = false }: { obligatorio?: boolean }) {
  const { api, passwordCambiada, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const navegacion = useNavigation();
  const nav = obligatorio ? null : navegacion;

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirma, setConfirma] = useState('');
  const [ver, setVer] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const nuevaRef = useRef<TextInput>(null);
  const confirmaRef = useRef<TextInput>(null);

  const nivel = fortaleza(nueva);

  async function guardar() {
    setError(null);
    if (!actual) return setError('Escribe tu contraseña actual');
    if (nueva.length < 8) return setError('La nueva contraseña debe tener al menos 8 caracteres');
    if (nueva !== confirma) return setError('Las contraseñas no coinciden');
    if (nueva === actual) return setError('La nueva contraseña debe ser distinta a la actual');
    setGuardando(true);
    try {
      await cambiarPassword(api, actual, nueva);
      await passwordCambiada(nueva);
      setListo(true);
      if (nav) setTimeout(() => nav.goBack(), 1400);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cambiar la contraseña');
    } finally {
      setGuardando(false);
    }
  }

  const campo = (
    etiqueta: string,
    valor: string,
    set: (v: string) => void,
    opciones: { ref?: React.RefObject<TextInput | null>; siguiente?: () => void; final?: boolean } = {}
  ) => (
    <>
      <Text style={styles.label}>{etiqueta}</Text>
      <View style={styles.inputRow}>
        <Ionicons name="lock-closed-outline" size={19} color={colors.textMuted} />
        <TextInput
          ref={opciones.ref}
          style={styles.input}
          value={valor}
          onChangeText={set}
          secureTextEntry={!ver}
          autoCapitalize="none"
          returnKeyType={opciones.final ? 'go' : 'next'}
          onSubmitEditing={opciones.final ? guardar : opciones.siguiente}
          placeholderTextColor={colors.textLight}
        />
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={obligatorio ? 'Crea tu contraseña' : 'Cambiar contraseña'}
        onBack={obligatorio ? undefined : nav?.goBack}
        right={obligatorio ? (
          <TouchableOpacity onPress={logout}><Text style={styles.salir}>Salir</Text></TouchableOpacity>
        ) : undefined}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 + insets.bottom }} keyboardShouldPersistTaps="handled">
          {obligatorio && (
            <View style={styles.aviso}>
              <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
              <Text style={styles.avisoText}>
                Es tu primer ingreso. Por seguridad, cambia la contraseña que te dieron por una que solo tú conozcas.
              </Text>
            </View>
          )}

          {listo ? (
            <Tarjeta style={{ alignItems: 'center', paddingVertical: 30 }}>
              <Ionicons name="checkmark-circle" size={64} color={colors.success} />
              <Text style={styles.listo}>¡Contraseña actualizada!</Text>
            </Tarjeta>
          ) : (
            <Tarjeta>
              {campo(obligatorio ? 'Contraseña temporal' : 'Contraseña actual', actual, setActual, { siguiente: () => nuevaRef.current?.focus() })}
              {campo('Nueva contraseña', nueva, setNueva, { ref: nuevaRef, siguiente: () => confirmaRef.current?.focus() })}
              {!!nueva && (
                <View style={styles.fuerza}>
                  <View style={styles.fuerzaBarras}>
                    {[0, 1, 2, 3].map(i => (
                      <View key={i} style={[styles.fuerzaBarra, i < nivel && { backgroundColor: NIVELES[nivel].color }]} />
                    ))}
                  </View>
                  <Text style={[styles.fuerzaText, { color: NIVELES[nivel].color }]}>{NIVELES[nivel].texto}</Text>
                </View>
              )}
              {campo('Confirmar nueva contraseña', confirma, setConfirma, { ref: confirmaRef, final: true })}

              <TouchableOpacity style={styles.ver} onPress={() => setVer(v => !v)}>
                <Ionicons name={ver ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.primary} />
                <Text style={styles.verText}>{ver ? 'Ocultar' : 'Mostrar'} contraseñas</Text>
              </TouchableOpacity>

              {!!error && <Text style={styles.error}>{error}</Text>}
              <Boton titulo="Guardar contraseña" icono="save-outline" onPress={guardar} cargando={guardando} style={{ marginTop: 14 }} />
              <Text style={styles.tip}>Mínimo 8 caracteres. Combina mayúsculas, números y símbolos para que sea más segura.</Text>
            </Tarjeta>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  salir: { color: colors.white, fontWeight: '700' },
  aviso: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.primarySoft, padding: 14, borderRadius: radius.md, marginBottom: 14 },
  avisoText: { flex: 1, color: colors.text, fontSize: 14 },
  label: { color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg,
    borderRadius: radius.md, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border,
  },
  input: { flex: 1, color: colors.text, paddingVertical: 12, fontSize: 16 },
  fuerza: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  fuerzaBarras: { flexDirection: 'row', gap: 4, flex: 1 },
  fuerzaBarra: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.border },
  fuerzaText: { fontSize: 12, fontWeight: '700', width: 72, textAlign: 'right' },
  ver: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  verText: { color: colors.primary, fontWeight: '600' },
  error: { color: colors.danger, marginTop: 12 },
  tip: { color: colors.textMuted, fontSize: 12, marginTop: 12, textAlign: 'center' },
  listo: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 10 },
});
