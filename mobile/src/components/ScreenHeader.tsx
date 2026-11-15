import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '../navigation/Navigator';
import { colors } from '../theme';

interface Props {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  /** Por defecto vuelve a la pantalla anterior. */
  onBack?: () => void;
}

export default function ScreenHeader({ title, subtitle, right, onBack }: Props) {
  const { goBack, canGoBack } = useNavigation();
  const mostrarBack = !!onBack || canGoBack;

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {mostrarBack && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack ?? goBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Regresar"
          >
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </TouchableOpacity>
        )}
        <View style={styles.titulos}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: colors.primary,
  },
  left: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, flex: 1 },
  titulos: { flexShrink: 1 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: { color: colors.white, fontSize: 19, fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 1 },
});
