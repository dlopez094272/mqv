import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import { colors } from '../theme';

interface Props { bpm: number; compas?: string | null; oscuro?: boolean; }

/** Metrónomo: click con acento en el primer tiempo y un punto que late. */
export default function Metronomo({ bpm, compas, oscuro = false }: Props) {
  const [activo, setActivo] = useState(false);
  const [pulso, setPulso] = useState(0);
  const escala = useRef(new Animated.Value(1)).current;
  const sonidos = useRef<{ acento: AudioPlayer; normal: AudioPlayer } | null>(null);
  const tiempos = Number(String(compas || '4/4').split('/')[0]) || 4;

  useEffect(() => {
    sonidos.current = {
      acento: createAudioPlayer(require('../../assets/click-acento.wav')),
      normal: createAudioPlayer(require('../../assets/click.wav')),
    };
    return () => {
      sonidos.current?.acento.remove();
      sonidos.current?.normal.remove();
      sonidos.current = null;
    };
  }, []);

  useEffect(() => {
    if (!activo) { setPulso(0); return; }
    let n = 0;
    const tick = () => {
      const acento = n % tiempos === 0;
      setPulso((n % tiempos) + 1);
      const s = acento ? sonidos.current?.acento : sonidos.current?.normal;
      if (s) { s.seekTo(0); s.play(); }
      escala.setValue(acento ? 1.8 : 1.4);
      Animated.timing(escala, { toValue: 1, duration: 140, useNativeDriver: true }).start();
      n++;
    };
    tick();
    const id = setInterval(tick, 60000 / bpm);
    return () => clearInterval(id);
  }, [activo, bpm, tiempos, escala]);

  const fondo = oscuro ? '#2A2F38' : colors.white;
  const texto = oscuro ? colors.white : colors.primary;

  return (
    <TouchableOpacity style={[styles.btn, { backgroundColor: activo ? colors.gold : fondo }]} onPress={() => setActivo(a => !a)}
                      accessibilityLabel={activo ? 'Detener metrónomo' : 'Iniciar metrónomo'}>
      {activo ? (
        <Animated.View style={[styles.punto, pulso === 1 && { backgroundColor: colors.danger }, { transform: [{ scale: escala }] }]} />
      ) : (
        <Ionicons name="timer-outline" size={16} color={texto} />
      )}
      <Text style={[styles.texto, { color: activo ? colors.primaryDark : texto }]}>{activo ? `${pulso}/${tiempos}` : `${bpm}`}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: colors.border },
  punto: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primaryDark },
  texto: { fontWeight: '800', fontSize: 13, fontVariant: ['tabular-nums'] },
});
