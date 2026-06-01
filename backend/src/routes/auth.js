const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const ctrl = require('../controllers/authController');

router.post('/login', ctrl.login);
router.post('/forgot-password', ctrl.forgotPassword);
router.get('/verify-token/:token', ctrl.verifyResetToken);
router.post('/reset-password', ctrl.resetPassword);
router.post('/complete-registration', ctrl.completeRegistration);
router.put('/change-password', authMiddleware, ctrl.changePassword);
router.get('/mis-permisos', authMiddleware, ctrl.misPermisos);
router.get('/mi-persona', authMiddleware, ctrl.miPersona);
router.get('/mi-perfil-persona', authMiddleware, ctrl.getMiPerfilPersona);
router.put('/mi-perfil-persona', authMiddleware, ctrl.updateMiPerfilPersona);

module.exports = router;
