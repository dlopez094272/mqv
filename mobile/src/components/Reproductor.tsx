import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { colors, radius } from '../theme';

export interface Pista { id: number; nombre: string; url: string; }

interface EstadoPista { mute: boolean; solo: boolean; }

const VELOCIDADES = [1, 0.9, 0.75, 0.5];

/**
 * Reproductor multipista: todas las pistas suenan juntas y sincronizadas.
 * Cada músico puede silenciar su instrumento (M) o dejar solo uno (S) y
 * practicar encima de la banda; la velocidad baja sin cambiar el tono.
 */
export default function Reproductor({ pistas }: { pistas: Pista[] }) {
  const players = useRef<AudioPlayer[]>([]);
  const [estados, setEstados] = useState<EstadoPista[]>(() => pistas.map(() => ({ mute: false, solo: false })));
  const [reproduciendo, setReproduciendo] = useState(false);
  const [tiempo, setTiempo] = useState(0);
  const [duracion, setDuracion] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [velocidad, setVelocidad] = useState(1);
  const [repetir, setRepetir] = useState(false);
  const repetirRef = useRef(repetir);
  repetirRef.current = repetir;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => {});
    const lista = pistas.map(p => createAudioPlayer({ uri: p.url }, { updateInterval: 250 }));
    players.current = lista;
    const maestro = lista[0];
    const sub = maestro?.addListener('playbackStatusUpdate', s => {
      setTiempo(s.currentTime);
      if (s.duration) setDuracion(s.duration);
      if (s.isLoaded) setCargando(false);
      setReproduciendo(s.playing);
      if (s.didJustFinish) {
        if (repetirRef.current) {
          lista.forEach(p => { p.seekTo(0); p.play(); });
        } else {
          lista.forEach(p => { p.pause(); p.seekTo(0); });
        }
      }
      // Mantiene las demás pistas alineadas con la primera
      if (s.playing) {
        lista.slice(1).forEach(p => {
          if (Math.abs(p.currentTime - s.currentTime) > 0.12) p.seekTo(s.currentTime);
        });
      }
    });
    return () => {
      sub?.remove();
      lista.forEach(p => { try { p.pause(); p.remove(); } catch { /* ya liberado */ } });
      players.current = [];
    };
  }, [pistas]);

  // Volumen según silencio / solo
  useEffect(() => {
    const haySolo = estados.some(e => e.solo);
    players.current.forEach((p, i) => {
      const e = estados[i] ?? { mute: false, solo: false };
      p.volume = (haySolo ? e.solo : !e.mute) ? 1 : 0;
    });
  }, [estados, pistas]);

  function alternar() {
    const lista = players.current;
    if (!lista.length) return;
    if (reproduciendo) {
      lista.forEach(p => p.pause());
    } else {
      const t = lista[0].currentTime;
      lista.forEach(p => {
        if (Math.abs(p.currentTime - t) > 0.05) p.seekTo(t);
        p.setPlaybackRate(velocidad, 'high');
        p.play();
      });
    }
  }

  function irA(seg: number) {
    const t = Math.max(0, Math.min(seg, duracion || seg));
    players.current.forEach(p => p.seekTo(t));
    setTiempo(t);
  }

  function cambiarVelocidad() {
    const v = VELOCIDADES[(VELOCIDADES.indexOf(velocidad) + 1) % VELOCIDADES.length];
    setVelocidad(v);
    players.current.forEach(p => p.setPlaybackRate(v, 'high'));
  }

  function toggle(i: number, campo: keyof EstadoPista) {
    setEstados(prev => prev.map((e, j) => (j === i ? { ...e, [campo]: !e[campo] } : e)));
  }

  const haySolo = estados.some(e => e.solo);
  const progreso = duracion ? tiempo / duracion : 0;

  return (
    <View style={styles.caja}>
      <View style={styles.transporte}>
        <TouchableOpacity style={styles.play} onPress={alternar} disabled={cargando} accessibilityLabel={reproduciendo ? 'Pausar' : 'Reproducir'}>
          <Ionicons name={reproduciendo ? 'pause' : 'play'} size={28} color={colors.primary} style={!reproduciendo && { marginLeft: 3 }} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => irA(tiempo - 10)}><Text style={styles.btnText}>-10s</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => irA(tiempo + 10)}><Text style={styles.btnText}>+10s</Text></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.tiempo}>{cargando ? 'Cargando…' : `${fmt(tiempo)} / ${fmt(duracion)}`}</Text>
        </View>
        <TouchableOpacity style={[styles.btn, velocidad !== 1 && styles.btnOn]} onPress={cambiarVelocidad}>
          <Text style={[styles.btnText, velocidad !== 1 && { color: colors.primaryDark }]}>🐢 {Math.round(velocidad * 100)}%</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, repetir && styles.btnOn]} onPress={() => setRepetir(r => !r)}>
          <Ionicons name="repeat" size={16} color={repetir ? colors.primaryDark : colors.white} />
        </TouchableOpacity>
      </View>

      {/* Barra de progreso tocable: 10 zonas para saltar rápido */}
      <View style={styles.barra}>
        <View style={styles.barraFondo} />
        <View style={[styles.barraLlena, { width: `${progreso * 100}%` }]} />
        <View style={styles.barraZonas}>
          {Array.from({ length: 10 }).map((_, i) => (
            <TouchableOpacity key={i} style={{ flex: 1 }} onPress={() => irA((duracion * i) / 10)} />
          ))}
        </View>
      </View>

      {pistas.map((p, i) => {
        const e = estados[i] ?? { mute: false, solo: false };
        const suena = haySolo ? e.solo : !e.mute;
        return (
          <View key={p.id} style={[styles.pista, !suena && { opacity: 0.45 }]}>
            <Ionicons name={suena ? 'volume-high' : 'volume-mute'} size={18} color={colors.white} />
            <Text style={styles.pistaNombre} numberOfLines={1}>{p.nombre}</Text>
            {pistas.length > 1 && (
              <>
                <TouchableOpacity style={[styles.tag, e.mute && styles.tagMute]} onPress={() => toggle(i, 'mute')}>
                  <Text style={styles.tagText}>M</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tag, e.solo && styles.tagSolo]} onPress={() => toggle(i, 'solo')}>
                  <Text style={[styles.tagText, e.solo && { color: colors.primaryDark }]}>S</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        );
      })}
      {pistas.length > 1 && (
        <Text style={styles.ayuda}>M silencia la pista · S deja solo esa. Silencia tu instrumento y toca con la banda.</Text>
      )}
    </View>
  );
}

function fmt(s: number) {
  if (!isFinite(s) || s < 0) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  caja: { backgroundColor: colors.primaryDark, borderRadius: radius.lg, padding: 14 },
  transporte: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  play: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  btn: { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7 },
  btnOn: { backgroundColor: colors.gold },
  btnText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  tiempo: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginLeft: 4, fontVariant: ['tabular-nums'] },
  barra: { height: 18, justifyContent: 'center', marginTop: 12, marginBottom: 6 },
  barraLlena: { position: 'absolute', left: 0, height: 6, borderRadius: 3, backgroundColor: colors.gold },
  barraFondo: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)' },
  barraZonas: { ...StyleSheet.absoluteFill, flexDirection: 'row' },
  pista: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  pistaNombre: { flex: 1, color: colors.white, fontWeight: '700', fontSize: 14 },
  tag: { width: 34, height: 30, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  tagMute: { backgroundColor: '#EF5350', borderColor: '#EF5350' },
  tagSolo: { backgroundColor: colors.gold, borderColor: colors.gold },
  tagText: { color: colors.white, fontWeight: '800' },
  ayuda: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 6 },
});
