import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import Calendario from '../../components/Calendario';
import { MensajeError, TituloSeccion } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../navigation/Navigator';
import { getActividades, urlLogoActividad } from '../../api/actividades';
import { Actividad } from '../../types';
import { cuandoEs, fechaLarga, fechaLocal, sumarDias } from '../../utils/formato';
import { colors, radius, shadow } from '../../theme';

// Se recuerda el mes/día al volver de una actividad (las pantallas se montan de nuevo).
let ultimaSeleccion: string | null = null;

const dia = (f: string) => String(f).slice(0, 10);
const hora = (h: string | null) => (h ? String(h).slice(0, 5) : '');

export function horario(a: Actividad) {
  const hi = hora(a.hora_inicio), hf = hora(a.hora_fin);
  if (hi && hf) return `${hi} – ${hf}`;
  return hi || 'Todo el día';
}

export default function ActividadesScreen({ fecha }: { fecha?: string }) {
  const { api, baseUrl, puede } = useAuth();
  const { navigate } = useNavigation();
  const insets = useSafeAreaInsets();

  const inicial = fecha || ultimaSeleccion || fechaLocal(new Date());
  const [seleccion, setSeleccion] = useState(inicial);
  const [mes, setMes] = useState(() => { const [y, m] = inicial.split('-').map(Number); return new Date(y, m - 1, 1); });
  const [lista, setLista] = useState<Actividad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setLista(await getActividades(api));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }, [api]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { ultimaSeleccion = seleccion; }, [seleccion]);

  // Colores por día del mes visible (una actividad de varios días marca cada día).
  const { marcas, delMes } = useMemo(() => {
    const desde = fechaLocal(new Date(mes.getFullYear(), mes.getMonth(), 1 - 7));
    const hasta = fechaLocal(new Date(mes.getFullYear(), mes.getMonth() + 1, 7));
    const ini = fechaLocal(mes), fin = fechaLocal(new Date(mes.getFullYear(), mes.getMonth() + 1, 0));
    const m: Record<string, string[]> = {};
    const enMes: Actividad[] = [];
    for (const a of lista) {
      const fi = dia(a.fecha_inicio), ff = dia(a.fecha_fin || a.fecha_inicio);
      if (ff < desde || fi > hasta) continue;
      if (!(ff < ini || fi > fin)) enMes.push(a);
      let d = fi < desde ? desde : fi;
      const tope = ff > hasta ? hasta : ff;
      let guard = 0;
      while (d <= tope && guard++ < 62) {
        (m[d] ||= []).push(a.categoria_color || colors.primary);
        d = sumarDias(d, 1);
      }
    }
    return { marcas: m, delMes: enMes };
  }, [lista, mes]);

  const delDia = useMemo(
    () => lista
      .filter(a => dia(a.fecha_inicio) <= seleccion && dia(a.fecha_fin || a.fecha_inicio) >= seleccion)
      .sort((a, b) => hora(a.hora_inicio).localeCompare(hora(b.hora_inicio))),
    [lista, seleccion]
  );

  const tarjeta = (a: Actividad, compacta = false) => (
    <TouchableOpacity key={`${compacta ? 'm' : 'd'}${a.idactividades}`} style={styles.card} activeOpacity={0.85}
                      onPress={() => navigate({ name: 'actividad', id: a.idactividades })}>
      <View style={[styles.barra, { backgroundColor: a.categoria_color || colors.primary }]} />
      {a.logo ? (
        <Image source={{ uri: urlLogoActividad(baseUrl, a.logo) }} style={styles.logo} />
      ) : compacta ? (
        <View style={[styles.fecha, { backgroundColor: a.categoria_color || colors.primary }]}>
          <Text style={styles.fechaDia}>{Number(dia(a.fecha_inicio).slice(8, 10))}</Text>
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.titulo} numberOfLines={2}>{a.nombre}</Text>
        <Text style={styles.sub} numberOfLines={1}>
          {compacta ? `${fechaLarga(a.fecha_inicio)} · ` : ''}{horario(a)}{a.lugar ? ` · ${a.lugar}` : ''}
        </Text>
        {!!a.categoria && !compacta && <Text style={[styles.cat, { color: a.categoria_color }]}>{a.categoria}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Actividades" subtitle="Calendario de la iglesia" />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 90 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={() => { setCargando(true); cargar(); }} colors={[colors.primary]} />}
      >
        {!!error && <MensajeError texto={error} onReintentar={cargar} />}
        <View style={styles.calendario}>
          <Calendario mes={mes} onCambiarMes={setMes} seleccion={seleccion}
                      onSeleccionar={f => { setSeleccion(f); const [y, m] = f.split('-').map(Number); if (m - 1 !== mes.getMonth() || y !== mes.getFullYear()) setMes(new Date(y, m - 1, 1)); }}
                      marcas={marcas} />
        </View>

        <TituloSeccion>{`${cuandoEs(seleccion)} · ${fechaLarga(seleccion)}`}</TituloSeccion>
        {delDia.length ? delDia.map(a => tarjeta(a)) : (
          <Text style={styles.vacio}>{cargando ? 'Cargando…' : 'No hay actividades este día.'}</Text>
        )}

        {delMes.length > 0 && (
          <>
            <TituloSeccion>{`Todo el mes (${delMes.length})`}</TituloSeccion>
            {delMes.map(a => tarjeta(a, true))}
          </>
        )}
      </ScrollView>

      {puede('actividades', 'A') && (
        <TouchableOpacity style={[styles.fab, { bottom: 24 + insets.bottom }]} activeOpacity={0.85}
                          onPress={() => navigate({ name: 'actividadForm', fecha: seleccion })} accessibilityLabel="Nueva actividad">
          <Ionicons name="add" size={30} color={colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  calendario: { backgroundColor: colors.card, borderRadius: radius.xl, padding: 12, ...shadow },
  vacio: { color: colors.textMuted, fontStyle: 'italic', textAlign: 'center', paddingVertical: 14 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: 12, paddingLeft: 16, marginBottom: 8, overflow: 'hidden', ...shadow },
  barra: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  logo: { width: 42, height: 42, borderRadius: 10, backgroundColor: colors.bg },
  fecha: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fechaDia: { color: colors.white, fontWeight: '800', fontSize: 18 },
  titulo: { fontSize: 15, fontWeight: '800', color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  cat: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  fab: { position: 'absolute', right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow, shadowOpacity: 0.3, elevation: 6 },
});
