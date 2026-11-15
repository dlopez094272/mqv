import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

// Ingreso con huella / rostro.
//
// El backend emite un JWT que vence (8 h por defecto). Para entrar sin escribir
// la contraseña cuando vence, al activar la biometría se guardan el usuario y la
// contraseña en el almacén cifrado del sistema (Keystore / Keychain vía
// expo-secure-store) y solo se leen después de que el sistema confirma la huella
// o el rostro.

const BIO_ACTIVA_KEY   = 'mqv_bio_activa';
const BIO_CODIGO_KEY   = 'mqv_bio_codigo';
const BIO_PASSWORD_KEY = 'mqv_bio_password';
// Usuarios que dijeron que no a la biometría (solo en este teléfono).
const BIO_RECHAZADA_KEY = 'mqv_bio_rechazada';

export interface InfoBiometria {
  disponible: boolean;
  /** Texto para la interfaz: "huella", "rostro" o "biometría". */
  nombre: string;
  esRostro: boolean;
}

export async function infoBiometria(): Promise<InfoBiometria> {
  try {
    const [hardware, enrolada, tipos] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    const T = LocalAuthentication.AuthenticationType;
    const esRostro = tipos.includes(T.FACIAL_RECOGNITION) && !tipos.includes(T.FINGERPRINT);
    const nombre = tipos.includes(T.FINGERPRINT) ? 'huella' : esRostro ? 'rostro' : 'biometría';
    return { disponible: hardware && enrolada, nombre, esRostro };
  } catch {
    return { disponible: false, nombre: 'biometría', esRostro: false };
  }
}

/** Pide la huella/rostro. Devuelve true solo si el usuario se autenticó. */
export async function autenticarBiometria(mensaje: string): Promise<boolean> {
  try {
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: mensaje,
      cancelLabel: 'Cancelar',
      fallbackLabel: 'Usar contraseña',
      disableDeviceFallback: false,
    });
    return r.success;
  } catch {
    return false;
  }
}

export async function biometriaActiva(): Promise<boolean> {
  return (await SecureStore.getItemAsync(BIO_ACTIVA_KEY)) === '1';
}

export async function activarBiometria(codigo: string, password: string) {
  await Promise.all([
    SecureStore.setItemAsync(BIO_CODIGO_KEY, codigo),
    SecureStore.setItemAsync(BIO_PASSWORD_KEY, password),
    SecureStore.setItemAsync(BIO_ACTIVA_KEY, '1'),
  ]);
}

export async function desactivarBiometria() {
  await Promise.all([
    SecureStore.deleteItemAsync(BIO_CODIGO_KEY),
    SecureStore.deleteItemAsync(BIO_PASSWORD_KEY),
    SecureStore.deleteItemAsync(BIO_ACTIVA_KEY),
  ]);
}

/** Usuario guardado para mostrarlo en el login ("Continuar como ..."). */
export async function codigoBiometria(): Promise<string | null> {
  return SecureStore.getItemAsync(BIO_CODIGO_KEY);
}

/** Pide la huella y, si se confirma, devuelve las credenciales guardadas. */
export async function credencialesConBiometria(mensaje: string): Promise<{ codigo: string; password: string } | null> {
  if (!(await biometriaActiva())) return null;
  if (!(await autenticarBiometria(mensaje))) return null;
  const [codigo, password] = await Promise.all([
    SecureStore.getItemAsync(BIO_CODIGO_KEY),
    SecureStore.getItemAsync(BIO_PASSWORD_KEY),
  ]);
  return codigo && password ? { codigo, password } : null;
}

async function usuariosQueRechazaron(): Promise<string[]> {
  try {
    return JSON.parse((await SecureStore.getItemAsync(BIO_RECHAZADA_KEY)) ?? '[]');
  } catch {
    return [];
  }
}

/** true si el usuario ya respondió que no quiere biometría en este teléfono. */
export async function biometriaRechazada(codigo: string): Promise<boolean> {
  return (await usuariosQueRechazaron()).includes(codigo.toLowerCase());
}

/** Guarda (o borra) la respuesta "no" del usuario para no volver a preguntarle. */
export async function recordarRechazoBiometria(codigo: string, rechazada: boolean) {
  const cod = codigo.toLowerCase();
  const lista = (await usuariosQueRechazaron()).filter(c => c !== cod);
  if (rechazada) lista.push(cod);
  await SecureStore.setItemAsync(BIO_RECHAZADA_KEY, JSON.stringify(lista));
}
