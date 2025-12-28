/**
 * CONTROL DE ACCESO - Rutas de Administración de Usuarios
 * Solo accesible por Administradores
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const userController = require('../controllers/userController');

/**
 * Middleware: Solo administradores pueden acceder
 */
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'administrador') {
    return res.status(403).json({
      success: false,
      message: 'Acceso restringido a administradores'
    });
  }
  next();
};

/**
 * GET /api/users
 * Listar todos los usuarios
 */
router.get('/',
  authenticateToken,
  adminOnly,
  userController.listUsers
);

/**
 * GET /api/users/:id
 * Obtener usuario por ID
 */
router.get('/:id',
  authenticateToken,
  adminOnly,
  userController.getUser
);

/**
 * PUT /api/users/:id/role
 * Actualizar rol de usuario
 */
router.put('/:id/role',
  authenticateToken,
  adminOnly,
  userController.updateUserRole
);

/**
 * PUT /api/users/:id/status
 * Activar/Desactivar usuario
 */
router.put('/:id/status',
  authenticateToken,
  adminOnly,
  userController.updateUserStatus
);

module.exports = router;
