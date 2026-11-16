import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import { ApiError, onActualizacionObligatoria, request } from '../api/client';
import { APP_VERSION, InfoVersion, PLATAFORMA, compararVersion } from '../version';
import { DEFAULT_SERVER, filesRoot, resolveApiBaseUrl } from '../config';
import { Permisos, Usuario } from '../types';
import {
  InfoBiometria,
  activarBiometria,
  biometriaActiva,
  credencialesConBiometria,
  desactivarBiometria,
  infoBiometria,
  recordarRechazoBiometria,
} from '../utils/biometria';

const SERVER_KEY  = 'mqv_server';
const TOKEN_KEY   = 'mqv_token';
const USUARIO_KEY = 'mqv_usuario';
const ULTIMO_KEY  = 'mqv_ultimo_usuario';
/** Token de renovación de la sesión de este teléfono (la sesión no expira sola). */
const REFRESH_KEY = 'mqv_refresh';

interface LoginResponse {
  token: string;
  refresh_token?: string;
  usuario: string;
  nombre: string;
  primer_ingreso: number | null;
  is_superadmin: boolean;
}

export interface Api {
  get: <T>(path: string) => Promise<T>;
  post: <T>(path: string, body?: unknown) => Promise<T>;
  put: <T>(path: string, body?: unknown) => Promise<T>;
  patch: <T>(path: string, body?: unknown) => Promise<T>;
  delete: <T>(path: string) => Promise<T>;
}

type Operacion = 'S' | 'A' | 'E' | 'D';

interface AuthContextValue {
  server: string;
  baseUrl: string;
  filesUrl: string;
  token: string | null;
  usuario: Usuario | null;
  permisos: Permisos;
  puede: (tabla: string, op?: Operacion) => boolean;
  loading: boolean;
  ultimoUsuario: string | null;
  biometria: InfoBiometria;
  bioActiva: boolean;
  /** Mensaje para el login cuando la sesión se cerró sola (p. ej. expiró). */
  avisoSesion: string | null;
  /** Primer ingreso: hay que cambiar la contraseña antes de usar la app. */
  debeCambiarPassword: boolean;
  login: (usuario: string, password: string, server?: string) => Promise<void>;
  loginConBiometria: () => Promise<boolean>;
  logout: () => Promise<void>;
  setBioActiva: (activa: boolean, credenciales?: { codigo: string; password: string }) => Promise<void>;
  /** Tras cambiar la contraseña: actualiza la biometría y quita el aviso de primer ingreso. */
  passwordCambiada: (nueva: string) => Promise<void>;
  /** URL con token para reproducir/abrir un archivo protegido. */
  urlConToken: (path: string) => string;
  api: Api;
  /** Si no es null, esta versión de la app ya no se permite: hay que actualizar. */
  actualizacion: InfoVersion | null;
  /** Vuelve a consultar al servidor si hay una versión obligatoria. */
  revisarVersion: () => Promise<void>;
  /** Registra el token de notificaciones push de este teléfono en el servidor. */
  registrarPushToken: (pushToken: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function payloadDeToken(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

/** true si el token vence en menos de `margenMin` minutos (o no se puede leer). */
function tokenVencido(token: string, margenMin = 5): boolean {
  const exp = Number(payloadDeToken(token)?.exp);
  return !exp || exp * 1000 - Date.now() < margenMin * 60_000;
}

const infoDispositivo = () => ({
  plataforma: PLATAFORMA,
  modelo: [Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || null,
  app_version: APP_VERSION,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [server, setServer] = useState(DEFAULT_SERVER);
  const [token, setToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [permisos, setPermisos] = useState<Permisos>({});
  const [loading, setLoading] = useState(true);
  const [ultimoUsuario, setUltimoUsuario] = useState<string | null>(null);
  const [biometria, setBiometria] = useState<InfoBiometria>({ disponible: false, nombre: 'biometría', esRostro: false });
  const [bioActiva, setBioActivaState] = useState(false);
  const [avisoSesion, setAvisoSesion] = useState<string | null>(null);
  const [actualizacion, setActualizacion] = useState<InfoVersion | null>(null);

  const tokenRef = useRef<string | null>(null);
  const baseUrlRef = useRef(resolveApiBaseUrl(DEFAULT_SERVER));
  const reautenticando = useRef<Promise<string | null> | null>(null);
  const refreshRef = useRef<string | null>(null);
  const serverRef = useRef(DEFAULT_SERVER);

  // El servidor puede exigir una versión más nueva (HTTP 426) en cualquier llamada
  useEffect(() => {
    onActualizacionObligatoria(info => setActualizacion(info));
    return () => onActualizacionObligatoria(null);
  }, []);

  const revisarVersion = useCallback(async () => {
    try {
      const v = await request<InfoVersion>(baseUrlRef.current, '/app/version');
      if (v?.version_minima && compararVersion(APP_VERSION, v.version_minima) < 0) setActualizacion(v);
      else setActualizacion(null);
    } catch {
      // Sin conexión o servidor antiguo: no se bloquea
    }
  }, []);

  const cargarPermisos = useCallback(async (t: string) => {
    try {
      const r = await request<{ is_superadmin: boolean; permisos: Permisos }>(baseUrlRef.current, '/auth/mis-permisos', { token: t });
      setPermisos(r.permisos || {});
    } catch {
      setPermisos({});
    }
  }, []);

  useEffect(() => {
    (async () => {
      const [storedServer, storedToken, storedUsuario, ultimo, bio, activa, storedRefresh] = await Promise.all([
        SecureStore.getItemAsync(SERVER_KEY),
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USUARIO_KEY),
        SecureStore.getItemAsync(ULTIMO_KEY),
        infoBiometria(),
        biometriaActiva(),
        SecureStore.getItemAsync(REFRESH_KEY),
      ]);
      if (storedServer) {
        setServer(storedServer);
        serverRef.current = storedServer;
        try { baseUrlRef.current = resolveApiBaseUrl(storedServer); } catch { /* se queda el de defecto */ }
      }
      refreshRef.current = storedRefresh;
      revisarVersion();
      if (storedToken && storedUsuario && (storedRefresh || !tokenVencido(storedToken))) {
        // Con token de renovación la sesión sigue aunque el JWT haya vencido:
        // se renueva aquí o en la primera llamada que responda 401.
        let t = storedToken;
        if (storedRefresh && tokenVencido(storedToken, 60)) {
          const nuevo = await renovarToken().catch(() => null);
          if (nuevo === '') { setLoading(false); setUltimoUsuario(ultimo); setBiometria(bio); return; }
          if (nuevo) t = nuevo;
        }
        tokenRef.current = t;
        setToken(t);
        setUsuario(JSON.parse(storedUsuario));
        cargarPermisos(t);
        if (!storedRefresh) {
          // Sesión de una versión anterior: se vuelve sesión permanente de este teléfono
          request<{ refresh_token: string }>(baseUrlRef.current, '/auth/dispositivo', {
            method: 'POST', token: t, body: { dispositivo: infoDispositivo() },
          }).then(async r => {
            if (!r?.refresh_token) return;
            refreshRef.current = r.refresh_token;
            await SecureStore.setItemAsync(REFRESH_KEY, r.refresh_token);
          }).catch(() => {});
        }
      }
      setUltimoUsuario(ultimo);
      setBiometria(bio);
      setBioActivaState(activa && bio.disponible);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargarPermisos, revisarVersion]);

  const guardarSesion = useCallback(async (data: LoginResponse, srv: string) => {
    const u: Usuario = {
      usuario: data.usuario,
      nombre: data.nombre,
      primer_ingreso: data.primer_ingreso,
      is_superadmin: data.is_superadmin,
    };
    await Promise.all([
      SecureStore.setItemAsync(SERVER_KEY, srv),
      SecureStore.setItemAsync(TOKEN_KEY, data.token),
      SecureStore.setItemAsync(USUARIO_KEY, JSON.stringify(u)),
      SecureStore.setItemAsync(ULTIMO_KEY, data.usuario),
      data.refresh_token ? SecureStore.setItemAsync(REFRESH_KEY, data.refresh_token) : Promise.resolve(),
    ]);
    if (data.refresh_token) refreshRef.current = data.refresh_token;
    tokenRef.current = data.token;
    serverRef.current = srv;
    baseUrlRef.current = resolveApiBaseUrl(srv);
    await cargarPermisos(data.token);
    setServer(srv);
    setToken(data.token);
    setUsuario(u);
    setUltimoUsuario(data.usuario);
    setAvisoSesion(null);
  }, [cargarPermisos]);

  const login = useCallback(async (usuarioInput: string, password: string, serverInput?: string) => {
    const srv = (serverInput ?? server).trim() || DEFAULT_SERVER;
    // Cierra la sesión anterior de este teléfono (si la había) antes de abrir otra
    const anterior = refreshRef.current;
    const data = await request<LoginResponse>(resolveApiBaseUrl(srv), '/auth/login', {
      method: 'POST',
      body: { usuario: usuarioInput, password, dispositivo: infoDispositivo() },
    });
    if (anterior && anterior !== data.refresh_token) {
      request(resolveApiBaseUrl(srv), '/auth/cerrar-sesion', { method: 'POST', body: { refresh_token: anterior } }).catch(() => {});
    }
    await guardarSesion(data, srv);
    // Si la contraseña cambió desde la web, la biometría queda con la nueva.
    if (await biometriaActiva()) await activarBiometria(usuarioInput, password);
  }, [server, guardarSesion]);

  const loginConBiometria = useCallback(async () => {
    const cred = await credencialesConBiometria('Ingresa a MQV');
    if (!cred) return false;
    try {
      await login(cred.codigo, cred.password);
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await desactivarBiometria();
        setBioActivaState(false);
        throw new ApiError('Tu contraseña cambió. Ingrésala de nuevo para reactivar el acceso biométrico.', 401);
      }
      throw err;
    }
  }, [login]);

  const limpiarSesion = useCallback(async (aviso: string | null) => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USUARIO_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
    refreshRef.current = null;
    tokenRef.current = null;
    setToken(null);
    setUsuario(null);
    setPermisos({});
    setAvisoSesion(aviso);
  }, []);

  /** Cerrar sesión: solo cuando el usuario lo pide. Quita también este teléfono de las notificaciones. */
  const logout = useCallback(async () => {
    const refresh = refreshRef.current;
    if (refresh) {
      request(baseUrlRef.current, '/auth/cerrar-sesion', { method: 'POST', body: { refresh_token: refresh } }).catch(() => {});
    }
    await limpiarSesion(null);
  }, [limpiarSesion]);

  /**
   * Pide un token nuevo con el token de renovación del teléfono.
   * Devuelve el token, '' si el servidor cerró la sesión (ya se limpió), o
   * lanza un error si no hay conexión (la sesión se conserva).
   */
  const renovarToken = useCallback(async (): Promise<string> => {
    const refresh = refreshRef.current;
    if (!refresh) throw new ApiError('Sin token de renovación', 401, 'SIN_REFRESH');
    try {
      const data = await request<LoginResponse>(baseUrlRef.current, '/auth/renovar', {
        method: 'POST',
        body: { refresh_token: refresh, app_version: APP_VERSION },
      });
      await guardarSesion(data, serverRef.current);
      return data.token;
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await limpiarSesion(err.message || 'La sesión se cerró. Ingresa de nuevo.');
        return '';
      }
      throw err;
    }
  }, [guardarSesion, limpiarSesion]);

  // Al volver a la app: renueva el token si está por vencer y revisa la versión
  useEffect(() => {
    const sub = AppState.addEventListener('change', estado => {
      if (estado !== 'active') return;
      revisarVersion();
      const t = tokenRef.current;
      if (t && refreshRef.current && tokenVencido(t, 60)) renovarToken().catch(() => {});
    });
    return () => sub.remove();
  }, [renovarToken, revisarVersion]);

  const registrarPushToken = useCallback(async (pushToken: string | null) => {
    const refresh = refreshRef.current;
    const t = tokenRef.current;
    if (!refresh || !t) return;
    await request(baseUrlRef.current, '/auth/push-token', {
      method: 'PUT', token: t, body: { refresh_token: refresh, push_token: pushToken },
    }).catch(() => {});
  }, []);

  const setBioActiva = useCallback(async (activa: boolean, credenciales?: { codigo: string; password: string }) => {
    if (activa && credenciales) await activarBiometria(credenciales.codigo, credenciales.password);
    if (!activa) await desactivarBiometria();
    setBioActivaState(activa);
    const codigo = credenciales?.codigo ?? usuario?.usuario;
    if (codigo) await recordarRechazoBiometria(codigo, !activa);
  }, [usuario]);

  const passwordCambiada = useCallback(async (nueva: string) => {
    if (!usuario) return;
    if (await biometriaActiva()) await activarBiometria(usuario.usuario, nueva);
    const u = { ...usuario, primer_ingreso: 0 };
    setUsuario(u);
    await SecureStore.setItemAsync(USUARIO_KEY, JSON.stringify(u));
  }, [usuario]);

  /**
   * Token vencido (401): se renueva con el token de renovación del teléfono,
   * sin pedir nada al usuario. Solo si el servidor cerró la sesión (o es una
   * sesión antigua sin renovación) se intenta con biometría o se pide ingresar.
   */
  const reautenticar = useCallback((): Promise<string | null> => {
    if (!reautenticando.current) {
      reautenticando.current = (async () => {
        if (refreshRef.current) {
          // Sin conexión: el error sube y la sesión se conserva
          const nuevo = await renovarToken();
          return nuevo || null;
        }
        try {
          const cred = await credencialesConBiometria('Tu sesión expiró. Confirma tu identidad para continuar');
          if (cred) {
            const data = await request<LoginResponse>(baseUrlRef.current, '/auth/login', {
              method: 'POST',
              body: { usuario: cred.codigo, password: cred.password },
            });
            await guardarSesion(data, server);
            return data.token;
          }
        } catch {
          // se cierra la sesión abajo
        }
        await limpiarSesion('Tu sesión expiró. Ingresa de nuevo.');
        return null;
      })().finally(() => {
        reautenticando.current = null;
      });
    }
    return reautenticando.current;
  }, [guardarSesion, limpiarSesion, server, renovarToken]);

  const api = useMemo<Api>(() => {
    const llamar = async <T,>(method: string, path: string, body?: unknown): Promise<T> => {
      try {
        return await request<T>(baseUrlRef.current, path, { method, body, token: tokenRef.current });
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 401 || !tokenRef.current) throw err;
        const nuevo = await reautenticar();
        if (!nuevo) throw new ApiError('Tu sesión expiró', 401, 'SESSION_EXPIRED');
        return request<T>(baseUrlRef.current, path, { method, body, token: nuevo });
      }
    };
    return {
      get: (path) => llamar('GET', path),
      post: (path, body) => llamar('POST', path, body ?? {}),
      put: (path, body) => llamar('PUT', path, body ?? {}),
      patch: (path, body) => llamar('PATCH', path, body ?? {}),
      delete: (path) => llamar('DELETE', path),
    };
  }, [reautenticar]);

  const baseUrl = useMemo(() => {
    try {
      return resolveApiBaseUrl(server);
    } catch {
      return resolveApiBaseUrl(DEFAULT_SERVER);
    }
  }, [server]);

  const puede = useCallback(
    (tabla: string, op: Operacion = 'S') => !!usuario?.is_superadmin || (permisos[tabla] || '').includes(op),
    [usuario, permisos]
  );

  const urlConToken = useCallback(
    (path: string) => `${baseUrl}${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token ?? '')}`,
    [baseUrl, token]
  );

  const value: AuthContextValue = {
    server,
    baseUrl,
    filesUrl: filesRoot(baseUrl),
    token,
    usuario,
    permisos,
    puede,
    loading,
    ultimoUsuario,
    biometria,
    bioActiva,
    avisoSesion,
    debeCambiarPassword: !!usuario?.primer_ingreso,
    login,
    loginConBiometria,
    logout,
    setBioActiva,
    passwordCambiada,
    urlConToken,
    api,
    actualizacion,
    revisarVersion,
    registrarPushToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
