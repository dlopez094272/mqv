import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../navigation/Navigator';
import { marcarLeida } from '../api/notificaciones';
import { obtenerTokenPush, pantallaDeNotificacion } from '../utils/notificaciones';

/**
 * Registra el teléfono para recibir notificaciones push (llegan aunque la app
 * esté cerrada) y, al tocar una, abre la pantalla correspondiente.
 * Va dentro del NavigationProvider, solo con sesión iniciada.
 */
export default function GestorNotificaciones() {
  const { api, usuario, registrarPushToken } = useAuth();
  const { navigate } = useNavigation();
  const respuesta = Notifications.useLastNotificationResponse();
  const atendida = useRef<string | null>(null);

  // Token del teléfono → servidor (y cuando Firebase lo cambie)
  useEffect(() => {
    if (!usuario) return;
    let vivo = true;
    obtenerTokenPush().then(t => { if (vivo && t) registrarPushToken(t); });
    const sub = Notifications.addPushTokenListener(t => {
      if (typeof t.data === 'string') registrarPushToken(t.data);
    });
    return () => { vivo = false; sub.remove(); };
  }, [usuario?.usuario, registrarPushToken]);

  // Notificación tocada (con la app abierta, en segundo plano o cerrada)
  useEffect(() => {
    if (!respuesta || respuesta.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = respuesta.notification.request.identifier;
    if (atendida.current === id) return;
    atendida.current = id;
    // Push de FCM: los datos llegan en content.data (clave "body") y en remoteMessage.data
    const trigger = respuesta.notification.request.trigger as { remoteMessage?: { data?: Record<string, string> } } | null;
    const datos = {
      ...(trigger?.remoteMessage?.data ?? {}),
      ...((respuesta.notification.request.content.data as Record<string, unknown> | undefined) ?? {}),
    } as Record<string, unknown>;
    const idNotif = Number(datos?.idnotificaciones);
    if (idNotif) marcarLeida(api, idNotif).catch(() => {});
    const destino = pantallaDeNotificacion(datos);
    if (destino) navigate(destino);
    Notifications.clearLastNotificationResponse();
  }, [respuesta, api, navigate]);

  return null;
}
