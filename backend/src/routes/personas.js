const router = require('express').Router();
const auth   = require('../middleware/authMiddleware');
const perms  = require('../middleware/permissionsMiddleware');
const ctrl   = require('../controllers/personasController');

router.use(auth);

router.get('/',             perms('personas','S'), ctrl.listar);
router.get('/exportar',     perms('personas','S'), ctrl.exportarExcel);
router.get('/cumpleaneros', perms('personas','S'), ctrl.cumpleaneros);
router.get('/:id',          perms('personas','S'), ctrl.obtener);
router.post('/',            perms('personas','A'), ctrl.crear);
router.put('/:id',          perms('personas','E'), ctrl.actualizar);
router.delete('/:id',       perms('personas','D'), ctrl.eliminar);
router.post('/:id/email-cumpleaneros', perms('personas','S'), ctrl.enviarEmailCumpleaneros);

// Crecimiento
router.get('/:id/crecimiento',                    perms('personas','S'), ctrl.listarCrecimiento);
router.post('/:id/crecimiento',                   perms('personas','E'), ctrl.agregarCrecimiento);
router.delete('/:id/crecimiento/:idcrecimiento',  perms('personas','E'), ctrl.eliminarCrecimiento);

// Crear usuario desde persona
router.post('/:id/crear-usuario', perms('personas','S'), ctrl.crearUsuarioDesdePersona);

module.exports = router;
