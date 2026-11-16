import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fechaLocal } from '../utils/formato';
import { colors, radius } from '../theme';

export const NOMBRES_MES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

interface Props {
  /** Primer día del mes que se muestra. */
  mes: Date;
  onCambiarMes: (mes: Date) => void;
  /** Fecha seleccionada 'YYYY-MM-DD'. */
  seleccion: string | null;
  onSeleccionar: (fecha: string) => void;
  /** Colores de las actividades de cada día ('YYYY-MM-DD' → colores). */
  marcas?: Record<string, string[]>;
  /** Rango resaltado (selector de fechas inicio–fin). */
  rango?: { desde: string; hasta: string } | null;
  compacto?: boolean;
}

/** Calendario mensual (domingo a sábado) con puntos de color por actividad. */
export default function Calendario({ mes, onCambiarMes, seleccion, onSeleccionar, marcas, rango, compacto }: Props) {
  const hoy = fechaLocal(new Date());

  const semanas = useMemo(() => {
    const primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const inicio = new Date(primero);
    inicio.setDate(1 - primero.getDay());
    const filas: { fecha: string; dia: number; delMes: boolean }[][] = [];
    const d = new Date(inicio);
    for (let s = 0; s < 6; s++) {
      const fila = [];
      for (let i = 0; i < 7; i++) {
        fila.push({ fecha: fechaLocal(d), dia: d.getDate(), delMes: d.getMonth() === mes.getMonth() });
        d.setDate(d.getDate() + 1);
      }
      // Omite la sexta semana si es toda del mes siguiente
      if (s === 5 && !fila.some(c => c.delMes)) break;
      filas.push(fila);
    }
    return filas;
  }, [mes]);

  const mover = (delta: number) => onCambiarMes(new Date(mes.getFullYear(), mes.getMonth() + delta, 1));
  const alto = compacto ? 40 : 50;

  return (
    <View>
      <View style={styles.cabecera}>
        <TouchableOpacity style={styles.flecha} onPress={() => mover(-1)} accessibilityLabel="Mes anterior">
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { const n = new Date(); onCambiarMes(new Date(n.getFullYear(), n.getMonth(), 1)); onSeleccionar(hoy); }}>
          <Text style={styles.mes}>{NOMBRES_MES[mes.getMonth()]} {mes.getFullYear()}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.flecha} onPress={() => mover(1)} accessibilityLabel="Mes siguiente">
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.fila}>
        {DIAS_SEMANA.map((d, i) => <Text key={i} style={styles.diaSemana}>{d}</Text>)}
      </View>

      {semanas.map((fila, si) => (
        <View key={si} style={styles.fila}>
          {fila.map(c => {
            const sel = c.fecha === seleccion;
            const enRango = !!rango && c.fecha >= rango.desde && c.fecha <= rango.hasta;
            const puntos = marcas?.[c.fecha] ?? [];
            return (
              <TouchableOpacity key={c.fecha} style={[styles.celda, { height: alto }]} onPress={() => onSeleccionar(c.fecha)} activeOpacity={0.7}>
                <View style={[
                  styles.numero,
                  enRango && styles.numeroRango,
                  c.fecha === hoy && styles.numeroHoy,
                  sel && styles.numeroSel,
                ]}>
                  <Text style={[
                    styles.numeroText,
                    !c.delMes && { color: colors.textLight },
                    c.fecha === hoy && { color: colors.primary, fontWeight: '800' },
                    sel && { color: colors.white, fontWeight: '800' },
                  ]}>{c.dia}</Text>
                </View>
                {!compacto && (
                  <View style={styles.puntos}>
                    {puntos.slice(0, 3).map((col, i) => <View key={i} style={[styles.punto, { backgroundColor: col }]} />)}
                    {puntos.length > 3 && <Text style={styles.mas}>+</Text>}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  flecha: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  mes: { fontSize: 18, fontWeight: '800', color: colors.text },
  fila: { flexDirection: 'row' },
  diaSemana: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '800', color: colors.textMuted, paddingVertical: 6 },
  celda: { flex: 1, alignItems: 'center', paddingTop: 2 },
  numero: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  numeroRango: { backgroundColor: colors.primarySoft },
  numeroHoy: { borderWidth: 1.5, borderColor: colors.primary },
  numeroSel: { backgroundColor: colors.primary, borderColor: colors.primary },
  numeroText: { fontSize: 15, color: colors.text, fontWeight: '600' },
  puntos: { flexDirection: 'row', gap: 3, marginTop: 3, alignItems: 'center', height: 8 },
  punto: { width: 6, height: 6, borderRadius: 3 },
  mas: { fontSize: 10, color: colors.textMuted, fontWeight: '800', lineHeight: 10 },
});
