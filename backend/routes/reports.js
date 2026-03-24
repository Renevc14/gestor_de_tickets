/**
 * RF06 — Rutas de Reportes y Métricas
 * Solo ADMINISTRADOR
 */

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/rbac');

router.use(authenticateToken, checkRole(['ADMINISTRADOR']));

router.get('/dashboard', reportController.getDashboard);
router.get('/by-tech', reportController.getByTech);
router.get('/by-category', reportController.getByCategory);
router.get('/resolution-time', reportController.getResolutionTime);
router.get('/export', reportController.exportToExcel);

module.exports = router;
