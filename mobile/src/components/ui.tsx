import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow } from '../theme';

type Variante = 'primario' | 'peligro' | 'secundario' | 'suave' | 'exito';

const VARIANTES: Record<Variante, { fondo: string; texto: string; borde?: string }> = {
  primario:   { fondo: colors.primary, texto: colors.white },
  exito:      { fondo: colors.success, texto: colors.white },
  peligro:    { fondo: colors.white, texto: colors.danger, borde: colors.danger },
  secundario: { fondo: colors.white, texto: colors.primary, borde: colors.border },
  suave:      { fondo: colors.primarySoft, texto: colors.primary },
};

interface BotonProps {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  icono?: string;
  cargando?: boolean;
  deshabilitado?: boolean;
  style?: StyleProp<ViewStyle>;
  compacto?: boolean;
}

export function Boton({ titulo, onPress, variante = 'primario', icono, cargando, deshabilitado, style, compacto }: BotonProps) {
  const v = VARIANTES[variante];
  const off = deshabilitado || cargando;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={off}
      activeOpacity={0.8}
      style={[
        styles.boton,
        compacto && styles.botonCompacto,
        { backgroundColor: v.fondo, borderColor: v.borde ?? v.fondo },
        off && { opacity: 0.55 },
        style,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={v.texto} />
      ) : (
        <>
          {!!icono && <Ionicons name={icono as any} size={compacto ? 17 : 20} color={v.texto} />}
          <Text style={[styles.botonText, compacto && { fontSize: 14 }, { color: v.texto }]}>{titulo}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function Tarjeta({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.tarjeta, style]}>{children}</View>;
}

export function TituloSeccion({ children, derecha }: { children: React.ReactNode; derecha?: React.ReactNode }) {
  return (
    <View style={styles.seccion}>
      <Text style={styles.seccionText}>{children}</Text>
      {derecha}
    </View>
  );
}

export function Vacio({ icono, titulo, texto }: { icono: string; titulo: string; texto?: string }) {
  return (
    <View style={styles.vacio}>
      <View style={styles.vacioIcono}>
        <Ionicons name={icono as any} size={34} color={colors.primary} />
      </View>
      <Text style={styles.vacioTitulo}>{titulo}</Text>
      {!!texto && <Text style={styles.vacioTexto}>{texto}</Text>}
    </View>
  );
}

export function Cargando({ texto }: { texto?: string }) {
  return (
    <View style={styles.vacio}>
      <ActivityIndicator size="large" color={colors.primary} />
      {!!texto && <Text style={[styles.vacioTexto, { marginTop: 12 }]}>{texto}</Text>}
    </View>
  );
}

export function MensajeError({ texto, onReintentar }: { texto: string; onReintentar?: () => void }) {
  return (
    <View style={styles.error}>
      <Ionicons name="alert-circle" size={20} color={colors.danger} />
      <Text style={styles.errorText}>{texto}</Text>
      {!!onReintentar && (
        <TouchableOpacity onPress={onReintentar}>
          <Text style={styles.errorLink}>Reintentar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  botonCompacto: { paddingVertical: 10, paddingHorizontal: 14 },
  botonText: { fontSize: 16, fontWeight: '700' },
  tarjeta: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    ...shadow,
  },
  seccion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 10,
  },
  seccionText: { fontSize: 13, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' },
  vacio: { alignItems: 'center', justifyContent: 'center', padding: 36 },
  vacioIcono: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  vacioTitulo: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  vacioTexto: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 6 },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerSoft,
    padding: 12,
    borderRadius: radius.md,
    margin: 16,
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 14 },
  errorLink: { color: colors.danger, fontWeight: '800' },
});
