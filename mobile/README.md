# MQV — App móvil

App de la Iglesia del Nazareno "Más que Vencedores" (Android/iOS), con el mismo
stack que las apps de smabi y express: **Expo SDK 56 + React Native 0.85 +
TypeScript**, navegación propia (sin react-navigation) y `expo-secure-store`.
No se conecta a la base de datos: todo pasa por la API del backend de MQV
(`/api/...`), la misma que usa la web.

## Qué incluye

- **Intro animada**: notas musicales que suben alrededor del logo.
- **Ingreso** con usuario o correo, **recuperar contraseña** (envía el correo de
  restablecimiento) y **huella / rostro** (`expo-local-authentication`). Si el token
  vence con la app abierta, se pide la huella y se vuelve a entrar sin perder la pantalla.
- **Primer ingreso**: si el usuario tiene `primer_ingreso = 1`, la app obliga a
  cambiar la contraseña temporal antes de continuar.
- **Cambiar contraseña** con medidor de fortaleza.
- **Mis datos**: foto (cámara o galería), celular, teléfono, correo, red social,
  estado civil, domicilio y trabajo. Usa `GET /auth/mi-cuenta` y `PUT /auth/mis-datos`
  (solo campos de contacto; nombre y fecha de nacimiento los corrige secretaría).
- **Mis servicios**: actividades donde el usuario está en el equipo de alabanza
  (o todas las que tienen programa, si tiene el permiso *Alabanza*). Programa en
  línea de tiempo con horas estimadas, equipo con acceso a WhatsApp y botón para
  compartir el programa.
- **Canción** (lo que ve el músico):
  - Acordes ChordPro **ya transpuestos al tono del día** del programa; −½ / +½,
    números Nashville (1·4·5), modo "solo letra" para cantantes, sugerencias de capo
    y tamaño de letra.
  - **Reproductor multipista**: todas las pistas suenan sincronizadas; *M* silencia
    y *S* deja sola una pista; velocidad 50–100 % sin cambiar el tono; repetir;
    sigue sonando con la pantalla apagada.
  - **Partitura interactiva** (notación ABC con abcjs en un WebView): se dibuja,
    se reproduce y resalta la nota que suena. Las partituras **MusicXML / MXL**
    (exportadas de MuseScore, Finale…) se dibujan con OpenSheetMusicDisplay.
    PDFs e imágenes se abren en el visor.
  - **Metrónomo** con acento en el primer tiempo.
  - **Modo escenario**: pantalla completa oscura, letra grande, desplazamiento
    automático según el BPM, pantalla siempre encendida, funciona en horizontal.
  - **Repertorio del servicio**: al abrir una canción desde el programa, se pasa a
    la anterior / siguiente (cada una en su tono del día), también dentro del modo
    escenario, que sigue abierto al cambiar de canción.
  - Compartir la canción como texto (acordes arriba de la letra) por WhatsApp.
- **Biblioteca** (permiso *Alabanza*): buscar canciones, himnos y coros.
- **Actividades** (permiso *actividades*): calendario mensual con puntos por
  categoría, agenda del día y del mes, detalle con adjuntos y acceso al programa.
  Crear / editar (con logo, fechas de varios días y "una por día") / eliminar según
  los permisos A/E/D. **Asistencia** (permiso *actividades_asistentes*): marcar
  personas con un toque, buscar por nombre o grupo y registrar visitantes.
- **Mis cursos** (permiso *mis_cursos*): contenido de cada curso (descripción,
  video y archivos de soporte), evaluación (80 % para aprobar) y **certificado en
  PDF** (mismo diseño que la web, se genera en el teléfono con expo-print).
  La gestión de cursos sigue siendo solo en la web.
- **Correo** (permiso *correo*): bandeja por carpetas, leer (HTML), adjuntos,
  responder / reenviar, redactar con contactos sugeridos y archivos adjuntos.
  Usa la misma cuenta configurada en la web (`/api/correo`).

## Backend (una sola vez)

1. Ejecutar `backend/migrations/alabanza.sql` en la base de datos `mqv`.
2. Reiniciar el backend.
3. En *Seguridad → Grupos*, dar el permiso **Alabanza: Biblioteca de canciones**
   (S/A/E/D) a quienes administran el repertorio. Los músicos **no** necesitan
   ese permiso: basta con asignarlos en la pestaña *Programa* de la actividad.
4. Cada músico debe tener su usuario vinculado a su ficha de persona
   (`usuarios.idpersonas`) para ver "Mis servicios" y editar "Mis datos".

## Correr en desarrollo (build nativo por USB, como en smabi/express)

Expo Go no sirve (la app usa módulos nativos).

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
cd mobile
npm install
npx expo run:android      # compila e instala por USB (depuración USB activa)
```

Si falla con `JvmVendorSpec ... IBM_SEMERU`, es el mismo bug de smabi/express: en
`node_modules/@react-native/gradle-plugin/settings.gradle.kts` cambiar el plugin
`foojay-resolver-convention` a `.version("1.0.0")` (se pierde en cada `npm install`).

El servidor por defecto es `admin.iglesiamqv.org` (https, `src/config.ts`). Para
probar contra el backend local, en el login toca "Servidor" y escribe la IP de la
PC con el puerto, p. ej. `192.168.1.10:3000` (sin protocolo usa http).

## APK para instalar en los teléfonos

```powershell
npx eas-cli build -p android --profile preview   # en la nube, genera un APK
```

o local: `npx expo prebuild -p android` y `cd android; .\gradlew assembleRelease`.

## Notas

- `src/utils/chordpro.ts` es copia de `frontend/src/app/alabanza/chordpro.ts`.
- Las partituras descargan abcjs / OpenSheetMusicDisplay del CDN (jsdelivr) la primera vez que se abren.
