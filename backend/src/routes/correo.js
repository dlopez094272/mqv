const router = require('express').Router();
const multer = require('multer');
const auth   = require('../middleware/authMiddleware');
const ctrl   = require('../controllers/correoController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 25 * 1024 * 1024 },
});

router.use(auth);

router.get('/no-leidos',                                    ctrl.contarNoLeidos);
router.get('/credenciales',                                 ctrl.obtenerCredenciales);
router.post('/credenciales',                                ctrl.guardarCredenciales);
router.delete('/credenciales',                              ctrl.eliminarCredenciales);
router.get('/carpetas',                                     ctrl.listarCarpetas);
router.get('/bandeja',                                      ctrl.listarBandeja);
router.get('/contactos',                                    ctrl.buscarContactos);
router.post('/enviar', upload.array('adjuntos', 10),        ctrl.enviarCorreo);
router.get('/:uid/adjunto',                                 ctrl.descargarAdjunto);
router.get('/:uid',                                         ctrl.leerCorreo);
router.delete('/:uid',                                      ctrl.eliminarCorreo);

module.exports = router;
