/**
 * ADMINISTRACIÓN — Rutas de Gestión de Usuarios
 * Solo ADMINISTRADOR (excepto /technicians para TECNICO/ADMINISTRADOR)
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/rbac');

// Lista técnicos activos — disponible para ADMINISTRADOR y TECNICO (para asignación)
router.get('/technicians', authenticateToken, checkRole(['ADMINISTRADOR', 'TECNICO']), userController.listTechnicians);

// CRUD de usuarios — solo ADMINISTRADOR
router.get('/', authenticateToken, checkRole(['ADMINISTRADOR']), userController.listUsers);
router.get('/:id', authenticateToken, checkRole(['ADMINISTRADOR']), userController.getUser);
router.post('/', authenticateToken, checkRole(['ADMINISTRADOR']), userController.createUser);
router.patch('/:id', authenticateToken, checkRole(['ADMINISTRADOR']), userController.updateUser);
router.post('/:id/unlock', authenticateToken, checkRole(['ADMINISTRADOR']), userController.unlockUser);

module.exports = router;
