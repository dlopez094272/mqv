const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
require('dotenv').config();

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

app.use('/api', indexRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

testConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
});

module.exports = app;
