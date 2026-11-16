const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const ctrl = require('../controllers/authController');

router.post('/login', ctrl.login);
router.post('/renovar', ctrl.renovar);
router.post('/cerrar-sesion', ctrl.cerrarSesion);
router.put('/push-token', authMiddleware, ctrl.registrarPushToken);
router.post('/dispositivo', authMiddleware, ctrl.registrarDispositivo);
router.post('/forgot-password', ctrl.forgotPassword);
router.get('/verify-token/:token', ctrl.verifyResetToken);
router.post('/reset-password', ctrl.resetPassword);
router.post('/complete-registration', ctrl.completeRegistration);
router.put('/change-password', authMiddleware, ctrl.changePassword);
router.get('/mis-permisos', authMiddleware, ctrl.misPermisos);
router.get('/mi-persona', authMiddleware, ctrl.miPersona);
router.get('/mi-perfil-persona', authMiddleware, ctrl.getMiPerfilPersona);
router.put('/mi-perfil-persona', authMiddleware, ctrl.updateMiPerfilPersona);
router.get('/mi-cuenta', authMiddleware, ctrl.miCuenta);
router.put('/mis-datos', authMiddleware, ctrl.actualizarMisDatos);

module.exports = router;
