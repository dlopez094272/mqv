import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { colors } from '../theme';

const ANCHO_LOGO = 260;
const ALTO_LOGO = ANCHO_LOGO * (432 / 799);

/** Anillo de luz que se expande desde el logo y se desvanece. */
function Anillo({ retraso }: { retraso: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(retraso),
        Animated.timing(v, { toValue: 1, duration: 2400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [v, retraso]);
  return (
    <Animated.View
      style={[
        styles.anillo,
        {
          opacity: v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.35, 0] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.2] }) }],
        },
      ]}
    />
  );
}

/** Intro: el logotipo entra con un rebote suave, "respira" y aparece el lema; se desvanece cuando `listo`. */
export default function IntroAnimada({ listo, onFin }: { listo: boolean; onFin: () => void }) {
  const fade = useRef(new Animated.Value(1)).current;
  const entrada = useRef(new Animated.Value(0)).current;   // 0 → 1: aparición del logo
  const pulso = useRef(new Animated.Value(0)).current;     // respiración continua
  const linea = useRef(new Animated.Value(0)).current;     // línea bajo el logo
  const lema = useRef(new Animated.Value(0)).current;      // texto

  useEffect(() => {
    Animated.sequence([
      Animated.spring(entrada, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
      Animated.timing(linea, { toValue: 1, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(lema, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
    const respirar = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    respirar.start();
    return () => respirar.stop();
  }, [entrada, pulso, linea, lema]);

  useEffect(() => {
    if (!listo) return;
    const t = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 450, useNativeDriver: true }).start(() => onFin());
    }, 1800);
    return () => clearTimeout(t);
  }, [listo, fade, onFin]);

  const escalaLogo = Animated.multiply(
    entrada.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
    pulso.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] })
  );

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.fondo, { opacity: fade }]} pointerEvents="none">
      <Animated.View style={styles.centro}>
        <Anillo retraso={300} />
        <Anillo retraso={1100} />
        <Anillo retraso={1900} />
        <Animated.Image
          source={require('../../assets/logo-blanco.png')}
          style={[
            styles.logo,
            {
              opacity: entrada.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
              transform: [
                { scale: escalaLogo },
                { rotate: entrada.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '0deg'] }) },
              ],
            },
          ]}
          resizeMode="contain"
        />
      </Animated.View>
      <Animated.View style={[styles.linea, { transform: [{ scaleX: linea }] }]} />
      <Animated.Text
        style={[
          styles.lema,
          { opacity: lema, transform: [{ translateY: lema.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
        ]}
      >
        Somos más que vencedores · Romanos 8:37
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fondo: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  centro: { width: ANCHO_LOGO, height: ALTO_LOGO, alignItems: 'center', justifyContent: 'center' },
  anillo: {
    position: 'absolute',
    width: ANCHO_LOGO * 0.75,
    height: ANCHO_LOGO * 0.75,
    borderRadius: ANCHO_LOGO,
    borderWidth: 2,
    borderColor: colors.white,
  },
  logo: { width: ANCHO_LOGO, height: ALTO_LOGO },
  linea: { width: 140, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.6)', marginTop: 22 },
  lema: { color: 'rgba(255,255,255,0.8)', marginTop: 12, fontSize: 13, letterSpacing: 0.5 },
});
