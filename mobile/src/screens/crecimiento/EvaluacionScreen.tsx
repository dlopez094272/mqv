import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import { Boton, Cargando, MensajeError, Tarjeta } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../navigation/Navigator';
import { evaluar, getCertificado, getPreguntas, urlLogoCurso } from '../../api/crecimiento';
import { PreguntaCurso, ResultadoEvaluacion } from '../../types';
import { descargarCertificado } from '../../utils/certificado';
import { colors, radius, shadow } from '../../theme';

interface Props { id: number; nombre: string; color?: string | null; logo?: string | null }

export default function EvaluacionScreen({ id, nombre, color }: Props) {
  const { api, baseUrl, filesUrl } = useAuth();
  const { goBack } = useNavigation();
  const insets = useSafeAreaInsets();
  const [preguntas, setPreguntas] = useState<PreguntaCurso[]>([]);
  const [respuestas, setRespuestas] = useState<Record<number, number>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoEvaluacion | null>(null);
  const [descargando, setDescargando] = useState(false);
  const tono = color || colors.primary;

  const cargar = useCallback(async () => {
    setError(null);
    setCargando(true);
    try {
      setPreguntas(await getPreguntas(api, id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }, [api, id]);

  useEffect(() => { cargar(); }, [cargar]);

  const respondidas = preguntas.filter(p => respuestas[p.idpregunta]).length;

  const enviar = () => {
    if (respondidas < preguntas.length) {
      Alert.alert('Evaluación', `Te faltan ${preguntas.length - respondidas} pregunta(s) por responder.`);
      return;
    }
    Alert.alert('Enviar evaluación', '¿Enviar tus respuestas? No podrás cambiarlas después.', [
      { text: 'Revisar', style: 'cancel' },
      {
        text: 'Enviar', onPress: async () => {
          setEnviando(true);
          try {
            const r = await evaluar(api, id, preguntas.map(p => ({ idpregunta: p.idpregunta, idopcion: respuestas[p.idpregunta] })));
            setResultado(r);
          } catch (err) {
            Alert.alert('Evaluación', (err as Error).message);
          } finally {
            setEnviando(false);
          }
        },
      },
    ]);
  };

  const certificado = async () => {
    setDescargando(true);
    try {
      const d = await getCertificado(api, id);
      await descargarCertificado(d, filesUrl, d.curso_logo ? urlLogoCurso(baseUrl, d.curso_logo) : null);
    } catch (err) {
      Alert.alert('Certificado', (err as Error).message);
    } finally {
      setDescargando(false);
    }
  };

  if (resultado) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Resultado" subtitle={nombre} onBack={goBack} />
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 + insets.bottom }}>
          <View style={[styles.resultado, { borderColor: resultado.aprobado ? colors.success : colors.danger }]}>
            <View style={[styles.resultadoIcono, { backgroundColor: resultado.aprobado ? colors.successSoft : colors.dangerSoft }]}>
              <Ionicons name={resultado.aprobado ? 'trophy' : 'refresh'} size={44} color={resultado.aprobado ? colors.success : colors.danger} />
            </View>
            <Text style={styles.resultadoTitulo}>{resultado.aprobado ? '¡Felicidades, aprobaste!' : 'Aún no alcanzas el 80 %'}</Text>
            <Text style={[styles.puntaje, { color: resultado.aprobado ? colors.success : colors.danger }]}>{resultado.puntaje}%</Text>
            <Text style={styles.resultadoSub}>{resultado.correctas} de {resultado.total} respuestas correctas</Text>
          </View>
          {resultado.aprobado ? (
            <Boton titulo="Descargar certificado (PDF)" icono="ribbon-outline" variante="exito" cargando={descargando}
                   onPress={certificado} style={{ marginTop: 18 }} />
          ) : (
            <Boton titulo="Repasar e intentar de nuevo" icono="refresh" style={{ marginTop: 18 }}
                   onPress={() => { setResultado(null); setRespuestas({}); }} />
          )}
          <Boton titulo="Volver al curso" variante="secundario" style={{ marginTop: 10 }} onPress={goBack} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Evaluación" subtitle={nombre} />
      {!!error && <MensajeError texto={error} onReintentar={cargar} />}
      {cargando ? <Cargando texto="Cargando preguntas…" /> : (
        <>
          <View style={styles.progreso}>
            <View style={[styles.progresoBarra, { width: `${preguntas.length ? (respondidas / preguntas.length) * 100 : 0}%`, backgroundColor: tono }]} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 + insets.bottom }}>
            <Text style={styles.ayuda}>Elige una respuesta por pregunta. Necesitas 80 % para aprobar.</Text>
            {preguntas.map((p, i) => (
              <Tarjeta key={p.idpregunta} style={{ marginBottom: 12 }}>
                <Text style={styles.preguntaNum}>Pregunta {i + 1} de {preguntas.length}</Text>
                <Text style={styles.pregunta}>{p.pregunta}</Text>
                {p.opciones.map(o => {
                  const sel = respuestas[p.idpregunta] === o.idopcion;
                  return (
                    <TouchableOpacity key={o.idopcion} activeOpacity={0.8}
                                      style={[styles.opcion, sel && { borderColor: tono, backgroundColor: colors.primarySoft }]}
                                      onPress={() => setRespuestas(r => ({ ...r, [p.idpregunta]: o.idopcion }))}>
                      <Ionicons name={sel ? 'radio-button-on' : 'radio-button-off'} size={22} color={sel ? tono : colors.textLight} />
                      <Text style={[styles.opcionText, sel && { fontWeight: '700' }]}>{o.texto}</Text>
                    </TouchableOpacity>
                  );
                })}
              </Tarjeta>
            ))}
            {preguntas.length > 0 ? (
              <Boton titulo={`Enviar respuestas (${respondidas}/${preguntas.length})`} icono="send" cargando={enviando}
                     onPress={enviar} style={{ marginTop: 6 }} />
            ) : (
              !error && <Boton titulo="Volver" variante="secundario" onPress={goBack} />
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  progreso: { height: 5, backgroundColor: colors.border },
  progresoBarra: { height: 5 },
  ayuda: { color: colors.textMuted, fontSize: 13, marginBottom: 12, textAlign: 'center' },
  preguntaNum: { fontSize: 12, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  pregunta: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 4, marginBottom: 10 },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginTop: 8 },
  opcionText: { flex: 1, fontSize: 15, color: colors.text },
  resultado: { backgroundColor: colors.card, borderRadius: radius.xl, padding: 24, alignItems: 'center', borderWidth: 2, ...shadow },
  resultadoIcono: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  resultadoTitulo: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  puntaje: { fontSize: 48, fontWeight: '900', marginTop: 6 },
  resultadoSub: { fontSize: 14, color: colors.textMuted },
});
