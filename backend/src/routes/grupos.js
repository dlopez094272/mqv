const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const superadminMiddleware = require('../middleware/superadminMiddleware');
const ctrl = require('../controllers/gruposController');

router.use(authMiddleware, superadminMiddleware);

router.get('/', ctrl.listar);
router.post('/', ctrl.crear);
router.get('/:id', ctrl.obtener);
router.put('/:id', ctrl.actualizar);
router.delete('/:id', ctrl.eliminar);

router.get('/:id/usuarios-disponibles', ctrl.listarUsuariosDisponibles);
router.post('/:id/miembros', ctrl.agregarMiembro);
router.delete('/:id/miembros/:usuario', ctrl.quitarMiembro);
router.put('/:id/derechos', ctrl.actualizarDerechos);

module.exports = router;
