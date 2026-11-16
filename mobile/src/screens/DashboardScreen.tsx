import React, { useCallback, useEffect, useState } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation, Screen } from '../navigation/Navigator';
import { MensajeError, TituloSeccion } from '../components/ui';
import { getMiCuenta, getMisServicios } from '../api/alabanza';
import { getNoLeidos } from '../api/correo';
import { MiCuenta, Servicio } from '../types';
import { cuandoEs, fechaLarga, iniciales, primerNombre } from '../utils/formato';
import { colors, radius, shadow } from '../theme';

function saludo() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

interface Acceso { titulo: string; descripcion: string; icono: string; screen: Screen; visible: boolean; badge?: number; }

export default function DashboardScreen() {
  const { usuario, api, puede, baseUrl } = useAuth();
  const { navigate } = useNavigation();
  const insets = useSafeAreaInsets();

  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [cuenta, setCuenta] = useState<MiCuenta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noLeidos, setNoLeidos] = useState(0);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const [s, c] = await Promise.all([getMisServicios(api), getMiCuenta(api).catch(() => null)]);
      setServicios(s);
      setCuenta(c);
      if (puede('correo')) getNoLeidos(api).then(r => setNoLeidos(r.total || 0)).catch(() => {});
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }, [api, puede]);

  useEffect(() => { cargar(); }, [cargar]);

  const proximo = servicios.find(s => s.es_musico) ?? servicios[0];
  const otros = servicios.filter(s => s !== proximo).slice(0, 3);
  const foto = cuenta?.persona?.foto ? `${baseUrl}/uploads/personas/${cuenta.persona.foto}` : null;
  const nombre = cuenta?.persona?.primer_nombre || primerNombre(usuario?.nombre) || usuario?.usuario;

  const accesos: Acceso[] = [
    { titulo: 'Mis servicios', descripcion: 'Programas y canciones a tocar', icono: 'calendar-outline', screen: { name: 'servicios' }, visible: true },
    { titulo: 'Actividades', descripcion: 'Calendario de la iglesia', icono: 'today-outline', screen: { name: 'actividades' }, visible: puede('actividades') },
    { titulo: 'Mis cursos', descripcion: 'Crecimiento y certificados', icono: 'school-outline', screen: { name: 'misCursos' }, visible: puede('mis_cursos') },
    { titulo: 'Correo', descripcion: noLeidos ? `${noLeidos} sin leer` : 'Tu correo de la iglesia', icono: 'mail-outline', screen: { name: 'correo' }, visible: puede('correo'), badge: noLeidos },
    { titulo: 'Biblioteca', descripcion: 'Canciones, himnos y coros', icono: 'musical-notes-outline', screen: { name: 'canciones' }, visible: puede('alabanza') },
    { titulo: 'Mis datos', descripcion: 'Actualiza tu información', icono: 'person-circle-outline', screen: { name: 'misDatos' }, visible: true },
    { titulo: 'Contraseña', descripcion: 'Cámbiala cuando quieras', icono: 'key-outline', screen: { name: 'cambiarPassword' }, visible: true },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.avatar} onPress={() => navigate({ name: 'perfil' })} accessibilityLabel="Perfil">
          {foto ? <Image source={{ uri: foto }} style={styles.avatarImg} /> : <Text style={styles.avatarText}>{iniciales(usuario?.nombre)}</Text>}
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.saludo}>{saludo()},</Text>
          <Text style={styles.nombre} numberOfLines={1}>{nombre}</Text>
        </View>
        <TouchableOpacity onPress={() => navigate({ name: 'perfil' })} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="settings-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={() => { setCargando(true); cargar(); }} colors={[colors.primary]} tintColor={colors.white} />}
      >
        <View style={styles.heroFondo} />

        {/* ── Próximo servicio ── */}
        {proximo ? (
          <TouchableOpacity activeOpacity={0.9} style={styles.hero} onPress={() => navigate({ name: 'servicio', id: proximo.idactividades })}>
            <Text style={styles.heroDeco}>♫</Text>
            <Text style={styles.heroLabel}>{proximo.es_musico ? 'Tu próximo servicio' : 'Próximo programa'}</Text>
            <Text style={styles.heroTitulo} numberOfLines={2}>{proximo.nombre}</Text>
            <View style={styles.heroFila}>
              <View style={[styles.chip, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="calendar" size={14} color={colors.primary} />
                <Text style={styles.chipText}>{cuandoEs(proximo.fecha_inicio)} · {fechaLarga(proximo.fecha_inicio)}{proximo.hora_inicio ? ` · ${proximo.hora_inicio}` : ''}</Text>
              </View>
            </View>
            <View style={styles.heroFila}>
              {!!proximo.mi_instrumento && (
                <View style={[styles.chip, { backgroundColor: colors.blueSoft }]}>
                  <Ionicons name="musical-note" size={14} color={colors.blueDark} />
                  <Text style={[styles.chipText, { color: colors.blueDark }]}>{proximo.mi_instrumento}</Text>
                </View>
              )}
              <View style={[styles.chip, { backgroundColor: colors.warningSoft }]}>
                <Ionicons name="list" size={14} color={colors.warning} />
                <Text style={[styles.chipText, { color: colors.warning }]}>{proximo.total_canciones} canción(es)</Text>
              </View>
              {!!proximo.lugar && (
                <View style={[styles.chip, { backgroundColor: colors.bg }]}>
                  <Ionicons name="location" size={14} color={colors.textMuted} />
                  <Text style={[styles.chipText, { color: colors.textMuted }]}>{proximo.lugar}</Text>
                </View>
              )}
            </View>
            <View style={styles.heroCta}>
              <Text style={styles.heroCtaText}>Ver programa y ensayar</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.hero}>
            <Text style={styles.heroDeco}>♪</Text>
            <Text style={styles.heroLabel}>Mis servicios</Text>
            <Text style={styles.heroTitulo}>{cargando ? 'Cargando…' : 'No tienes servicios próximos'}</Text>
            <Text style={styles.heroSub}>Cuando te asignen en el equipo de alabanza de una actividad, aparecerá aquí con su programa y canciones.</Text>
          </View>
        )}

        {!!error && <MensajeError texto={error} onReintentar={cargar} />}

        <View style={{ paddingHorizontal: 16 }}>
          {otros.length > 0 && (
            <>
              <TituloSeccion derecha={<TouchableOpacity onPress={() => navigate({ name: 'servicios' })}><Text style={styles.verTodo}>Ver todos</Text></TouchableOpacity>}>
                También próximamente
              </TituloSeccion>
              {otros.map(s => (
                <TouchableOpacity key={s.idactividades} style={styles.mini} onPress={() => navigate({ name: 'servicio', id: s.idactividades })}>
                  <View style={[styles.miniFecha, { backgroundColor: s.categoria_color || colors.primary }]}>
                    <Text style={styles.miniDia}>{Number(s.fecha_inicio.slice(8, 10))}</Text>
                    <Text style={styles.miniMes}>{fechaLarga(s.fecha_inicio).split(' ')[2]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.miniTitulo} numberOfLines={1}>{s.nombre}</Text>
                    <Text style={styles.miniSub}>{cuandoEs(s.fecha_inicio)} · {s.total_canciones} canción(es){s.mi_instrumento ? ` · ${s.mi_instrumento}` : ''}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                </TouchableOpacity>
              ))}
            </>
          )}

          <TituloSeccion>Accesos</TituloSeccion>
          <View style={styles.grid}>
            {accesos.filter(a => a.visible).map(a => (
              <TouchableOpacity key={a.titulo} style={styles.acceso} activeOpacity={0.85} onPress={() => navigate(a.screen)}>
                <View style={styles.accesoIcono}>
                  <Ionicons name={a.icono as any} size={26} color={colors.primary} />
                  {!!a.badge && <View style={styles.badge}><Text style={styles.badgeText}>{a.badge > 99 ? '99+' : a.badge}</Text></View>}
                </View>
                <Text style={styles.accesoTitulo}>{a.titulo}</Text>
                <Text style={styles.accesoDesc}>{a.descripcion}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.versiculo}>“Cantad alegres a Dios, habitantes de toda la tierra. Servid a Jehová con alegría; venid ante su presencia con regocijo.”{'\n'}Salmos 100:1-2</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, backgroundColor: colors.primary },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 46, height: 46 },
  avatarText: { color: colors.white, fontWeight: '800', fontSize: 17 },
  saludo: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  nombre: { color: colors.white, fontSize: 20, fontWeight: '800', textTransform: 'capitalize' },
  heroFondo: { position: 'absolute', top: 0, left: 0, right: 0, height: 90, backgroundColor: colors.primary, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  hero: { backgroundColor: colors.white, marginHorizontal: 16, marginTop: 6, borderRadius: radius.xl, padding: 18, overflow: 'hidden', ...shadow, shadowOpacity: 0.14 },
  heroDeco: { position: 'absolute', right: 12, top: -6, fontSize: 90, color: colors.primarySoft },
  heroLabel: { fontSize: 12, fontWeight: '800', color: colors.blue, textTransform: 'uppercase', letterSpacing: 0.8 },
  heroTitulo: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 4, marginBottom: 8, paddingRight: 50 },
  heroSub: { fontSize: 14, color: colors.textMuted },
  heroFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.primary, textTransform: 'capitalize' },
  heroCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, marginTop: 8 },
  heroCtaText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  verTodo: { color: colors.primary, fontWeight: '700' },
  mini: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: 12, marginBottom: 8, ...shadow },
  miniFecha: { width: 48, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  miniDia: { color: colors.white, fontSize: 20, fontWeight: '800', lineHeight: 22 },
  miniMes: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  miniTitulo: { fontSize: 15, fontWeight: '700', color: colors.text },
  miniSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  acceso: { width: '48%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, ...shadow },
  accesoIcono: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  badge: { position: 'absolute', top: -6, right: -8, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  accesoTitulo: { fontSize: 15, fontWeight: '800', color: colors.text },
  accesoDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  versiculo: { textAlign: 'center', color: colors.textMuted, fontStyle: 'italic', fontSize: 13, marginTop: 26, paddingHorizontal: 10, lineHeight: 19 },
});
