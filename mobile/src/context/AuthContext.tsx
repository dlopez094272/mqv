import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { ApiError, request } from '../api/client';
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

interface LoginResponse {
  token: string;
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
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function payloadDeToken(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

/** true si el token vence en menos de 5 minutos (o no se puede leer). */
function tokenVencido(token: string): boolean {
  const exp = Number(payloadDeToken(token)?.exp);
  return !exp || exp * 1000 - Date.now() < 5 * 60_000;
}

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

  const tokenRef = useRef<string | null>(null);
  const baseUrlRef = useRef(resolveApiBaseUrl(DEFAULT_SERVER));
  const reautenticando = useRef<Promise<string | null> | null>(null);

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
      const [storedServer, storedToken, storedUsuario, ultimo, bio, activa] = await Promise.all([
        SecureStore.getItemAsync(SERVER_KEY),
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USUARIO_KEY),
        SecureStore.getItemAsync(ULTIMO_KEY),
        infoBiometria(),
        biometriaActiva(),
      ]);
      if (storedServer) {
        setServer(storedServer);
        try { baseUrlRef.current = resolveApiBaseUrl(storedServer); } catch { /* se queda el de defecto */ }
      }
      if (storedToken && storedUsuario && !tokenVencido(storedToken)) {
        tokenRef.current = storedToken;
        setToken(storedToken);
        setUsuario(JSON.parse(storedUsuario));
        cargarPermisos(storedToken);
      }
      setUltimoUsuario(ultimo);
      setBiometria(bio);
      setBioActivaState(activa && bio.disponible);
      setLoading(false);
    })();
  }, [cargarPermisos]);

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
    ]);
    tokenRef.current = data.token;
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
    const data = await request<LoginResponse>(resolveApiBaseUrl(srv), '/auth/login', {
      method: 'POST',
      body: { usuario: usuarioInput, password },
    });
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
    await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(USUARIO_KEY)]);
    tokenRef.current = null;
    setToken(null);
    setUsuario(null);
    setPermisos({});
    setAvisoSesion(aviso);
  }, []);

  const logout = useCallback(() => limpiarSesion(null), [limpiarSesion]);

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
   * Sesión vencida (401): con biometría activa se pide la huella y se vuelve
   * a iniciar sesión sin salir de la pantalla; si no, se cierra la sesión.
   */
  const reautenticar = useCallback((): Promise<string | null> => {
    if (!reautenticando.current) {
      reautenticando.current = (async () => {
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
  }, [guardarSesion, limpiarSesion, server]);

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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
