function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Error interno del servidor';

  if (process.env.NODE_ENV === 'development') {
    console.error(`[Error] ${status} - ${message}`, err.stack);
  }

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
