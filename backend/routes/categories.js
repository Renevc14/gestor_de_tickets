/**
 * CATEGORÍAS — Rutas de Categorías
 * GET es público (usuarios autenticados); POST/PATCH/DELETE solo ADMINISTRADOR
 */

const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/rbac');

// Listar y obtener — todos los roles autenticados
router.get('/', authenticateToken, categoryController.listCategories);
router.get('/:id', authenticateToken, categoryController.getCategory);

// Crear / actualizar / eliminar — solo ADMINISTRADOR
router.post('/', authenticateToken, checkRole(['ADMINISTRADOR']), categoryController.createCategory);
router.patch('/:id', authenticateToken, checkRole(['ADMINISTRADOR']), categoryController.updateCategory);
router.delete('/:id', authenticateToken, checkRole(['ADMINISTRADOR']), categoryController.deleteCategory);

module.exports = router;
