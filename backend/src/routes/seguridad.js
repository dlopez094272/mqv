const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const can = require('../middleware/permissionsMiddleware');
const ctrl = require('../controllers/usuariosController');

router.use(authMiddleware);

// Verificar disponibilidad de código (cualquier usuario autenticado — usado al crear usuario desde persona)
router.get('/usuarios/verificar/:codigo', ctrl.verificarCodigo);

// Lista de grupos de permisos para selects (cualquier usuario autenticado)
router.get('/grupos-lista', ctrl.listarGruposBasico);

// S = puede ver la lista y el detalle
router.get('/usuarios',                          can('usuarios', 'S'), ctrl.listar);
router.get('/usuarios/:usuario/foto',            can('usuarios', 'S'), ctrl.getFoto);
router.get('/usuarios/:usuario',                 can('usuarios', 'S'), ctrl.obtener);

// A = puede crear y reenviar invitaciones
router.post('/usuarios',                         can('usuarios', 'A'), ctrl.crear);
router.post('/usuarios/:usuario/reenviar-invitacion', can('usuarios', 'A'), ctrl.reenviarInvitacion);

// E = puede editar, activar y desactivar
router.put('/usuarios/:usuario',                 can('usuarios', 'E'), ctrl.actualizar);
router.put('/usuarios/:usuario/desactivar',      can('usuarios', 'E'), ctrl.desactivar);
router.put('/usuarios/:usuario/activar',         can('usuarios', 'E'), ctrl.activar);

module.exports = router;
