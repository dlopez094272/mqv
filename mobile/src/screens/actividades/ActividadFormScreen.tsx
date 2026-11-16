import React, { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import ScreenHeader from '../../components/ScreenHeader';
import BottomSheet from '../../components/BottomSheet';
import Calendario from '../../components/Calendario';
import { Campo, CampoBoton, Chips } from '../../components/Formulario';
import { Boton, Cargando, MensajeError, Tarjeta, TituloSeccion } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../navigation/Navigator';
import {
  actualizarActividad, crearActividad, getActividad, getCategorias, getGruposActividad, getGruposDisponibles, getLugares, urlLogoActividad,
} from '../../api/actividades';
import { OpcionLookup } from '../../types';
import { fechaLarga, fechaLocal } from '../../utils/formato';
import { colors, radius } from '../../theme';

/** "1830" / "18:30" / "8" → "18:30" / "08:00"; '' si no es válida. */
function normalizarHora(v: string): string {
  const t = v.trim();
  if (!t) return '';
  const m = /^(\d{1,2})(?::?(\d{2}))?$/.exec(t);
  if (!m) return 'x';
  const h = Number(m[1]), min = Number(m[2] ?? 0);
  if (h > 23 || min > 59) return 'x';
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

const diasEntre = (a: string, b: string) => {
  const [y1, m1, d1] = a.split('-').map(Number), [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / 86_400_000) + 1;
};

export default function ActividadFormScreen({ id, fecha }: { id?: number; fecha?: string }) {
  const { api, baseUrl } = useAuth();
  const { goBack, replace } = useNavigation();
  const insets = useSafeAreaInsets();
  const editando = !!id;

  const hoy = fecha || fechaLocal(new Date());
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [idcategorias, setIdcategorias] = useState<number | null>(null);
  const [idlugares, setIdlugares] = useState<number | null>(null);
  const [grupos, setGrupos] = useState<number[]>([]);
  const [porDia, setPorDia] = useState(false);
  const [logoActual, setLogoActual] = useState<string | null>(null);
  const [logoNuevo, setLogoNuevo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [quitarLogo, setQuitarLogo] = useState(false);

  const [categorias, setCategorias] = useState<OpcionLookup[]>([]);
  const [lugares, setLugares] = useState<OpcionLookup[]>([]);
  const [gruposDisp, setGruposDisp] = useState<OpcionLookup[]>([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Selector de fechas: primer toque = inicio, segundo = fin
  const [selector, setSelector] = useState(false);
  const [rango, setRango] = useState<{ desde: string; hasta: string | null }>({ desde: hoy, hasta: hoy });
  const [mesSelector, setMesSelector] = useState(() => { const [y, m] = hoy.split('-').map(Number); return new Date(y, m - 1, 1); });

  useEffect(() => {
    (async () => {
      try {
        const [c, l, g] = await Promise.all([getCategorias(api), getLugares(api), getGruposDisponibles(api).catch(() => [])]);
        setCategorias(c); setLugares(l); setGruposDisp(g);
        if (id) {
          const [a, gs] = await Promise.all([getActividad(api, id), getGruposActividad(api, id).catch(() => [])]);
          setNombre(a.nombre);
          setDescripcion(a.descripcion || '');
          setFechaInicio(a.fecha_inicio.slice(0, 10));
          setFechaFin((a.fecha_fin || a.fecha_inicio).slice(0, 10));
          setHoraInicio(a.hora_inicio ? a.hora_inicio.slice(0, 5) : '');
          setHoraFin(a.hora_fin ? a.hora_fin.slice(0, 5) : '');
          setIdcategorias(a.idcategorias);
          setIdlugares(a.idlugares);
          setGrupos(gs);
          setLogoActual(a.logo);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setCargando(false);
      }
    })();
  }, [api, id]);

  const abrirSelector = () => {
    setRango({ desde: fechaInicio, hasta: fechaFin });
    const [y, m] = fechaInicio.split('-').map(Number);
    setMesSelector(new Date(y, m - 1, 1));
    setSelector(true);
  };

  const tocarDia = (f: string) => {
    setRango(r => (r.hasta === null && f >= r.desde ? { desde: r.desde, hasta: f } : { desde: f, hasta: null }));
  };

  const confirmarFechas = () => {
    setFechaInicio(rango.desde);
    setFechaFin(rango.hasta ?? rango.desde);
    setSelector(false);
  };

  const elegirLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Logo', 'Se necesita permiso para acceder a tus fotos.'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!r.canceled && r.assets?.[0]) { setLogoNuevo(r.assets[0]); setQuitarLogo(false); }
  };

  const guardar = async () => {
    const hi = normalizarHora(horaInicio), hf = normalizarHora(horaFin);
    if (!nombre.trim()) { Alert.alert('Actividad', 'Escribe el nombre de la actividad.'); return; }
    if (hi === 'x' || hf === 'x') { Alert.alert('Actividad', 'Escribe las horas como 18:30 (formato de 24 horas).'); return; }
    if (fechaFin < fechaInicio) { Alert.alert('Actividad', 'La fecha de fin no puede ser anterior a la de inicio.'); return; }

    const fd = new FormData();
    fd.append('nombre', nombre.trim());
    fd.append('descripcion', descripcion.trim());
    fd.append('fecha_inicio', fechaInicio);
    fd.append('fecha_fin', fechaFin);
    fd.append('hora_inicio', hi);
    fd.append('hora_fin', hf);
    fd.append('idcategorias', idcategorias ? String(idcategorias) : '');
    fd.append('idlugares', idlugares ? String(idlugares) : '');
    fd.append('grupos', JSON.stringify(grupos));
    if (porDia && fechaFin > fechaInicio) fd.append(editando ? 'dividir_por_dia' : 'crear_por_dia', 'true');
    if (quitarLogo) fd.append('eliminar_logo', 'true');
    if (logoNuevo) {
      const ext = (logoNuevo.fileName?.split('.').pop() || logoNuevo.uri.split('.').pop() || 'jpg').toLowerCase();
      fd.append('logo', { uri: logoNuevo.uri, name: logoNuevo.fileName || `logo.${ext}`, type: logoNuevo.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}` } as any);
    }

    setGuardando(true);
    try {
      if (editando) {
        await actualizarActividad(api, id!, fd);
        goBack();
      } else {
        const r = await crearActividad(api, fd);
        replace({ name: 'actividad', id: r.id });
      }
    } catch (err) {
      Alert.alert('No se pudo guardar', (err as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  const dias = diasEntre(fechaInicio, fechaFin);
  const logoUri = logoNuevo?.uri ?? (logoActual && !quitarLogo ? urlLogoActividad(baseUrl, logoActual) : null);

  return (
    <View style={styles.container}>
      <ScreenHeader title={editando ? 'Editar actividad' : 'Nueva actividad'} subtitle={editando ? nombre : 'Actividades'} />
      {!!error && <MensajeError texto={error} />}
      {cargando ? <Cargando /> : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }} keyboardShouldPersistTaps="handled">
            <Tarjeta>
              <View style={styles.filaLogo}>
                <TouchableOpacity style={styles.logo} onPress={elegirLogo} accessibilityLabel="Elegir logo">
                  {logoUri ? <Image source={{ uri: logoUri }} style={styles.logoImg} /> : <Ionicons name="image-outline" size={28} color={colors.textMuted} />}
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Campo etiqueta="Nombre" requerido value={nombre} onChangeText={setNombre} placeholder="Nombre de la actividad" />
                </View>
              </View>
              {!!logoUri && (
                <TouchableOpacity onPress={() => { setLogoNuevo(null); setQuitarLogo(!!logoActual); }}>
                  <Text style={styles.quitarLogo}>Quitar logo</Text>
                </TouchableOpacity>
              )}

              <CampoBoton etiqueta="Fecha" requerido icono="calendar-outline" onPress={abrirSelector}
                          valor={fechaFin !== fechaInicio ? `${fechaLarga(fechaInicio)} → ${fechaLarga(fechaFin)} (${dias} días)` : fechaLarga(fechaInicio)} />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Campo etiqueta="Hora inicio" icono="time-outline" value={horaInicio} onChangeText={setHoraInicio}
                         onBlur={() => { const h = normalizarHora(horaInicio); if (h !== 'x') setHoraInicio(h); }}
                         placeholder="18:30" keyboardType="numbers-and-punctuation" maxLength={5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Campo etiqueta="Hora fin" icono="time-outline" value={horaFin} onChangeText={setHoraFin}
                         onBlur={() => { const h = normalizarHora(horaFin); if (h !== 'x') setHoraFin(h); }}
                         placeholder="20:00" keyboardType="numbers-and-punctuation" maxLength={5} />
                </View>
              </View>

              {dias > 1 && (
                <View style={styles.switchFila}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchTitulo}>Una actividad por cada día</Text>
                    <Text style={styles.switchTexto}>Se {editando ? 'divide' : 'crean'} en {dias} actividades de un día (para tomar asistencia por día).</Text>
                  </View>
                  <Switch value={porDia} onValueChange={setPorDia} trackColor={{ true: colors.primaryLight, false: colors.border }} thumbColor={porDia ? colors.primary : '#f4f3f4'} />
                </View>
              )}

              <Campo etiqueta="Descripción" value={descripcion} onChangeText={setDescripcion} multiline placeholder="Detalles, indicaciones, etc." />
            </Tarjeta>

            {categorias.length > 0 && (
              <>
                <TituloSeccion>Categoría</TituloSeccion>
                <Chips opciones={categorias.map(c => ({ valor: c.id, texto: c.nombre, color: c.color }))} valor={idcategorias} onCambiar={setIdcategorias} />
              </>
            )}

            {lugares.length > 0 && (
              <>
                <TituloSeccion>Lugar</TituloSeccion>
                <Chips opciones={lugares.map(l => ({ valor: l.id, texto: l.nombre }))} valor={idlugares} onCambiar={setIdlugares} />
              </>
            )}

            {gruposDisp.length > 0 && (
              <>
                <TituloSeccion>Grupos que participan</TituloSeccion>
                <Chips multiple opciones={gruposDisp.map(g => ({ valor: g.id, texto: g.nombre }))} valor={grupos} onCambiar={setGrupos} />
              </>
            )}

            <Boton titulo={editando ? 'Guardar cambios' : 'Crear actividad'} icono="checkmark" cargando={guardando} onPress={guardar} style={{ marginTop: 24 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      <BottomSheet visible={selector} onClose={() => setSelector(false)} title="Fechas de la actividad">
        <Text style={styles.selectorAyuda}>
          {rango.hasta === null ? 'Toca el día de fin (o confirma para un solo día).' : 'Toca el día de inicio. Para varios días, toca luego el día de fin.'}
        </Text>
        <Calendario compacto mes={mesSelector} onCambiarMes={setMesSelector} seleccion={rango.desde} onSeleccionar={tocarDia}
                    rango={{ desde: rango.desde, hasta: rango.hasta ?? rango.desde }} />
        <Text style={styles.selectorResumen}>
          {fechaLarga(rango.desde)}{rango.hasta && rango.hasta !== rango.desde ? ` → ${fechaLarga(rango.hasta)}` : ''}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <Boton titulo="Cancelar" variante="secundario" onPress={() => setSelector(false)} style={{ flex: 1 }} />
          <Boton titulo="Listo" onPress={confirmarFechas} style={{ flex: 1 }} />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  filaLogo: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  logo: { width: 64, height: 64, borderRadius: 16, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 2 },
  logoImg: { width: 64, height: 64 },
  quitarLogo: { color: colors.danger, fontWeight: '700', fontSize: 13, marginTop: 6 },
  switchFila: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: 12, marginTop: 12 },
  switchTitulo: { fontSize: 14, fontWeight: '800', color: colors.text },
  switchTexto: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  selectorAyuda: { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
  selectorResumen: { textAlign: 'center', fontWeight: '800', color: colors.primary, marginTop: 8, textTransform: 'capitalize' },
});
