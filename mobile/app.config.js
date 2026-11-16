// Configuración dinámica sobre app.json.
// Firebase (notificaciones push en Android): si existe google-services.json en
// esta carpeta se incluye en el APK; sin él la app funciona igual, pero sin push
// (las notificaciones siguen apareciendo en la bandeja dentro de la app).
const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  const googleServices = path.join(__dirname, 'google-services.json');
  if (fs.existsSync(googleServices)) {
    config.android = { ...config.android, googleServicesFile: './google-services.json' };
  }
  return config;
};
