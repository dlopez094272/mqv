import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import ScreenHeader from '../../components/ScreenHeader';
import BottomSheet from '../../components/BottomSheet';
import Calendario from '../../components/Calendario';
import { Campo, CampoBoton, Chips } from '../../components/Formulario';
import { Boton, Cargando, TituloSeccion } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../navigation/Navigator';
import {
  Movimiento, adjuntosDeMovimiento, crearMovimiento, editarMovimiento, getTiposMovimiento, num, rutaAdjuntoTesoreria,
} from '../../api/tesoreria';
import { iconoArchivo, tamanoLegible } from '../../utils/archivos';
import { fechaLarga, fechaLocal } from '../../utils/formato';
import { colors, radius } from '../../theme';

interface Nuevo { uri: string; name: string; type: string; size?: number | null; }

const MAX_CONCEPTO = 145;

export default function MovimientoFormScreen({ idtesoreria, movimiento }: { idtesoreria: number; movimiento?: Movimiento }) {
  const { api, baseUrl } = useAuth();
  const { goBack, navigate } = useNavigation();
  const insets = useSafeAreaInsets();
  const editando = !!movimiento;

  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>(movimiento && num(movimiento.credito) > 0 ? 'egreso' : 'ingreso');
  const [monto, setMonto] = useState(movimiento ? String(num(movimiento.debito) || num(movimiento.credito)) : '');
  const [fecha, setFecha] = useState(movimiento ? movimiento.fecha.slice(0, 10) : fechaLocal(new Date()));
  const [concepto, setConcepto] = useState(movimiento?.concepto ?? '');
  const [idTipoMov, setIdTipoMov] = useState<number | null>(movimiento?.idtipo_movimiento ?? null);
  const [tipos, setTipos] = useState<{ id: number; nombre: string }[]>([]);
  const [nuevos, setNuevos] = useState<Nuevo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [selFecha, setSelFecha] = useState(false);
  const [mesCal, setMesCal] = useState(() => { const [y, m] = fecha.split('-').map(Number); return new Date(y, m - 1, 1); });

  useEffect(() => {
    getTiposMovimiento(api).then(setTipos).catch(() => setTipos([])).finally(() => setCargando(false));
  }, [api]);

  const existentes = movimiento ? adjuntosDeMovimiento(movimiento) : [];

  const agregar = (lista: Nuevo[]) => setNuevos(prev => [...prev, ...lista].slice(0, 10));

  const tomarFoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Cámara', 'Permite el acceso a la cámara para fotografiar el comprobante.'); return; }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!r.canceled) agregar(r.assets.map(a => ({ uri: a.uri, name: a.fileName || `comprobante-${Date.now()}.jpg`, type: a.mimeType || 'image/jpeg', size: a.fileSize })));
  };
  const deGaleria = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsMultipleSelection: true });
    if (!r.canceled) agregar(r.assets.map(a => ({ uri: a.uri, name: a.fileName || `imagen-${Date.now()}.jpg`, type: a.mimeType || 'image/jpeg', size: a.fileSize })));
  };
  const deArchivos = async () => {
    const r = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (!r.canceled) agregar(r.assets.map(a => ({ uri: a.uri, name: a.name, type: a.mimeType || 'application/octet-stream', size: a.size })));
  };

  const guardar = async () => {
    const valor = Number(monto.replace(/[^\d.]/g, ''));
    if (!valor || valor <= 0) { Alert.alert('Movimiento', 'Ingresa un monto mayor a cero.'); return; }
    if (!concepto.trim()) { Alert.alert('Movimiento', 'Escribe el concepto.'); return; }

    const fd = new FormData();
    fd.append('fecha', fecha);
    fd.append('concepto', concepto.trim().slice(0, MAX_CONCEPTO));
    fd.append('debito', tipo === 'ingreso' ? String(valor) : '0');
    fd.append('credito', tipo === 'egreso' ? String(valor) : '0');
    fd.append('idtipo_movimiento', idTipoMov ? String(idTipoMov) : '');
    nuevos.forEach(a => fd.append('adjuntos', { uri: a.uri, name: a.name, type: a.type } as any));

    setGuardando(true);
    try {
      if (editando) await editarMovimiento(api, idtesoreria, movimiento!.idtesoreria_movimientos, fd);
      else await crearMovimiento(api, idtesoreria, fd);
      goBack();
    } catch (err) {
      Alert.alert('Movimiento', (err as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <View style={styles.container}><ScreenHeader title={editando ? 'Editar movimiento' : 'Nuevo movimiento'} /><Cargando /></View>;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={editando ? 'Editar movimiento' : 'Nuevo movimiento'} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <View style={styles.tipos}>
          {(['ingreso', 'egreso'] as const).map(t => {
            const on = tipo === t;
            const color = t === 'ingreso' ? colors.success : colors.danger;
            return (
              <TouchableOpacity key={t} style={[styles.tipo, on && { backgroundColor: color, borderColor: color }]} onPress={() => setTipo(t)}>
                <Ionicons name={t === 'ingreso' ? 'arrow-down-circle' : 'arrow-up-circle'} size={22} color={on ? colors.white : color} />
                <Text style={[styles.tipoTexto, { color: on ? colors.white : color }]}>{t === 'ingreso' ? 'Ingreso' : 'Egreso'}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Campo etiqueta="Monto (Q)" icono="cash-outline" requerido value={monto} onChangeText={setMonto}
               keyboardType="decimal-pad" placeholder="0.00" />
        <CampoBoton etiqueta="Fecha" icono="calendar-outline" requerido valor={fechaLarga(fecha)}
                    onPress={() => { const [y, m] = fecha.split('-').map(Number); setMesCal(new Date(y, m - 1, 1)); setSelFecha(true); }} />
        <Campo etiqueta={`Concepto (${concepto.length}/${MAX_CONCEPTO})`} icono="create-outline" requerido value={concepto}
               onChangeText={t => setConcepto(t.slice(0, MAX_CONCEPTO))} placeholder="Ej.: Ofrenda del culto dominical" multiline />

        {tipos.length > 0 && (
          <>
            <Text style={styles.label}>Tipo de movimiento</Text>
            <Chips opciones={tipos.map(t => ({ valor: t.id, texto: t.nombre }))} valor={idTipoMov} onCambiar={setIdTipoMov} />
          </>
        )}

        <TituloSeccion>Comprobantes</TituloSeccion>
        {existentes.map((a, i) => (
          <TouchableOpacity key={a.filename} style={styles.adjunto}
                            onPress={() => navigate({
                              name: 'visor',
                              archivos: existentes.map(x => ({ nombre: x.originalname || x.filename, mime: x.mimetype, url: `${baseUrl}${rutaAdjuntoTesoreria(x.filename)}` })),
                              indice: i,
                            })}>
            <Ionicons name={iconoArchivo(a.mimetype) as any} size={20} color={colors.primary} />
            <Text style={styles.adjuntoNombre} numberOfLines={1}>{a.originalname || a.filename}</Text>
            <Ionicons name="eye-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
        {nuevos.map((a, i) => (
          <View key={a.uri + i} style={[styles.adjunto, styles.adjuntoNuevo]}>
            <Ionicons name={iconoArchivo(a.type) as any} size={20} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.adjuntoNombre} numberOfLines={1}>{a.name}</Text>
              {!!a.size && <Text style={styles.adjuntoSub}>{tamanoLegible(a.size)} · nuevo</Text>}
            </View>
            <TouchableOpacity onPress={() => setNuevos(prev => prev.filter((_, j) => j !== i))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={22} color={colors.danger} />
            </TouchableOpacity>
          </View>
        ))}
        <View style={styles.agregar}>
          <Boton titulo="Foto" icono="camera-outline" variante="suave" compacto style={{ flex: 1 }} onPress={tomarFoto} />
          <Boton titulo="Galería" icono="images-outline" variante="suave" compacto style={{ flex: 1 }} onPress={deGaleria} />
          <Boton titulo="Archivo" icono="document-attach-outline" variante="suave" compacto style={{ flex: 1 }} onPress={deArchivos} />
        </View>

        <Boton titulo={editando ? 'Guardar cambios' : 'Registrar movimiento'} icono="checkmark" variante={tipo === 'ingreso' ? 'exito' : 'primario'}
               cargando={guardando} onPress={guardar} style={{ marginTop: 22 }} />
      </ScrollView>

      <BottomSheet visible={selFecha} onClose={() => setSelFecha(false)} title="Fecha del movimiento">
        <Calendario mes={mesCal} onCambiarMes={setMesCal} seleccion={fecha}
                    onSeleccionar={f => { setFecha(f); setSelFecha(false); }} compacto />
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  tipos: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  tipo: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.white },
  tipoTexto: { fontSize: 16, fontWeight: '800' },
  label: { color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  adjunto: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: radius.md, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: colors.border },
  adjuntoNuevo: { borderColor: colors.success, backgroundColor: colors.successSoft },
  adjuntoNombre: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  adjuntoSub: { fontSize: 11, color: colors.textMuted },
  agregar: { flexDirection: 'row', gap: 8, marginTop: 6 },
});
