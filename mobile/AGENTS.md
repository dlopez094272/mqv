# Expo HAS CHANGED

Este proyecto usa Expo SDK 56 (igual que las apps de smabi y express). Lee la documentación versionada en https://docs.expo.dev/versions/v56.0.0/ antes de escribir código.

- Navegación propia (pila en memoria) en `src/navigation/Navigator.tsx`, sin react-navigation.
- Todo pasa por la API del backend de MQV (`/api/...`), la misma que usa la web.
- `src/utils/chordpro.ts` es una copia de `frontend/src/app/alabanza/chordpro.ts`: si cambias uno, cambia el otro.
