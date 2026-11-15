import React, { useEffect, useRef } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Mientras se procesa algo no se cierra con el botón atrás. */
  bloqueado?: boolean;
}

/** Hoja que sube desde abajo: confirmaciones y formularios cortos a una mano. */
export default function BottomSheet({ visible, onClose, title, children, bloqueado = false }: Props) {
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      y.setValue(400);
      Animated.spring(y, { toValue: 0, friction: 9, tension: 70, useNativeDriver: true }).start();
    }
  }, [visible, y]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !bloqueado && onClose()} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Tocar fuera no cierra la hoja: solo sus botones o el botón atrás. */}
        <View style={styles.backdrop} />
        <Animated.View style={[styles.sheet, { paddingBottom: 20 + insets.bottom, transform: [{ translateY: y }] }]}>
          <View style={styles.handle} />
          {!!title && <Text style={styles.title}>{title}</Text>}
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(33,26,45,0.5)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '92%',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: 14,
  },
  title: { fontSize: 19, fontWeight: '800', color: colors.text, marginBottom: 12 },
});
