// Zona horaria de Guatemala (UTC-6, sin cambio de horario de verano)
// Debe definirse antes de cualquier uso de Date para que CURDATE() y new Date()
// sean consistentes con la hora local de la iglesia.
process.env.TZ = 'America/Guatemala';

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
require('dotenv').config();

const LOG = path.join(__dirname, '..', 'startup.log');
fs.writeFileSync(LOG, `[${new Date().toISOString()}] Iniciando...\nDB_USER=${process.env.DB_USER}\nDB_NAME=${process.env.DB_NAME}\nPORT=${process.env.PORT}\nNODE_ENV=${process.env.NODE_ENV}\n`);
process.on('uncaughtException',   err => { fs.appendFileSync(LOG, `CRASH: ${err.stack}\n`); process.exit(1); });
process.on('unhandledRejection',  (r)  => { fs.appendFileSync(LOG, `REJECTION: ${r}\n`);    process.exit(1); });

const { testConnection } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const indexRouter  = require('./routes/index');

// Garantizar directorios de uploads al arrancar
const uploadsDir  = path.join(__dirname, '..', 'uploads');
const actLogosDir = path.join(__dirname, '..', 'files', 'actividades', 'logos');
fs.mkdirSync(path.join(uploadsDir, 'personas'), { recursive: true });
fs.mkdirSync(actLogosDir, { recursive: true });

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true,
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Fotos bajo /api/uploads para que el proxy de Angular las reenvíe sin configuración extra
app.use('/api/uploads', express.static(uploadsDir, { maxAge: '1h' }));
// Logos de actividades (imágenes públicas, filenames no predecibles)
app.use('/api/files/actividades/logos', express.static(actLogosDir, { maxAge: '1h' }));
// Logo de marca para la página de "compartir" (copia propia dentro de backend/
// para no depender de LANDING_URL ni de que landing/ esté desplegada junto al backend)
app.use('/api/brand', express.static(path.join(__dirname, '..', 'assets', 'brand'), { maxAge: '1d' }));

app.use('/api', indexRouter);

// Servir frontend Angular compilado
// Angular 17+ genera el build en un subdirectorio "browser/" dentro del outputPath
const frontendDist = process.env.FRONTEND_DIST || path.join(__dirname, '..', 'public', 'browser');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Passenger requiere que listen() se llame de forma síncrona al arrancar
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Verificar BD después de iniciar (si falla, process.exit(1) termina el proceso)
testConnection();

module.exports = app;
