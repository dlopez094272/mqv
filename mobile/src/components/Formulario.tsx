import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

interface CampoProps extends TextInputProps {
  etiqueta: string;
  icono?: string;
  requerido?: boolean;
}

/** Campo de texto con etiqueta, con el mismo estilo que "Mis datos". */
export function Campo({ etiqueta, icono, requerido, multiline, style, ...rest }: CampoProps) {
  return (
    <View>
      <Text style={styles.label}>{etiqueta}{requerido && <Text style={{ color: colors.danger }}> *</Text>}</Text>
      <View style={[styles.inputRow, multiline && { alignItems: 'flex-start', paddingTop: 10 }]}>
        {!!icono && <Ionicons name={icono as any} size={18} color={colors.textMuted} />}
        <TextInput
          style={[styles.input, multiline && { minHeight: 90, textAlignVertical: 'top', paddingTop: 0 }, style]}
          placeholderTextColor={colors.textLight}
          multiline={multiline}
          {...rest}
        />
      </View>
    </View>
  );
}

/** Botón con aspecto de campo (abre un selector). */
export function CampoBoton({ etiqueta, valor, placeholder, icono, onPress, requerido }: {
  etiqueta: string; valor?: string | null; placeholder?: string; icono?: string; onPress: () => void; requerido?: boolean;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{etiqueta}{requerido && <Text style={{ color: colors.danger }}> *</Text>}</Text>
      <TouchableOpacity style={styles.inputRow} onPress={onPress} activeOpacity={0.7}>
        {!!icono && <Ionicons name={icono as any} size={18} color={colors.textMuted} />}
        <Text style={[styles.input, !valor && { color: colors.textLight }]} numberOfLines={1}>{valor || placeholder || 'Seleccionar'}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

/** Lista de opciones como chips (una o varias). */
export function Chips<T extends string | number>({ opciones, valor, onCambiar, multiple }: {
  opciones: { valor: T; texto: string; color?: string }[];
  valor: T | T[] | null;
  onCambiar: (v: any) => void;
  multiple?: boolean;
}) {
  const activos = Array.isArray(valor) ? valor : valor == null ? [] : [valor];
  return (
    <View style={styles.chips}>
      {opciones.map(o => {
        const on = activos.includes(o.valor);
        return (
          <TouchableOpacity
            key={String(o.valor)}
            style={[styles.chip, on && { backgroundColor: o.color || colors.primary, borderColor: o.color || colors.primary }]}
            onPress={() => {
              if (multiple) onCambiar(on ? activos.filter(v => v !== o.valor) : [...activos, o.valor]);
              else onCambiar(on ? null : o.valor);
            }}
          >
            {!!o.color && !on && <View style={[styles.chipPunto, { backgroundColor: o.color }]} />}
            <Text style={[styles.chipText, on && { color: colors.white }]}>{o.texto}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, minHeight: 46 },
  input: { flex: 1, color: colors.text, paddingVertical: 11, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white },
  chipPunto: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 14, fontWeight: '700', color: colors.text },
});
