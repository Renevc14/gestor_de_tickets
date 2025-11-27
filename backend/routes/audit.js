/**
 * NO REPUDIO - Rutas de Auditoría
 */

const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticateToken } = require('../middleware/auth');
const { checkAuditAccess } = require('../middleware/rbac');

/**
 * GET /api/audit-logs
 * NO REPUDIO - Listar logs de auditoría (solo admin/supervisor)
 */
router.get(
  '/',
  authenticateToken,
  checkAuditAccess,
  auditController.listAuditLogs
);

/**
 * GET /api/audit-logs/stats
 * NO REPUDIO - Obtener estadísticas de auditoría
 */
router.get(
  '/stats',
  authenticateToken,
  checkAuditAccess,
  auditController.getAuditStats
);

/**
 * GET /api/audit-logs/:id
 * NO REPUDIO - Obtener un log específico
 */
router.get(
  '/:id',
  authenticateToken,
  checkAuditAccess,
  auditController.getAuditLog
);

module.exports = router;
