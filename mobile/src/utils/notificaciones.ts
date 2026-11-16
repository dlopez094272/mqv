import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import type { Screen } from '../navigation/Navigator';

// Cómo se muestran las notificaciones con la app abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** Canal de Android (el backend envía con channel_id "general"). */
export async function prepararCanal() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('general', {
    name: 'Notificaciones de MQV',
    description: 'Cursos, servicios y tesorería',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 200, 250],
    lightColor: '#836AA3',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

/**
 * Pide permiso (Android 13+ / iOS) y devuelve el token FCM del teléfono,
 * o null si no hay permiso o la app no tiene configurado Firebase.
 */
export async function obtenerTokenPush(): Promise<string | null> {
  if (!Device.isDevice) return null;
  await prepararCanal();
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;
  try {
    const t = await Notifications.getDevicePushTokenAsync();
    return typeof t.data === 'string' ? t.data : null;
  } catch (err) {
    // Sin google-services.json en el APK no hay token: la bandeja sigue funcionando
    console.warn('No se pudo obtener el token de notificaciones', err);
    return null;
  }
}

/** Pantalla de la app que corresponde a los datos de una notificación. */
export function pantallaDeNotificacion(datos: Record<string, unknown> | null | undefined): Screen | null {
  if (!datos) return null;
  const id = Number(datos.id);
  switch (datos.pantalla) {
    case 'curso':     return id ? { name: 'curso', id } : { name: 'misCursos' };
    case 'servicio':  return id ? { name: 'servicio', id } : { name: 'servicios' };
    case 'tesoreria': return id ? { name: 'tesoreria', id } : { name: 'tesorerias' };
    default:          return null;
  }
}
