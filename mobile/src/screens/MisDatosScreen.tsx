import React, { useCallback, useEffect, useState } from 'react';
import {
  ActionSheetIOS, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import ScreenHeader from '../components/ScreenHeader';
import { Boton, Cargando, MensajeError, Tarjeta, TituloSeccion, Vacio } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { getMiCuenta, putMisDatos } from '../api/alabanza';
import { MiCuenta } from '../types';
import { formatFecha, iniciales } from '../utils/formato';
import { colors, radius } from '../theme';

const ESTADOS_CIVIL = ['Solter@', 'Casad@', 'Unid@', 'Viud@', 'Divorciad@'];

type Campo =
  | 'celular' | 'telefono' | 'email' | 'perfil_social' | 'zona_domicilio' | 'direccion_domicilio'
  | 'lugartrabajo' | 'puesto_trabajo' | 'estado_civil';

const CAMPOS: { clave: Campo; etiqueta: string; icono: string; teclado?: 'phone-pad' | 'email-address' | 'number-pad'; multilinea?: boolean }[] = [
  { clave: 'celular', etiqueta: 'Celular', icono: 'phone-portrait-outline', teclado: 'phone-pad' },
  { clave: 'telefono', etiqueta: 'Teléfono de casa', icono: 'call-outline', teclado: 'phone-pad' },
  { clave: 'email', etiqueta: 'Correo electrónico', icono: 'mail-outline', teclado: 'email-address' },
  { clave: 'perfil_social', etiqueta: 'Red social (Facebook / Instagram)', icono: 'logo-instagram' },
];
const CAMPOS_DOMICILIO: typeof CAMPOS = [
  { clave: 'zona_domicilio', etiqueta: 'Zona', icono: 'map-outline', teclado: 'number-pad' },
  { clave: 'direccion_domicilio', etiqueta: 'Dirección', icono: 'home-outline', multilinea: true },
];
const CAMPOS_TRABAJO: typeof CAMPOS = [
  { clave: 'lugartrabajo', etiqueta: 'Lugar de trabajo', icono: 'business-outline' },
  { clave: 'puesto_trabajo', etiqueta: 'Puesto', icono: 'briefcase-outline' },
];

export default function MisDatosScreen() {
  const { api, baseUrl } = useAuth();
  const insets = useSafeAreaInsets();
  const [cuenta, setCuenta] = useState<MiCuenta | null>(null);
  const [form, setForm] = useState<Record<Campo, string>>({} as Record<Campo, string>);
  const [fotoNueva, setFotoNueva] = useState<string | null>(null); // data:image/...;base64
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const aplicar = (c: MiCuenta) => {
    setCuenta(c);
    const p = c.persona;
    if (p) {
      const f = {} as Record<Campo, string>;
      [...CAMPOS, ...CAMPOS_DOMICILIO, ...CAMPOS_TRABAJO].forEach(k => { f[k.clave] = (p[k.clave] as string) ?? ''; });
      f.estado_civil = p.estado_civil ?? '';
      setForm(f);
    }
  };

  const cargar = useCallback(async () => {
    setError(null);
    try {
      aplicar(await getMiCuenta(api));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }, [api]);

  useEffect(() => { cargar(); }, [cargar]);

  const set = (k: Campo, v: string) => { setForm(f => ({ ...f, [k]: v })); setOk(false); };

  async function elegirFoto(origen: 'camara' | 'galeria') {
    const permiso = origen === 'camara'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) return Alert.alert('Permiso denegado', 'Habilita el acceso en los ajustes del teléfono.');
    const opciones: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: true };
    const r = origen === 'camara' ? await ImagePicker.launchCameraAsync(opciones) : await ImagePicker.launchImageLibraryAsync(opciones);
    const a = r.canceled ? null : r.assets[0];
    if (a?.base64) { setFotoNueva(`data:${a.mimeType || 'image/jpeg'};base64,${a.base64}`); setOk(false); }
  }

  function cambiarFoto() {
    const opciones = ['Tomar foto', 'Elegir de la galería', 'Cancelar'];
    const accion = (i: number) => { if (i === 0) elegirFoto('camara'); if (i === 1) elegirFoto('galeria'); };
    if (Platform.OS === 'ios') ActionSheetIOS.showActionSheetWithOptions({ options: opciones, cancelButtonIndex: 2 }, accion);
    else Alert.alert('Foto de perfil', undefined, [
      { text: 'Cámara', onPress: () => accion(0) },
      { text: 'Galería', onPress: () => accion(1) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function guardar() {
    setError(null);
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) return setError('El correo electrónico no es válido');
    setGuardando(true);
    try {
      const datos: Record<string, unknown> = { ...form };
      if (fotoNueva) datos.foto = fotoNueva;
      aplicar(await putMisDatos(api, datos));
      setFotoNueva(null);
      setOk(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron guardar los cambios');
    } finally {
      setGuardando(false);
    }
  }

  const p = cuenta?.persona;
  const foto = fotoNueva ?? (p?.foto ? `${baseUrl}/uploads/personas/${p.foto}` : null);

  const input = (c: (typeof CAMPOS)[number]) => (
    <View key={c.clave}>
      <Text style={styles.label}>{c.etiqueta}</Text>
      <View style={[styles.inputRow, c.multilinea && { alignItems: 'flex-start', paddingTop: 10 }]}>
        <Ionicons name={c.icono as any} size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.input, c.multilinea && { minHeight: 60, textAlignVertical: 'top', paddingTop: 0 }]}
          value={form[c.clave] ?? ''}
          onChangeText={v => set(c.clave, v)}
          keyboardType={c.teclado}
          autoCapitalize={c.teclado === 'email-address' || c.clave === 'perfil_social' ? 'none' : 'sentences'}
          multiline={c.multilinea}
          placeholderTextColor={colors.textLight}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Mis datos" subtitle="Mantén tu información al día" />
      {cargando ? <Cargando /> : !p ? (
        <>
          {!!error && <MensajeError texto={error} onReintentar={cargar} />}
          <Vacio icono="person-outline" titulo="Sin ficha vinculada" texto="Tu usuario no está vinculado a una ficha de persona. Pide a la secretaría que lo vincule." />
        </>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled">
            <Tarjeta style={styles.perfil}>
              <TouchableOpacity onPress={cambiarFoto} activeOpacity={0.8}>
                <View style={styles.avatar}>
                  {foto ? <Image source={{ uri: foto }} style={styles.avatarImg} /> : <Text style={styles.avatarText}>{iniciales(p.nombre_completo)}</Text>}
                </View>
                <View style={styles.camara}><Ionicons name="camera" size={16} color={colors.white} /></View>
              </TouchableOpacity>
              <Text style={styles.nombre}>{p.nombre_completo}</Text>
              {!!p.fechanacimiento && <Text style={styles.dato}>🎂 {formatFecha(p.fechanacimiento)}</Text>}
              {p.grupos.length > 0 && (
                <View style={styles.grupos}>
                  {p.grupos.map(g => <View key={g.idgrupos} style={styles.grupo}><Text style={styles.grupoText}>{g.grupo}</Text></View>)}
                </View>
              )}
              {!!fotoNueva && <Text style={styles.fotoAviso}>Foto nueva lista: presiona Guardar.</Text>}
            </Tarjeta>

            <TituloSeccion>Contacto</TituloSeccion>
            <Tarjeta>{CAMPOS.map(input)}</Tarjeta>

            <TituloSeccion>Estado civil</TituloSeccion>
            <View style={styles.chips}>
              {ESTADOS_CIVIL.map(e => (
                <TouchableOpacity key={e} style={[styles.chip, form.estado_civil === e && styles.chipOn]} onPress={() => set('estado_civil', e)}>
                  <Text style={[styles.chipText, form.estado_civil === e && styles.chipTextOn]}>{e.replace('@', '(a)')}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TituloSeccion>Domicilio</TituloSeccion>
            <Tarjeta>
              {(!!p.municipio_domicilio || !!p.departamento_domicilio) && (
                <Text style={styles.dato}>📍 {[p.municipio_domicilio, p.departamento_domicilio].filter(Boolean).join(', ')}</Text>
              )}
              {CAMPOS_DOMICILIO.map(input)}
            </Tarjeta>

            <TituloSeccion>Trabajo</TituloSeccion>
            <Tarjeta>{CAMPOS_TRABAJO.map(input)}</Tarjeta>

            {!!error && <Text style={styles.error}>{error}</Text>}
            {ok && (
              <View style={styles.ok}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={styles.okText}>¡Tus datos se actualizaron!</Text>
              </View>
            )}
            <Boton titulo="Guardar cambios" icono="save-outline" onPress={guardar} cargando={guardando} style={{ marginTop: 18 }} />
            <Text style={styles.nota}>Para corregir tu nombre o fecha de nacimiento, comunícate con la secretaría de la iglesia.</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  perfil: { alignItems: 'center', paddingVertical: 22 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 96, height: 96 },
  avatarText: { color: colors.white, fontSize: 32, fontWeight: '800' },
  camara: { position: 'absolute', right: 0, bottom: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.blue, borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  nombre: { fontSize: 19, fontWeight: '800', color: colors.text, marginTop: 12, textAlign: 'center', textTransform: 'capitalize' },
  dato: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  grupos: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 10 },
  grupo: { backgroundColor: colors.primarySoft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  grupoText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  fotoAviso: { fontSize: 12, color: colors.warning, marginTop: 8 },
  label: { color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border },
  input: { flex: 1, color: colors.text, paddingVertical: 11, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600' },
  chipTextOn: { color: colors.white },
  error: { color: colors.danger, marginTop: 14 },
  ok: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.successSoft, padding: 10, borderRadius: radius.sm, marginTop: 14 },
  okText: { color: colors.success, fontWeight: '700' },
  nota: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 14 },
});
