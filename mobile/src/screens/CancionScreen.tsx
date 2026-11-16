import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Linking, Modal, NativeScrollEvent, NativeSyntheticEvent, ScrollView, Share, StatusBar, StyleSheet,
  Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import ScreenHeader from '../components/ScreenHeader';
import HojaAcordes from '../components/HojaAcordes';
import Partitura from '../components/Partitura';
import PartituraMusicXml from '../components/PartituraMusicXml';
import Reproductor, { Pista } from '../components/Reproductor';
import Metronomo from '../components/Metronomo';
import { Cargando, MensajeError, Tarjeta } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { ETIQUETA_TIPO, getCancion, getPrograma, rutaArchivo, youtubeId } from '../api/alabanza';
import { useNavigation } from '../navigation/Navigator';
import { ArchivoCancion, Cancion, ElementoPrograma } from '../types';
import {
  OpcionesVista, aTextoPlano, parsearChordPro, semitonosEntre, sugerenciasCapo, transponerTonalidad, usaBemoles,
} from '../utils/chordpro';
import { colors, radius, shadow } from '../theme';

type Pestana = 'acordes' | 'pistas' | 'partitura' | 'mas';

const normalizarSemi = (n: number) => (n > 6 ? n - 12 : n < -5 ? n + 12 : n);

const esMusicXml = (a: ArchivoCancion) =>
  /\.(musicxml|mxl|xml)$/i.test(a.nombre_original) || /musicxml|recordare/i.test(a.mimetype || '');

/** Repertorio de cada actividad en memoria, para no pedirlo de nuevo al pasar de canción. */
const repertorios = new Map<number, { nombre: string; canciones: ElementoPrograma[] }>();

/** El programa se volvió a cargar (pudo cambiar): la próxima canción vuelve a pedir el repertorio. */
export const olvidarRepertorio = (idactividad: number) => repertorios.delete(idactividad);

interface Props {
  id: number;
  tono?: string | null;
  titulo?: string;
  servicio?: number;
  pos?: number;
  escenarioInicial?: boolean;
}

export default function CancionScreen({ id, tono, titulo, servicio, pos, escenarioInicial }: Props) {
  const { api, urlConToken, filesUrl } = useAuth();
  const { replace, navigate } = useNavigation();
  const insets = useSafeAreaInsets();
  const [repertorio, setRepertorio] = useState(servicio ? repertorios.get(servicio) ?? null : null);

  useEffect(() => {
    if (!servicio || repertorio) return;
    getPrograma(api, servicio)
      .then(p => {
        const r = { nombre: p.actividad.nombre, canciones: p.programa.filter(i => i.tipo === 'cancion' && i.idcanciones) };
        repertorios.set(servicio, r);
        setRepertorio(r);
      })
      .catch(() => {});
  }, [api, servicio, repertorio]);

  const lista = repertorio?.canciones ?? [];
  const posicion = pos !== undefined && lista[pos]?.idcanciones === id ? pos : lista.findIndex(i => i.idcanciones === id);
  const anterior = posicion > 0 ? lista[posicion - 1] : null;
  const siguiente = posicion >= 0 ? lista[posicion + 1] ?? null : null;

  /** Pasa a otra canción del repertorio; si el modo escenario está abierto, sigue abierto. */
  const irA = useCallback((it: ElementoPrograma | null, delta: number, enEscenario: boolean) => {
    if (!it?.idcanciones || !servicio) return;
    replace({
      name: 'cancion', id: it.idcanciones, tono: it.tonalidad, titulo: it.cancion_titulo ?? undefined,
      servicio, pos: posicion + delta, escenario: enEscenario,
    });
  }, [replace, servicio, posicion]);

  const [cancion, setCancion] = useState<Cancion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana>('acordes');
  const [semitonos, setSemitonos] = useState(0);
  const [nashville, setNashville] = useState(false);
  const [soloLetra, setSoloLetra] = useState(false);
  const [tamano, setTamano] = useState(18);
  const [escenario, setEscenario] = useState(!!escenarioInicial);
  const [capoAviso, setCapoAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const c = await getCancion(api, id);
      setCancion(c);
      if (tono && c.tonalidad) setSemitonos(semitonosEntre(c.tonalidad, tono));
    } catch (err) {
      setError((err as Error).message);
    }
  }, [api, id, tono]);

  useEffect(() => { cargar(); }, [cargar]);

  const tonalidad = transponerTonalidad(cancion?.tonalidad, semitonos);
  const opciones: OpcionesVista = useMemo(
    () => ({ semitonos, bemoles: usaBemoles(tonalidad), nashville, tonalidad }),
    [semitonos, tonalidad, nashville]
  );
  const capos = useMemo(() => sugerenciasCapo(tonalidad), [tonalidad]);
  const pistas: Pista[] = useMemo(
    () => (cancion?.archivos ?? []).filter(a => a.tipo === 'audio')
      .map(a => ({ id: a.idarchivos, nombre: a.pista || a.nombre_original, url: urlConToken(rutaArchivo(a.idarchivos)) })),
    [cancion, urlConToken]
  );
  const documentos = (cancion?.archivos ?? []).filter(a => a.tipo !== 'audio' && !esMusicXml(a));
  const musicXml = (cancion?.archivos ?? []).filter(a => a.tipo !== 'audio' && esMusicXml(a));
  const yt = youtubeId(cancion?.youtube_url);

  const pestanas: { clave: Pestana; texto: string; icono: string; visible: boolean }[] = [
    { clave: 'acordes', texto: 'Acordes', icono: 'musical-notes', visible: true },
    { clave: 'pistas', texto: `Pistas${pistas.length ? ` (${pistas.length})` : ''}`, icono: 'headset', visible: pistas.length > 0 },
    { clave: 'partitura', texto: 'Partitura', icono: 'document-text', visible: !!cancion?.partitura_abc || documentos.length > 0 || musicXml.length > 0 },
    { clave: 'mas', texto: 'Más', icono: 'ellipsis-horizontal-circle', visible: !!yt || !!cancion?.notas || !!cancion?.spotify_url },
  ];

  function aplicarCapo(capo: number, forma: string) {
    setSemitonos(s => normalizarSemi(s - capo));
    setCapoAviso(`Capo en traste ${capo}: toca formas de ${forma} y sonará en ${tonalidad}.`);
    setTimeout(() => setCapoAviso(null), 6000);
  }

  async function compartir() {
    if (!cancion) return;
    const texto = aTextoPlano(parsearChordPro(cancion.letra_acordes), opciones);
    await Share.share({ message: `${cancion.titulo}${cancion.autor ? ' – ' + cancion.autor : ''}\nTono: ${tonalidad ?? '—'}${cancion.bpm ? ` · ${cancion.bpm} BPM` : ''}\n\n${texto}` });
  }

  if (!cancion) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={titulo ?? 'Canción'} />
        {error ? <MensajeError texto={error} onReintentar={cargar} /> : <Cargando texto="Cargando canción…" />}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={cancion.titulo}
        subtitle={`${ETIQUETA_TIPO[cancion.tipo]} · ${cancion.autor || 'Autor desconocido'}`}
        right={
          <View style={{ flexDirection: 'row', gap: 16 }}>
            {!!cancion.letra_acordes && (
              <TouchableOpacity onPress={compartir} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Compartir">
                <Ionicons name="share-social-outline" size={23} color={colors.white} />
              </TouchableOpacity>
            )}
            {!!cancion.letra_acordes && (
              <TouchableOpacity onPress={() => setEscenario(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Modo escenario">
                <Ionicons name="expand" size={23} color={colors.white} />
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Tono / BPM / Compás */}
      <View style={styles.datos}>
        <View style={styles.dato}>
          <Text style={styles.datoLbl}>Tono</Text>
          <Text style={styles.datoVal}>{tonalidad ?? (semitonos ? `${semitonos > 0 ? '+' : ''}${semitonos}` : '—')}</Text>
          {semitonos !== 0 && !!cancion.tonalidad && <Text style={styles.datoSub}>orig. {cancion.tonalidad}</Text>}
        </View>
        <View style={styles.dato}><Text style={styles.datoLbl}>BPM</Text><Text style={styles.datoVal}>{cancion.bpm ?? '—'}</Text></View>
        <View style={styles.dato}><Text style={styles.datoLbl}>Compás</Text><Text style={styles.datoVal}>{cancion.compas || '4/4'}</Text></View>
      </View>

      {/* Pestañas */}
      <View style={styles.tabs}>
        {pestanas.filter(p => p.visible).map(p => (
          <TouchableOpacity key={p.clave} style={[styles.tab, pestana === p.clave && styles.tabOn]} onPress={() => setPestana(p.clave)}>
            <Ionicons name={p.icono as any} size={15} color={pestana === p.clave ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabText, pestana === p.clave && styles.tabTextOn]}>{p.texto}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {lista.length > 1 && posicion >= 0 && (
        <View style={styles.rep}>
          <TouchableOpacity style={styles.repBtn} disabled={!anterior} onPress={() => irA(anterior, -1, false)}>
            <Ionicons name="chevron-back" size={20} color={anterior ? colors.primary : colors.border} />
            <Text style={[styles.repNombre, !anterior && { opacity: 0 }]} numberOfLines={1}>{anterior?.cancion_titulo}</Text>
          </TouchableOpacity>
          <View style={styles.repCentro}>
            <Text style={styles.repPos}>{posicion + 1} / {lista.length}</Text>
            <View style={styles.repPuntos}>
              {lista.map((_, i) => <View key={i} style={[styles.repPunto, i === posicion && styles.repPuntoOn]} />)}
            </View>
          </View>
          <TouchableOpacity style={[styles.repBtn, { justifyContent: 'flex-end' }]} disabled={!siguiente} onPress={() => irA(siguiente, 1, false)}>
            <Text style={[styles.repNombre, { textAlign: 'right' }, !siguiente && { opacity: 0 }]} numberOfLines={1}>{siguiente?.cancion_titulo}</Text>
            <Ionicons name="chevron-forward" size={20} color={siguiente ? colors.primary : colors.border} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}>
        {!!tono && (
          <View style={styles.diaAviso}>
            <Ionicons name="calendar" size={16} color={colors.warning} />
            <Text style={styles.diaText}>En el programa va en <Text style={{ fontWeight: '800' }}>{tono}</Text>. Ya está transpuesta.</Text>
          </View>
        )}

        {pestana === 'acordes' && (
          <>
            <View style={styles.toolbar}>
              <View style={styles.grupo}>
                <TouchableOpacity style={styles.tbBtn} onPress={() => setSemitonos(s => normalizarSemi(s - 1))}><Text style={styles.tbText}>−½</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.tbBtn, styles.tbTono]} onPress={() => setSemitonos(0)} disabled={!semitonos}>
                  <Text style={[styles.tbText, { color: colors.white }]}>{tonalidad ?? `${semitonos}`}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tbBtn} onPress={() => setSemitonos(s => normalizarSemi(s + 1))}><Text style={styles.tbText}>+½</Text></TouchableOpacity>
              </View>
              <TouchableOpacity style={[styles.tbBtn, nashville && styles.tbOn]} onPress={() => setNashville(n => !n)}>
                <Text style={[styles.tbText, nashville && { color: colors.white }]}>1·4·5</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tbBtn, soloLetra && styles.tbOn]} onPress={() => setSoloLetra(s => !s)}>
                <Ionicons name="mic" size={15} color={soloLetra ? colors.white : colors.primary} />
              </TouchableOpacity>
              <View style={styles.grupo}>
                <TouchableOpacity style={styles.tbBtn} onPress={() => setTamano(t => Math.max(12, t - 2))}><Text style={styles.tbText}>A−</Text></TouchableOpacity>
                <TouchableOpacity style={styles.tbBtn} onPress={() => setTamano(t => Math.min(34, t + 2))}><Text style={styles.tbText}>A+</Text></TouchableOpacity>
              </View>
              {!!cancion.bpm && <Metronomo bpm={cancion.bpm} compas={cancion.compas} />}
            </View>
            {semitonos !== 0 && <Text style={styles.ayudaTono}>Toca el tono para volver al original.</Text>}

            {capos.length > 0 && !nashville && !soloLetra && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.capos}>
                <Text style={styles.caposLbl}>🎸 Capo:</Text>
                {capos.map(k => (
                  <TouchableOpacity key={k.capo} style={styles.capo} onPress={() => aplicarCapo(k.capo, k.forma)}>
                    <Text style={styles.capoText}>{k.capo} → formas de <Text style={{ fontWeight: '800' }}>{k.forma}</Text></Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            {!!capoAviso && <Text style={styles.capoAviso}>{capoAviso}</Text>}

            <Tarjeta style={{ paddingHorizontal: 14 }}>
              <HojaAcordes texto={cancion.letra_acordes} opciones={opciones} tamano={tamano} mostrarAcordes={!soloLetra} />
            </Tarjeta>
            {!!cancion.letra_acordes && (
              <TouchableOpacity style={styles.escenarioBtn} onPress={() => setEscenario(true)}>
                <Ionicons name="expand" size={18} color={colors.white} />
                <Text style={styles.escenarioText}>Modo escenario (pantalla completa)</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {pestana === 'pistas' && pistas.length > 0 && (
          <>
            <Reproductor pistas={pistas} />
            <Text style={styles.ayuda}>
              El audio sigue sonando con la pantalla apagada. Baja la velocidad con 🐢 para aprender partes difíciles: el tono no cambia.
            </Text>
          </>
        )}

        {pestana === 'partitura' && (
          <>
            {!!cancion.partitura_abc && (
              <>
                <Partitura abc={cancion.partitura_abc} semitonos={semitonos} />
                <Text style={styles.ayuda}>▶ reproduce la melodía y resalta cada nota. La partitura sigue la transposición elegida en Acordes.</Text>
              </>
            )}
            {musicXml.map(x => (
              <View key={x.idarchivos} style={{ marginTop: 6 }}>
                <Text style={styles.mxTit}>🎼 {x.pista && x.pista !== 'Partitura' ? x.pista : 'Partitura'} <Text style={styles.mxSub}>· tono original</Text></Text>
                <PartituraMusicXml url={urlConToken(rutaArchivo(x.idarchivos))} origen={filesUrl} />
              </View>
            ))}
            {documentos.map(d => (
              <TouchableOpacity key={d.idarchivos} style={styles.doc}
                                onPress={() => navigate({
                                  name: 'visor',
                                  archivos: documentos.map(x => ({ nombre: x.nombre_original, mime: x.mimetype, url: urlConToken(rutaArchivo(x.idarchivos)) })),
                                  indice: documentos.indexOf(d),
                                })}>
                <Ionicons name={d.mimetype === 'application/pdf' ? 'document-text' : 'image'} size={24} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.docTit} numberOfLines={1}>{d.pista && d.pista !== 'Partitura' ? d.pista : d.nombre_original}</Text>
                  <Text style={styles.docSub} numberOfLines={1}>{d.nombre_original}</Text>
                </View>
                <Ionicons name="eye-outline" size={20} color={colors.textLight} />
              </TouchableOpacity>
            ))}
          </>
        )}

        {pestana === 'mas' && (
          <>
            {!!yt && (
              <TouchableOpacity style={styles.doc} onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${yt}`)}>
                <Ionicons name="logo-youtube" size={26} color="#FF0000" />
                <View style={{ flex: 1 }}><Text style={styles.docTit}>Video de referencia</Text><Text style={styles.docSub}>Abrir en YouTube</Text></View>
                <Ionicons name="open-outline" size={20} color={colors.textLight} />
              </TouchableOpacity>
            )}
            {!!cancion.spotify_url && (
              <TouchableOpacity style={styles.doc} onPress={() => Linking.openURL(cancion.spotify_url!)}>
                <Ionicons name="musical-note" size={26} color="#1DB954" />
                <View style={{ flex: 1 }}><Text style={styles.docTit}>Escuchar en Spotify</Text></View>
                <Ionicons name="open-outline" size={20} color={colors.textLight} />
              </TouchableOpacity>
            )}
            {!!cancion.notas && (
              <Tarjeta style={{ marginTop: 6 }}>
                <Text style={styles.notasTit}>📝 Notas para los músicos</Text>
                <Text style={styles.notas}>{cancion.notas}</Text>
              </Tarjeta>
            )}
            {(!!cancion.ccli || !!cancion.dominio_publico) && (
              <Text style={styles.ayuda}>{cancion.dominio_publico ? 'Dominio público' : `CCLI #${cancion.ccli}`}</Text>
            )}
          </>
        )}
      </ScrollView>

      <ModoEscenario
        visible={escenario}
        onClose={() => setEscenario(false)}
        cancion={cancion}
        opciones={opciones}
        tonalidad={tonalidad}
        soloLetra={soloLetra}
        onTransponer={d => setSemitonos(s => normalizarSemi(s + d))}
        repertorio={lista.length > 1 && posicion >= 0 ? {
          posicion, total: lista.length, anterior, siguiente,
          ir: (it, delta) => irA(it, delta, true),
        } : null}
      />
    </View>
  );
}

/* ═══════════════════════════════ MODO ESCENARIO ═══════════════════════════════ */

interface EscenarioProps {
  visible: boolean;
  onClose: () => void;
  cancion: Cancion;
  opciones: OpcionesVista;
  tonalidad: string | null;
  soloLetra: boolean;
  onTransponer: (delta: number) => void;
  repertorio: {
    posicion: number;
    total: number;
    anterior: ElementoPrograma | null;
    siguiente: ElementoPrograma | null;
    ir: (it: ElementoPrograma | null, delta: number) => void;
  } | null;
}

const VELOCIDADES = [0.5, 0.75, 1, 1.5, 2];

/** Pantalla completa oscura para tocar en vivo: letra grande, desplazamiento automático y pantalla siempre encendida. */
function ModoEscenario(props: EscenarioProps) {
  if (!props.visible) return null;
  return <ModoEscenarioActivo {...props} />;
}

function ModoEscenarioActivo({ onClose, cancion, opciones, tonalidad, soloLetra, onTransponer, repertorio }: EscenarioProps) {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const pos = useRef(0);
  const altoContenido = useRef(0);
  const [tamano, setTamano] = useState(26);
  const [auto, setAuto] = useState(false);
  const [vel, setVel] = useState(1);

  useEffect(() => {
    if (!auto) return;
    // Más rápido en canciones rápidas: ~ (BPM/80) * 22 px por segundo
    const pxPorTick = (((cancion.bpm || 80) / 80) * 22 * vel) / 20;
    const idI = setInterval(() => {
      pos.current += pxPorTick;
      if (pos.current >= altoContenido.current - height * 0.6) { setAuto(false); return; }
      scroll.current?.scrollTo({ y: pos.current, animated: false });
    }, 50);
    return () => clearInterval(idI);
  }, [auto, vel, cancion.bpm, height]);

  const pagina = (dir: 1 | -1) => {
    pos.current = Math.max(0, pos.current + dir * height * 0.7);
    scroll.current?.scrollTo({ y: pos.current, animated: true });
  };

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']} statusBarTranslucent>
      <StatusBar hidden />
      <View style={[styles.esc, { paddingTop: insets.top }]}>
        <View style={styles.escBarra}>
          {!!repertorio && (
            <>
              <TouchableOpacity style={[styles.escBtn, !repertorio.anterior && { opacity: 0.3 }]} disabled={!repertorio.anterior}
                                onPress={() => repertorio.ir(repertorio.anterior, -1)}>
                <Ionicons name="play-skip-back" size={18} color={colors.white} />
              </TouchableOpacity>
              <Text style={styles.escPos}>{repertorio.posicion + 1}/{repertorio.total}</Text>
              <TouchableOpacity style={[styles.escBtn, !repertorio.siguiente && { opacity: 0.3 }]} disabled={!repertorio.siguiente}
                                onPress={() => repertorio.ir(repertorio.siguiente, 1)}>
                <Ionicons name="play-skip-forward" size={18} color={colors.white} />
              </TouchableOpacity>
            </>
          )}
          <Text style={styles.escTit} numberOfLines={1}>{cancion.titulo} · <Text style={{ color: colors.gold }}>{tonalidad ?? ''}</Text></Text>
          <TouchableOpacity style={styles.escBtn} onPress={onClose}><Ionicons name="close" size={22} color={colors.white} /></TouchableOpacity>
        </View>
        <View style={styles.escBarra2}>
          <TouchableOpacity style={styles.escBtn} onPress={() => onTransponer(-1)}><Text style={styles.escBtnText}>−½</Text></TouchableOpacity>
          <TouchableOpacity style={styles.escBtn} onPress={() => onTransponer(1)}><Text style={styles.escBtnText}>+½</Text></TouchableOpacity>
          <TouchableOpacity style={styles.escBtn} onPress={() => setTamano(t => Math.max(16, t - 2))}><Text style={styles.escBtnText}>A−</Text></TouchableOpacity>
          <TouchableOpacity style={styles.escBtn} onPress={() => setTamano(t => Math.min(48, t + 2))}><Text style={styles.escBtnText}>A+</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.escBtn, auto && { backgroundColor: colors.gold }]} onPress={() => setAuto(a => !a)}>
            <Ionicons name={auto ? 'pause' : 'arrow-down'} size={18} color={auto ? colors.primaryDark : colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.escBtn} onPress={() => setVel(v => VELOCIDADES[(VELOCIDADES.indexOf(v) + 1) % VELOCIDADES.length])}>
            <Text style={styles.escBtnText}>{vel}×</Text>
          </TouchableOpacity>
          {!!cancion.bpm && <Metronomo bpm={cancion.bpm} compas={cancion.compas} oscuro />}
        </View>
        <ScrollView
          ref={scroll}
          contentContainerStyle={{ padding: 22, paddingBottom: height * 0.6 }}
          scrollEventThrottle={32}
          onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => { pos.current = e.nativeEvent.contentOffset.y; }}
          onContentSizeChange={(_, h) => { altoContenido.current = h; }}
        >
          <HojaAcordes texto={cancion.letra_acordes} opciones={opciones} tamano={tamano} oscuro mostrarAcordes={!soloLetra} />
          {repertorio?.siguiente ? (
            <TouchableOpacity style={styles.escSig} onPress={() => repertorio.ir(repertorio.siguiente, 1)}>
              <Text style={styles.escSigLbl}>Siguiente</Text>
              <Text style={styles.escSigTit}>
                {repertorio.siguiente.cancion_titulo}
                {!!repertorio.siguiente.tonalidad && <Text style={{ color: colors.gold }}>  {repertorio.siguiente.tonalidad}</Text>}
              </Text>
              <Text style={styles.escSigLbl}>toca para continuar</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.escFin}>— fin{repertorio ? ' del repertorio' : ''} —</Text>
          )}
        </ScrollView>
        {/* Zonas para pasar página con un toque (arriba / abajo) */}
        <View style={[styles.escZonas, { bottom: insets.bottom }]} pointerEvents="box-none">
          <TouchableOpacity style={styles.escZona} onPress={() => pagina(-1)}><Ionicons name="chevron-up" size={22} color="rgba(255,255,255,0.5)" /></TouchableOpacity>
          <TouchableOpacity style={styles.escZona} onPress={() => pagina(1)}><Ionicons name="chevron-down" size={22} color="rgba(255,255,255,0.5)" /></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  datos: { flexDirection: 'row', gap: 8, backgroundColor: colors.primary, paddingHorizontal: 16, paddingBottom: 12 },
  dato: { flex: 1, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.md, paddingVertical: 6, alignItems: 'center' },
  datoLbl: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  datoVal: { color: colors.white, fontSize: 20, fontWeight: '800' },
  datoSub: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  tabs: { flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  tabTextOn: { color: colors.primary },
  diaAviso: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.warningSoft, padding: 10, borderRadius: radius.sm, marginBottom: 10 },
  diaText: { flex: 1, color: colors.warning, fontSize: 13 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 8 },
  grupo: { flexDirection: 'row', gap: 3 },
  tbBtn: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, minWidth: 38, alignItems: 'center' },
  tbTono: { backgroundColor: colors.primary, borderColor: colors.primary, minWidth: 52 },
  tbOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tbText: { color: colors.primary, fontWeight: '800', fontSize: 14 },
  ayudaTono: { fontSize: 11, color: colors.textMuted, marginBottom: 6 },
  capos: { gap: 6, alignItems: 'center', paddingBottom: 10 },
  caposLbl: { fontSize: 13, color: colors.textMuted },
  capo: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primaryLight, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.white },
  capoText: { fontSize: 12, color: colors.text },
  capoAviso: { fontSize: 12, color: colors.info, backgroundColor: colors.infoSoft, padding: 8, borderRadius: radius.sm, marginBottom: 8 },
  escenarioBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryDark, borderRadius: radius.md, paddingVertical: 13, marginTop: 14 },
  escenarioText: { color: colors.white, fontWeight: '800' },
  ayuda: { fontSize: 12, color: colors.textMuted, marginTop: 10, textAlign: 'center' },
  doc: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, marginTop: 10, ...shadow },
  docTit: { fontSize: 15, fontWeight: '700', color: colors.text },
  docSub: { fontSize: 12, color: colors.textMuted },
  notasTit: { fontWeight: '800', color: colors.primary, marginBottom: 6 },
  notas: { fontSize: 14, color: colors.text, lineHeight: 20 },
  esc: { flex: 1, backgroundColor: colors.escenario },
  escBarra: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 10 },
  escBarra2: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#22262D' },
  escTit: { flex: 1, color: colors.white, fontSize: 17, fontWeight: '800' },
  escBtn: { backgroundColor: '#2A2F38', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, minWidth: 40, alignItems: 'center' },
  escBtnText: { color: colors.white, fontWeight: '800', fontSize: 14 },
  escFin: { color: '#555', textAlign: 'center', marginTop: 30 },
  escPos: { color: '#AAA', fontWeight: '800', fontVariant: ['tabular-nums'] },
  escSig: { alignSelf: 'center', alignItems: 'center', gap: 4, marginTop: 40, backgroundColor: '#1F232B', borderWidth: 2, borderStyle: 'dashed',
    borderColor: '#3A404B', borderRadius: 14, paddingVertical: 18, paddingHorizontal: 28 },
  escSigLbl: { color: '#888', fontSize: 12 },
  escSigTit: { color: colors.white, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  rep: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 6, paddingVertical: 6 },
  repBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, padding: 6, minWidth: 0 },
  repNombre: { flex: 1, fontSize: 12, color: colors.text, fontWeight: '600' },
  repCentro: { alignItems: 'center', paddingHorizontal: 6 },
  repPos: { fontSize: 13, fontWeight: '800', color: colors.primary },
  repPuntos: { flexDirection: 'row', gap: 3, marginTop: 3 },
  repPunto: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  repPuntoOn: { width: 14, backgroundColor: colors.primary },
  mxTit: { fontSize: 14, fontWeight: '800', color: colors.primary, marginTop: 10 },
  mxSub: { fontWeight: '500', color: colors.textMuted, fontSize: 12 },
  escZonas: { position: 'absolute', right: 10, gap: 10, paddingBottom: 14 },
  escZona: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
});
