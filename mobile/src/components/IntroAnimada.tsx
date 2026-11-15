import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors } from '../theme';

const NOTAS = ['♪', '♫', '♩', '♬', '♪', '♫', '♩', '♬', '♪', '♫', '♪', '♬'];

/** Una nota musical que sube y se desvanece. */
function Nota({ simbolo, x, retraso, alto }: { simbolo: string; x: number; retraso: number; alto: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(retraso),
        Animated.timing(v, { toValue: 1, duration: 2600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [v, retraso]);
  return (
    <Animated.Text
      style={[
        styles.nota,
        {
          left: x,
          top: alto * 0.75,
          opacity: v.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.9, 0.6, 0] }),
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -alto * 0.55] }) },
            { rotate: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-12deg', '12deg', '-6deg'] }) },
          ],
        },
      ]}
    >
      {simbolo}
    </Animated.Text>
  );
}

/** Intro: notas musicales que suben alrededor del logo; se desvanece cuando `listo`. */
export default function IntroAnimada({ listo, onFin }: { listo: boolean; onFin: () => void }) {
  const { width, height } = useWindowDimensions();
  const fade = useRef(new Animated.Value(1)).current;
  const escala = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.spring(escala, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  }, [escala]);

  useEffect(() => {
    if (!listo) return;
    const t = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 450, useNativeDriver: true }).start(() => onFin());
    }, 1600);
    return () => clearTimeout(t);
  }, [listo, fade, onFin]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.fondo, { opacity: fade }]} pointerEvents="none">
      {NOTAS.map((n, i) => (
        <Nota key={i} simbolo={n} x={(width / NOTAS.length) * i + ((i * 37) % 25)} retraso={(i * 260) % 1700} alto={height} />
      ))}
      <Animated.View style={{ alignItems: 'center', transform: [{ scale: escala }] }}>
        <Image source={require('../../assets/logo-blanco.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.lema}>Somos más que vencedores · Romanos 8:37</Text>
      </Animated.View>
      <View />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fondo: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  nota: { position: 'absolute', fontSize: 30, color: 'rgba(255,255,255,0.85)' },
  logo: { width: 260, height: 260 * (432 / 799) },
  lema: { color: 'rgba(255,255,255,0.75)', marginTop: 18, fontSize: 13, letterSpacing: 0.5 },
});
