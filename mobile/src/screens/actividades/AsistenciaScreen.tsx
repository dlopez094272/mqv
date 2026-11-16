import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import BottomSheet from '../../components/BottomSheet';
import { Campo } from '../../components/Formulario';
import { Boton, MensajeError, Vacio } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { agregarAsistente, getAsistencia, quitarAsistente } from '../../api/actividades';
import { AsistenciaActividad, PersonaAsistencia, VisitanteAsistencia } from '../../types';
import { iniciales, normalizar } from '../../utils/formato';
import { colors, radius, shadow } from '../../theme';

type Filtro = 'todos' | 'asisten' | 'visitantes';

export default function AsistenciaScreen({ id, nombre }: { id: number; nombre: string }) {
  const { api, baseUrl, puede } = useAuth();
  const insets = useSafeAreaInsets();
  const [datos, setDatos] = useState<AsistenciaActividad | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [procesando, setProcesando] = useState<number | null>(null);
  const [hojaVisitante, setHojaVisitante] = useState(false);
  const [visitante, setVisitante] = useState({ nombre_completo: '', telefono: '', comentarios: '' });
  const [guardandoVisitante, setGuardandoVisitante] = useState(false);

  const puedeAgregar = puede('actividades_asistentes', 'A');
  const puedeQuitar = puede('actividades_asistentes', 'D');

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setDatos(await getAsistencia(api, id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }, [api, id]);

  useEffect(() => { cargar(); }, [cargar]);

  const personas = useMemo(() => {
    if (!datos) return [];
    const q = normalizar(busqueda.trim());
    return datos.personas.filter(p =>
      (filtro !== 'asisten' || p.asiste) && (!q || normalizar(p.nombre_completo).includes(q) || normalizar(p.grupos_nombres).includes(q)));
  }, [datos, busqueda, filtro]);

  const visitantes = useMemo(() => {
    if (!datos) return [];
    const q = normalizar(busqueda.trim());
    return datos.visitantes.filter(v => !q || normalizar(v.nombre_completo).includes(q));
  }, [datos, busqueda]);

  const marcarLocal = (idp: number, idasist: number | null) => setDatos(d => {
    if (!d) return d;
    const lista = d.personas.map(p => (p.idpersonas === idp ? { ...p, asiste: idasist ? 1 : 0, idactividades_asistentes: idasist } : p));
    const n = lista.filter(p => p.asiste).length;
    return { ...d, personas: lista, contadores: { ...d.contadores, personas: n, total: n + d.contadores.visitantes } };
  });

  const toggle = async (p: PersonaAsistencia) => {
    if (procesando) return;
    if (p.asiste && !puedeQuitar) { Alert.alert('Asistencia', 'No tienes permiso para quitar asistentes.'); return; }
    if (!p.asiste && !puedeAgregar) { Alert.alert('Asistencia', 'No tienes permiso para registrar asistentes.'); return; }
    setProcesando(p.idpersonas);
    try {
      if (p.asiste && p.idactividades_asistentes) {
        await quitarAsistente(api, id, p.idactividades_asistentes);
        marcarLocal(p.idpersonas, null);
      } else {
        const r = await agregarAsistente(api, id, { idpersonas: p.idpersonas });
        marcarLocal(p.idpersonas, r.id);
      }
    } catch (err) {
      Alert.alert('Asistencia', (err as Error).message);
      cargar();
    } finally {
      setProcesando(null);
    }
  };

  const guardarVisitante = async () => {
    if (!visitante.nombre_completo.trim()) { Alert.alert('Visitante', 'Escribe el nombre del visitante.'); return; }
    setGuardandoVisitante(true);
    try {
      await agregarAsistente(api, id, visitante);
      setHojaVisitante(false);
      setVisitante({ nombre_completo: '', telefono: '', comentarios: '' });
      cargar();
    } catch (err) {
      Alert.alert('Visitante', (err as Error).message);
    } finally {
      setGuardandoVisitante(false);
    }
  };

  const quitarVisitante = (v: VisitanteAsistencia) => {
    Alert.alert('Quitar visitante', `¿Quitar a ${v.nombre_completo}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar', style: 'destructive', onPress: async () => {
          try { await quitarAsistente(api, id, v.idactividades_asistentes); cargar(); }
          catch (err) { Alert.alert('Visitante', (err as Error).message); }
        },
      },
    ]);
  };

  const c = datos?.contadores;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Asistencia" subtitle={nombre} />
      <View style={styles.resumen}>
        {[
          { n: c?.personas ?? 0, t: 'Personas' },
          { n: c?.visitantes ?? 0, t: 'Visitantes' },
          { n: c?.total ?? 0, t: 'Total' },
        ].map(x => (
          <View key={x.t} style={styles.contador}>
            <Text style={styles.contadorN}>{x.n}</Text>
            <Text style={styles.contadorT}>{x.t}</Text>
          </View>
        ))}
      </View>
      <View style={styles.barra}>
        <View style={styles.buscador}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput style={styles.buscadorInput} value={busqueda} onChangeText={setBusqueda} placeholder="Buscar por nombre o grupo"
                     placeholderTextColor={colors.textLight} />
          {!!busqueda && <TouchableOpacity onPress={() => setBusqueda('')}><Ionicons name="close-circle" size={18} color={colors.textLight} /></TouchableOpacity>}
        </View>
        <View style={styles.filtros}>
          {(['todos', 'asisten', 'visitantes'] as Filtro[]).map(f => (
            <TouchableOpacity key={f} style={[styles.filtro, filtro === f && styles.filtroOn]} onPress={() => setFiltro(f)}>
              <Text style={[styles.filtroText, filtro === f && { color: colors.white }]}>
                {f === 'todos' ? 'Todos' : f === 'asisten' ? 'Asistieron' : 'Visitantes'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {!!error && <MensajeError texto={error} onReintentar={cargar} />}

      {filtro === 'visitantes' ? (
        <FlatList
          data={visitantes}
          keyExtractor={v => String(v.idactividades_asistentes)}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 + insets.bottom }}
          refreshControl={<RefreshControl refreshing={cargando} onRefresh={() => { setCargando(true); cargar(); }} colors={[colors.primary]} />}
          ListEmptyComponent={!cargando ? <Vacio icono="person-add-outline" titulo="Sin visitantes" texto="Registra a quienes nos visitan por primera vez." /> : null}
          renderItem={({ item: v }) => (
            <View style={styles.fila}>
              <View style={[styles.avatar, { backgroundColor: colors.warningSoft }]}><Text style={[styles.avatarText, { color: colors.warning }]}>{iniciales(v.nombre_completo)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nombre}>{v.nombre_completo}</Text>
                {!!(v.telefono || v.comentarios) && <Text style={styles.sub} numberOfLines={2}>{[v.telefono, v.comentarios].filter(Boolean).join(' · ')}</Text>}
              </View>
              {puedeQuitar && (
                <TouchableOpacity onPress={() => quitarVisitante(v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      ) : (
        <FlatList
          data={personas}
          keyExtractor={p => String(p.idpersonas)}
          initialNumToRender={20}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 + insets.bottom }}
          refreshControl={<RefreshControl refreshing={cargando} onRefresh={() => { setCargando(true); cargar(); }} colors={[colors.primary]} />}
          ListEmptyComponent={!cargando ? <Vacio icono="people-outline" titulo={busqueda ? 'Sin resultados' : 'Sin registros'} /> : null}
          renderItem={({ item: p }) => (
            <TouchableOpacity style={[styles.fila, !!p.asiste && styles.filaOn]} activeOpacity={0.8} onPress={() => toggle(p)}>
              <View style={styles.avatar}>
                {p.foto ? <Image source={{ uri: `${baseUrl}/uploads/personas/${p.foto}` }} style={styles.avatarImg} />
                        : <Text style={styles.avatarText}>{iniciales(p.nombre_completo)}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nombre} numberOfLines={1}>{p.nombre_completo}</Text>
                {!!p.grupos_nombres && <Text style={styles.sub} numberOfLines={1}>{p.grupos_nombres}</Text>}
              </View>
              <Ionicons
                name={procesando === p.idpersonas ? 'hourglass-outline' : p.asiste ? 'checkmark-circle' : 'ellipse-outline'}
                size={28} color={p.asiste ? colors.success : colors.textLight} />
            </TouchableOpacity>
          )}
        />
      )}

      {puedeAgregar && (
        <TouchableOpacity style={[styles.fab, { bottom: 24 + insets.bottom }]} onPress={() => setHojaVisitante(true)} activeOpacity={0.85}>
          <Ionicons name="person-add" size={20} color={colors.white} />
          <Text style={styles.fabText}>Visitante</Text>
        </TouchableOpacity>
      )}

      <BottomSheet visible={hojaVisitante} onClose={() => setHojaVisitante(false)} title="Registrar visitante" bloqueado={guardandoVisitante}>
        <Campo etiqueta="Nombre completo" requerido value={visitante.nombre_completo} onChangeText={t => setVisitante(v => ({ ...v, nombre_completo: t }))} />
        <Campo etiqueta="Teléfono" keyboardType="phone-pad" value={visitante.telefono} onChangeText={t => setVisitante(v => ({ ...v, telefono: t }))} />
        <Campo etiqueta="Comentarios" value={visitante.comentarios} onChangeText={t => setVisitante(v => ({ ...v, comentarios: t }))} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <Boton titulo="Cancelar" variante="secundario" onPress={() => setHojaVisitante(false)} style={{ flex: 1 }} deshabilitado={guardandoVisitante} />
          <Boton titulo="Registrar" onPress={guardarVisitante} cargando={guardandoVisitante} style={{ flex: 1 }} />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  resumen: { flexDirection: 'row', backgroundColor: colors.primary, paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  contador: { flex: 1, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.md, paddingVertical: 8, alignItems: 'center' },
  contadorN: { color: colors.white, fontSize: 22, fontWeight: '900' },
  contadorT: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700' },
  barra: { padding: 12, paddingBottom: 4, gap: 8 },
  buscador: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border },
  buscadorInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: colors.text },
  filtros: { flexDirection: 'row', gap: 8 },
  filtro: { flex: 1, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  filtroOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  filtroText: { fontSize: 13, fontWeight: '700', color: colors.text },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.md, padding: 10, marginBottom: 6, borderWidth: 1.5, borderColor: 'transparent' },
  filaOn: { borderColor: colors.success, backgroundColor: colors.successSoft },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 42, height: 42 },
  avatarText: { color: colors.primary, fontWeight: '800' },
  nombre: { fontSize: 15, fontWeight: '700', color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  fab: { position: 'absolute', right: 20, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 28, paddingHorizontal: 18, paddingVertical: 14, ...shadow, shadowOpacity: 0.3, elevation: 6 },
  fabText: { color: colors.white, fontWeight: '800', fontSize: 15 },
});
