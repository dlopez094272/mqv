import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { acordeVisible, ClaseSeccion, OpcionesVista, parsearChordPro } from '../utils/chordpro';
import { colors } from '../theme';

interface Props {
  texto: string | null;
  opciones: OpcionesVista;
  tamano?: number;
  oscuro?: boolean;
  mostrarAcordes?: boolean;
}

const COLOR_SECCION: Record<ClaseSeccion, { fondo: string; texto: string }> = {
  estrofa: { fondo: colors.primarySoft, texto: colors.primary },
  coro:    { fondo: colors.blueSoft, texto: colors.blueDark },
  puente:  { fondo: colors.warningSoft, texto: colors.warning },
  intro:   { fondo: colors.successSoft, texto: colors.success },
  otro:    { fondo: colors.primarySoft, texto: colors.primary },
};

/** Letra ChordPro con cada acorde encima de la sílaba donde cambia. */
export default function HojaAcordes({ texto, opciones, tamano = 17, oscuro = false, mostrarAcordes = true }: Props) {
  const cancion = useMemo(() => parsearChordPro(texto), [texto]);
  const colorTexto = oscuro ? '#F1F1F1' : colors.text;
  const colorAcorde = oscuro ? colors.gold : colors.primary;

  if (!cancion.lineas.length) {
    return <Text style={[styles.vacio, oscuro && { color: '#999' }]}>Esta canción aún no tiene letra con acordes.</Text>;
  }

  return (
    <View>
      {cancion.lineas.map((l, i) => {
        if (l.tipo === 'vacia') return <View key={i} style={{ height: tamano * 0.7 }} />;
        if (l.tipo === 'comentario') {
          return <Text key={i} style={[styles.comentario, { fontSize: tamano * 0.82 }, oscuro && { color: '#AAA' }]}>{l.texto}</Text>;
        }
        if (l.tipo === 'seccion') {
          const c = COLOR_SECCION[l.clase];
          return (
            <View key={i} style={[styles.seccion, { backgroundColor: oscuro ? 'rgba(255,255,255,0.12)' : c.fondo }]}>
              <Text style={[styles.seccionText, { color: oscuro ? colors.white : c.texto, fontSize: tamano * 0.68 }]}>{l.nombre}</Text>
            </View>
          );
        }
        if (l.soloAcordes && !mostrarAcordes) return null;
        return (
          <View key={i} style={styles.linea}>
            {l.segmentos.map((s, j) => (
              <View key={j} style={styles.seg}>
                {mostrarAcordes && (
                  <Text style={[styles.acorde, { color: colorAcorde, fontSize: tamano * 0.9, minHeight: tamano * 1.15 }, l.soloAcordes && { paddingRight: tamano }]}>
                    {s.acorde ? acordeVisible(s.acorde, opciones) + ' ' : ''}
                  </Text>
                )}
                {!l.soloAcordes && (
                  <Text style={{ color: colorTexto, fontSize: tamano }}>{s.texto || (s.acorde && mostrarAcordes ? ' ' : '')}</Text>
                )}
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  linea: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 4 },
  seg: { flexDirection: 'column' },
  acorde: { fontWeight: '800' },
  seccion: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2, marginTop: 14, marginBottom: 6 },
  seccionText: { fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  comentario: { fontStyle: 'italic', color: colors.textMuted, marginVertical: 4 },
  vacio: { color: colors.textMuted, fontStyle: 'italic', textAlign: 'center', padding: 20 },
});
