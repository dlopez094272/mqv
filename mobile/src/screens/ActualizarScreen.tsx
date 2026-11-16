import React, { useState } from 'react';
import { ActivityIndicator, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { APP_VERSION, InfoVersion } from '../version';
import { colors, radius } from '../theme';

/**
 * Bloquea la app cuando el servidor exige una versión más nueva.
 * No se puede cerrar: solo descargar la actualización.
 */
export default function ActualizarScreen({ info }: { info: InfoVersion }) {
  const { revisarVersion, filesUrl } = useAuth();
  const [revisando, setRevisando] = useState(false);
  const url = info.url_descarga || `${filesUrl}/api/files/app/mqv.apk`;

  const reintentar = async () => {
    setRevisando(true);
    await revisarVersion();
    setRevisando(false);
  };

  return (
    <View style={styles.fondo}>
      <Image source={require('../../assets/logo-blanco.png')} style={styles.logo} resizeMode="contain" />
      <View style={styles.card}>
        <View style={styles.icono}><Ionicons name="cloud-download" size={40} color={colors.primary} /></View>
        <Text style={styles.titulo}>Actualización obligatoria</Text>
        <Text style={styles.texto}>{info.mensaje || 'Hay una nueva versión de la app MQV. Descárgala e instálala para continuar.'}</Text>
        <Text style={styles.version}>Tu versión: {APP_VERSION} · Nueva: {info.version_actual || info.version_minima}</Text>
        <TouchableOpacity style={styles.boton} onPress={() => Linking.openURL(url)}>
          <Ionicons name="download-outline" size={20} color={colors.white} />
          <Text style={styles.botonTexto}>Descargar actualización</Text>
        </TouchableOpacity>
        <Text style={styles.ayuda}>Al terminar la descarga, abre el archivo e instálalo. Tu sesión y tus datos se conservan.</Text>
        <TouchableOpacity onPress={reintentar} disabled={revisando} style={styles.reintentar}>
          {revisando ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.reintentarTexto}>Ya actualicé, volver a revisar</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', padding: 20 },
  logo: { width: 200, height: 200 * (432 / 799), marginBottom: 20 },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, padding: 22, width: '100%', maxWidth: 420, alignItems: 'center' },
  icono: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  titulo: { fontSize: 22, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  texto: { fontSize: 15, color: colors.text, textAlign: 'center', marginTop: 8 },
  version: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
  boton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 20, marginTop: 18, alignSelf: 'stretch', justifyContent: 'center' },
  botonTexto: { color: colors.white, fontWeight: '800', fontSize: 16 },
  ayuda: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 12 },
  reintentar: { marginTop: 14, padding: 6 },
  reintentarTexto: { color: colors.primary, fontWeight: '700' },
});
