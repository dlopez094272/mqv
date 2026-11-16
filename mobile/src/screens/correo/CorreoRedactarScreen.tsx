import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import ScreenHeader from '../../components/ScreenHeader';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../navigation/Navigator';
import { buscarContactos, enviarCorreo } from '../../api/correo';
import { iconoArchivo, tamanoLegible } from '../../utils/archivos';
import { colors, radius } from '../../theme';

interface Props { para?: string; cc?: string; asunto?: string; cuerpo?: string }
type Campo = 'para' | 'cc';

const MAX_TOTAL = 25 * 1024 * 1024;

export default function CorreoRedactarScreen(props: Props) {
  const { api } = useAuth();
  const { goBack } = useNavigation();
  const insets = useSafeAreaInsets();
  const [para, setPara] = useState(props.para ?? '');
  const [cc, setCc] = useState(props.cc ?? '');
  const [verCc, setVerCc] = useState(!!props.cc);
  const [asunto, setAsunto] = useState(props.asunto ?? '');
  const [cuerpo, setCuerpo] = useState(props.cuerpo ?? '');
  const [adjuntos, setAdjuntos] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [enviando, setEnviando] = useState(false);

  // Autocompletar contactos (personas con correo)
  const [campoActivo, setCampoActivo] = useState<Campo | null>(null);
  const [sugerencias, setSugerencias] = useState<{ nombre: string; email: string }[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const terminoActual = (v: string) => v.split(/[,;]/).pop()!.trim();

  useEffect(() => {
    if (!campoActivo) { setSugerencias([]); return; }
    const t = terminoActual(campoActivo === 'para' ? para : cc);
    if (timer.current) clearTimeout(timer.current);
    if (t.length < 2 || t.includes('@') && /\.\w{2,}$/.test(t)) { setSugerencias([]); return; }
    timer.current = setTimeout(() => {
      buscarContactos(api, t).then(r => setSugerencias(r.contactos)).catch(() => setSugerencias([]));
    }, 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [api, para, cc, campoActivo]);

  const elegirContacto = (email: string) => {
    const set = campoActivo === 'para' ? setPara : setCc;
    const valor = campoActivo === 'para' ? para : cc;
    const partes = valor.split(/[,;]/).map(s => s.trim()).filter(Boolean);
    partes.pop();
    set([...partes, email].join(', ') + ', ');
    setSugerencias([]);
  };

  const agregarAdjuntos = async () => {
    const r = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (r.canceled) return;
    const nuevos = [...adjuntos, ...r.assets].slice(0, 10);
    const total = nuevos.reduce((s, a) => s + (a.size || 0), 0);
    if (total > MAX_TOTAL) { Alert.alert('Adjuntos', 'Los adjuntos no pueden pasar de 25 MB en total.'); return; }
    setAdjuntos(nuevos);
  };

  const limpiarLista = (v: string) => v.split(/[,;]/).map(s => s.trim()).filter(Boolean).join(', ');

  const enviar = async () => {
    const destinatarios = limpiarLista(para);
    if (!destinatarios) { Alert.alert('Correo', 'Escribe al menos un destinatario.'); return; }
    if (!asunto.trim()) { Alert.alert('Correo', 'Escribe el asunto.'); return; }
    if (!cuerpo.trim()) { Alert.alert('Correo', 'Escribe el mensaje.'); return; }
    const fd = new FormData();
    fd.append('para', destinatarios);
    if (limpiarLista(cc)) fd.append('cc', limpiarLista(cc));
    fd.append('asunto', asunto.trim());
    fd.append('cuerpo', cuerpo);
    fd.append('esHtml', 'false');
    adjuntos.forEach(a => fd.append('adjuntos', { uri: a.uri, name: a.name, type: a.mimeType || 'application/octet-stream' } as any));
    setEnviando(true);
    try {
      await enviarCorreo(api, fd);
      Alert.alert('Correo', 'Mensaje enviado.');
      goBack();
    } catch (err) {
      Alert.alert('No se pudo enviar', (err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const descartar = () => {
    if (!para && !asunto && !cuerpo.trim()) { goBack(); return; }
    Alert.alert('Descartar', '¿Descartar este mensaje?', [
      { text: 'Seguir escribiendo', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: goBack },
    ]);
  };

  const listaSugerencias = (campo: Campo) => campoActivo === campo && sugerencias.length > 0 && (
    <View style={styles.sugerencias}>
      {sugerencias.map(s => (
        <TouchableOpacity key={s.email + s.nombre} style={styles.sugerencia} onPress={() => elegirContacto(s.email)}>
          <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.sugNombre} numberOfLines={1}>{s.nombre}</Text>
            <Text style={styles.sugEmail} numberOfLines={1}>{s.email}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Nuevo mensaje"
        onBack={descartar}
        right={
          <TouchableOpacity onPress={enviar} disabled={enviando} style={[styles.enviar, enviando && { opacity: 0.5 }]}>
            <Ionicons name={enviando ? 'hourglass-outline' : 'send'} size={18} color={colors.primary} />
            <Text style={styles.enviarText}>{enviando ? 'Enviando' : 'Enviar'}</Text>
          </TouchableOpacity>
        }
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 30 + insets.bottom }} keyboardShouldPersistTaps="handled">
          <View style={styles.fila}>
            <Text style={styles.etiqueta}>Para</Text>
            <TextInput style={styles.input} value={para} onChangeText={setPara} autoCapitalize="none" keyboardType="email-address"
                       onFocus={() => setCampoActivo('para')} onBlur={() => setTimeout(() => setCampoActivo(c => (c === 'para' ? null : c)), 200)}
                       placeholder="correo o nombre" placeholderTextColor={colors.textLight} />
            {!verCc && <TouchableOpacity onPress={() => setVerCc(true)}><Text style={styles.cc}>CC</Text></TouchableOpacity>}
          </View>
          {listaSugerencias('para')}
          {verCc && (
            <>
              <View style={styles.fila}>
                <Text style={styles.etiqueta}>CC</Text>
                <TextInput style={styles.input} value={cc} onChangeText={setCc} autoCapitalize="none" keyboardType="email-address"
                           onFocus={() => setCampoActivo('cc')} onBlur={() => setTimeout(() => setCampoActivo(c => (c === 'cc' ? null : c)), 200)}
                           placeholderTextColor={colors.textLight} />
              </View>
              {listaSugerencias('cc')}
            </>
          )}
          <View style={styles.fila}>
            <Text style={styles.etiqueta}>Asunto</Text>
            <TextInput style={styles.input} value={asunto} onChangeText={setAsunto} placeholderTextColor={colors.textLight} />
          </View>

          {adjuntos.length > 0 && (
            <View style={styles.adjuntos}>
              {adjuntos.map((a, i) => (
                <View key={a.uri + i} style={styles.adjunto}>
                  <Ionicons name={iconoArchivo(a.mimeType) as any} size={18} color={colors.primary} />
                  <Text style={styles.adjuntoNombre} numberOfLines={1}>{a.name}</Text>
                  <Text style={styles.adjuntoTam}>{tamanoLegible(a.size)}</Text>
                  <TouchableOpacity onPress={() => setAdjuntos(l => l.filter((_, j) => j !== i))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={20} color={colors.textLight} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TextInput style={styles.cuerpo} value={cuerpo} onChangeText={setCuerpo} multiline placeholder="Escribe tu mensaje…"
                     placeholderTextColor={colors.textLight} textAlignVertical="top" autoFocus={!!props.para && !props.cuerpo?.trim()} />

          <TouchableOpacity style={styles.adjuntar} onPress={agregarAdjuntos}>
            <Ionicons name="attach" size={20} color={colors.primary} />
            <Text style={styles.adjuntarText}>Adjuntar archivos</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  enviar: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.white, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 },
  enviarText: { color: colors.primary, fontWeight: '800' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  etiqueta: { width: 56, color: colors.textMuted, fontSize: 14 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: colors.text },
  cc: { color: colors.primary, fontWeight: '800', padding: 6 },
  sugerencias: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  sugerencia: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: colors.primarySoft, borderBottomWidth: 1, borderBottomColor: colors.white },
  sugNombre: { fontSize: 14, fontWeight: '700', color: colors.text },
  sugEmail: { fontSize: 12, color: colors.textMuted },
  adjuntos: { padding: 12, gap: 6 },
  adjunto: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bg, borderRadius: radius.md, padding: 10 },
  adjuntoNombre: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
  adjuntoTam: { fontSize: 12, color: colors.textMuted },
  cuerpo: { minHeight: 260, padding: 16, fontSize: 15, color: colors.text, lineHeight: 22 },
  adjuntar: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border },
  adjuntarText: { color: colors.primary, fontWeight: '700' },
});
