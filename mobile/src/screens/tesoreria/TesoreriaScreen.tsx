import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ScreenHeader';
import BottomSheet from '../../components/BottomSheet';
import { Boton, Cargando, MensajeError, Vacio } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../navigation/Navigator';
import {
  Movimiento, MovimientosResp, adjuntosDeMovimiento, anularMovimiento, getMovimientos, num, quetzales, rutaAdjuntoTesoreria,
} from '../../api/tesoreria';
import { iconoArchivo } from '../../utils/archivos';
import { fechaLocal, formatFecha, formatFechaHora } from '../../utils/formato';
import { NOMBRES_MES } from '../../components/Calendario';
import { colors, radius, shadow } from '../../theme';

// Recuerda el mes visto en cada tesorería al volver del formulario
const mesVisto: Record<number, string> = {};

const primerDia = (ym: string) => `${ym}-01`;
const ultimoDia = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return fechaLocal(new Date(y, m, 0));
};
const moverMes = (ym: string, d: number) => {
  const [y, m] = ym.split('-').map(Number);
  const f = new Date(y, m - 1 + d, 1);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
};

interface Fila extends Movimiento { saldo_acumulado: number; }

export default function TesoreriaScreen({ id }: { id: number }) {
  const { api, puede, baseUrl } = useAuth();
  const { navigate } = useNavigation();
  const insets = useSafeAreaInsets();
  const [mes, setMes] = useState(() => mesVisto[id] || fechaLocal(new Date()).slice(0, 7));
  const [datos, setDatos] = useState<MovimientosResp | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<Fila | null>(null);
  const [anulando, setAnulando] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    setCargando(true);
    try {
      setDatos(await getMovimientos(api, id, primerDia(mes), ultimoDia(mes)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }, [api, id, mes]);

  useEffect(() => { mesVisto[id] = mes; cargar(); }, [cargar, id, mes]);

  // Saldo acumulado fila por fila (los anulados no suman)
  const { filas, ingresos, egresos, saldoFinal } = useMemo(() => {
    let saldo = num(datos?.saldo_inicial);
    let ing = 0, egr = 0;
    const f: Fila[] = (datos?.movimientos ?? []).map(m => {
      if (!m.anulado) {
        saldo += num(m.debito) - num(m.credito);
        ing += num(m.debito);
        egr += num(m.credito);
      }
      return { ...m, saldo_acumulado: saldo };
    });
    return { filas: f.reverse(), ingresos: ing, egresos: egr, saldoFinal: saldo };
  }, [datos]);

  const teso = datos?.tesoreria;
  const puedeEscribir = !!datos && !datos.solo_lectura && !!teso?.activo;
  const puedeAgregar = puedeEscribir && puede('tesoreria_movimientos', 'A');
  const puedeEditar = puedeEscribir && puede('tesoreria_movimientos', 'E');
  const [y, m] = mes.split('-').map(Number);
  const esMesActual = mes === fechaLocal(new Date()).slice(0, 7);

  const anular = (mov: Fila) => {
    Alert.alert('Anular movimiento', `¿Anular "${mov.concepto}"? No se puede deshacer; el movimiento queda visible pero ya no suma al saldo.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Anular', style: 'destructive', onPress: async () => {
          setAnulando(true);
          try {
            await anularMovimiento(api, id, mov.idtesoreria_movimientos);
            setDetalle(null);
            cargar();
          } catch (err) {
            Alert.alert('Tesorería', (err as Error).message);
          } finally {
            setAnulando(false);
          }
        },
      },
    ]);
  };

  const verAdjunto = (mov: Fila, i: number) => {
    const lista = adjuntosDeMovimiento(mov);
    setDetalle(null);
    navigate({
      name: 'visor',
      archivos: lista.map(a => ({ nombre: a.originalname || a.filename, mime: a.mimetype, url: `${baseUrl}${rutaAdjuntoTesoreria(a.filename)}` })),
      indice: i,
    });
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={teso?.nombre || 'Tesorería'} subtitle={datos?.solo_lectura ? 'Solo lectura' : teso?.responsable ? `Responsable: ${teso.responsable}` : undefined} />

      {/* Selector de mes */}
      <View style={styles.meses}>
        <TouchableOpacity style={styles.mesBtn} onPress={() => setMes(moverMes(mes, -1))} accessibilityLabel="Mes anterior">
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMes(fechaLocal(new Date()).slice(0, 7))} disabled={esMesActual}>
          <Text style={styles.mesTexto}>{NOMBRES_MES[m - 1]} {y}</Text>
          {!esMesActual && <Text style={styles.mesHoy}>Toca para ir al mes actual</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.mesBtn} onPress={() => setMes(moverMes(mes, 1))} accessibilityLabel="Mes siguiente">
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {!!error && <MensajeError texto={error} onReintentar={cargar} />}
      {cargando && !datos ? <Cargando /> : (
        <FlatList
          data={filas}
          keyExtractor={f => String(f.idtesoreria_movimientos)}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 + insets.bottom, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} colors={[colors.primary]} />}
          ListHeaderComponent={
            <View style={styles.resumen}>
              <View style={styles.resumenFila}>
                <Text style={styles.resumenLabel}>Saldo inicial</Text>
                <Text style={styles.resumenValor}>{quetzales(datos?.saldo_inicial)}</Text>
              </View>
              <View style={styles.resumenFila}>
                <Text style={styles.resumenLabel}>Ingresos</Text>
                <Text style={[styles.resumenValor, { color: colors.success }]}>+ {quetzales(ingresos)}</Text>
              </View>
              <View style={styles.resumenFila}>
                <Text style={styles.resumenLabel}>Egresos</Text>
                <Text style={[styles.resumenValor, { color: colors.danger }]}>− {quetzales(egresos)}</Text>
              </View>
              <View style={[styles.resumenFila, styles.resumenTotal]}>
                <Text style={styles.resumenTotalLabel}>Saldo al cierre</Text>
                <Text style={[styles.resumenTotalValor, saldoFinal < 0 && { color: colors.danger }]}>{quetzales(saldoFinal)}</Text>
              </View>
            </View>
          }
          ListEmptyComponent={<Vacio icono="receipt-outline" titulo="Sin movimientos" texto={`No hay movimientos en ${NOMBRES_MES[m - 1].toLowerCase()}.`} />}
          renderItem={({ item: f }) => {
            const ingreso = num(f.debito) > 0;
            const adj = adjuntosDeMovimiento(f).length;
            return (
              <TouchableOpacity style={[styles.mov, !!f.anulado && styles.movAnulado]} onPress={() => setDetalle(f)} activeOpacity={0.85}>
                <View style={[styles.movIcono, { backgroundColor: ingreso ? colors.successSoft : colors.dangerSoft }]}>
                  <Ionicons name={ingreso ? 'arrow-down' : 'arrow-up'} size={18} color={ingreso ? colors.success : colors.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.movConcepto, !!f.anulado && styles.tachado]} numberOfLines={2}>{f.concepto}</Text>
                  <Text style={styles.movSub} numberOfLines={1}>
                    {formatFecha(f.fecha)}{f.tipo_movimiento ? ` · ${f.tipo_movimiento}` : ''}{adj ? ` · 📎 ${adj}` : ''}{f.anulado ? ' · ANULADO' : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.movMonto, { color: ingreso ? colors.success : colors.danger }, !!f.anulado && styles.tachado]}>
                    {ingreso ? '+' : '−'} {quetzales(ingreso ? f.debito : f.credito)}
                  </Text>
                  <Text style={styles.movSaldo}>{quetzales(f.saldo_acumulado)}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {puedeAgregar && (
        <TouchableOpacity style={[styles.fab, { bottom: 20 + insets.bottom }]} onPress={() => navigate({ name: 'movimientoForm', idtesoreria: id })}
                          accessibilityLabel="Nuevo movimiento">
          <Ionicons name="add" size={30} color={colors.white} />
        </TouchableOpacity>
      )}

      <BottomSheet visible={!!detalle} onClose={() => setDetalle(null)} title="Movimiento" bloqueado={anulando}>
        {detalle && (() => {
          const ingreso = num(detalle.debito) > 0;
          const adjuntos = adjuntosDeMovimiento(detalle);
          return (
            <View>
              <Text style={[styles.detMonto, { color: ingreso ? colors.success : colors.danger }]}>
                {ingreso ? 'Ingreso' : 'Egreso'} · {quetzales(ingreso ? detalle.debito : detalle.credito)}
              </Text>
              <Text style={styles.detConcepto}>{detalle.concepto}</Text>
              <Dato icono="calendar-outline" texto={formatFecha(detalle.fecha)} />
              {!!detalle.tipo_movimiento && <Dato icono="pricetag-outline" texto={detalle.tipo_movimiento} />}
              {!!detalle.creador && <Dato icono="person-outline" texto={`Registrado por ${detalle.creador}`} />}
              {!!detalle.anulado && (
                <Dato icono="close-circle-outline" color={colors.danger}
                      texto={`Anulado${detalle.usuario_anulacion ? ` por ${detalle.usuario_anulacion}` : ''}${detalle.fecha_anulacion ? ` · ${formatFechaHora(detalle.fecha_anulacion)}` : ''}`} />
              )}
              {adjuntos.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.detSeccion}>Comprobantes</Text>
                  {adjuntos.map((a, i) => (
                    <TouchableOpacity key={a.filename} style={styles.adjunto} onPress={() => verAdjunto(detalle, i)}>
                      <Ionicons name={iconoArchivo(a.mimetype) as any} size={20} color={colors.primary} />
                      <Text style={styles.adjuntoNombre} numberOfLines={1}>{a.originalname || a.filename}</Text>
                      <Ionicons name="eye-outline" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {puedeEditar && !detalle.anulado && (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <Boton titulo="Editar" icono="create-outline" variante="secundario" style={{ flex: 1 }}
                         onPress={() => { const mov = detalle; setDetalle(null); navigate({ name: 'movimientoForm', idtesoreria: id, movimiento: mov }); }} />
                  <Boton titulo="Anular" icono="close-circle-outline" variante="peligro" style={{ flex: 1 }} cargando={anulando} onPress={() => anular(detalle)} />
                </View>
              )}
            </View>
          );
        })()}
      </BottomSheet>
    </View>
  );
}

function Dato({ icono, texto, color }: { icono: string; texto: string; color?: string }) {
  return (
    <View style={styles.dato}>
      <Ionicons name={icono as any} size={16} color={color || colors.textMuted} />
      <Text style={[styles.datoTexto, color ? { color } : null]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  meses: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  mesBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  mesTexto: { fontSize: 17, fontWeight: '800', color: colors.text, textAlign: 'center' },
  mesHoy: { fontSize: 11, color: colors.primaryLight, textAlign: 'center' },
  resumen: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, marginBottom: 12, ...shadow },
  resumenFila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  resumenLabel: { color: colors.textMuted, fontSize: 14 },
  resumenValor: { color: colors.text, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  resumenTotal: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 6, paddingTop: 8 },
  resumenTotalLabel: { color: colors.text, fontSize: 15, fontWeight: '800' },
  resumenTotalValor: { color: colors.primary, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  mov: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: radius.md, padding: 12, marginBottom: 8, ...shadow },
  movAnulado: { opacity: 0.55 },
  movIcono: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  movConcepto: { fontSize: 14, fontWeight: '700', color: colors.text },
  movSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  movMonto: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  movSaldo: { fontSize: 11, color: colors.textLight, marginTop: 2, fontVariant: ['tabular-nums'] },
  tachado: { textDecorationLine: 'line-through' },
  fab: { position: 'absolute', right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow, shadowOpacity: 0.3, elevation: 6 },
  detMonto: { fontSize: 20, fontWeight: '800' },
  detConcepto: { fontSize: 16, color: colors.text, marginTop: 4, marginBottom: 8 },
  detSeccion: { fontSize: 13, fontWeight: '800', color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase' },
  dato: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  datoTexto: { fontSize: 14, color: colors.text, flex: 1 },
  adjunto: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bg, borderRadius: radius.md, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: colors.border },
  adjuntoNombre: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
});
