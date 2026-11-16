import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Versión de esta app (app.json → expo.version). Súbela en cada APK nuevo. */
export const APP_VERSION: string = Constants.expoConfig?.version ?? '0.0.0';

export const PLATAFORMA = Platform.OS;

/** Compara "1.2.10" con "1.3.0": negativo si a < b. */
export function compararVersion(a: string | null | undefined, b: string | null | undefined): number {
  const pa = String(a || '0').split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b || '0').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

export interface InfoVersion {
  version_actual: string | null;
  version_minima: string | null;
  url_descarga: string | null;
  mensaje: string | null;
}
