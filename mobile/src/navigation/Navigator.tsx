import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BackHandler } from 'react-native';

// Navegación propia y minimalista (pila en memoria), igual que en las apps de
// smabi y express: evita sumar @react-navigation y sus dependencias nativas.
export type Screen =
  | { name: 'dashboard' }
  | { name: 'perfil' }
  | { name: 'misDatos' }
  | { name: 'cambiarPassword' }
  | { name: 'canciones' }
  /** `servicio` + `pos`: canción dentro del repertorio de una actividad (permite ir a la anterior/siguiente). */
  | { name: 'cancion'; id: number; tono?: string | null; titulo?: string; servicio?: number; pos?: number; escenario?: boolean }
  | { name: 'servicios' }
  | { name: 'servicio'; id: number };

interface Entrada {
  key: number;
  screen: Screen;
}

interface NavContextValue {
  screen: Screen;
  screenKey: number;
  navigate: (s: Screen) => void;
  replace: (s: Screen) => void;
  goBack: () => void;
  resetTo: (s: Screen) => void;
  canGoBack: boolean;
}

const NavigationContext = createContext<NavContextValue | undefined>(undefined);

let siguienteKey = 1;
const entrada = (screen: Screen): Entrada => ({ key: siguienteKey++, screen });

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<Entrada[]>([entrada({ name: 'dashboard' })]);

  const navigate = useCallback((s: Screen) => setStack(prev => [...prev, entrada(s)]), []);
  const replace = useCallback((s: Screen) => setStack(prev => [...prev.slice(0, -1), entrada(s)]), []);
  const goBack = useCallback(() => setStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev)), []);
  const resetTo = useCallback(
    (s: Screen) => setStack(prev => (s.name === 'dashboard' ? [prev[0]] : [prev[0], entrada(s)])),
    []
  );

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length <= 1) return false;
      setStack(prev => prev.slice(0, -1));
      return true;
    });
    return () => sub.remove();
  }, [stack.length]);

  const actual = stack[stack.length - 1];
  const value = useMemo<NavContextValue>(
    () => ({
      screen: actual.screen,
      screenKey: actual.key,
      navigate,
      replace,
      goBack,
      resetTo,
      canGoBack: stack.length > 1,
    }),
    [actual, stack.length, navigate, replace, goBack, resetTo]
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation debe usarse dentro de NavigationProvider');
  return ctx;
}
