/**
 * INTEGRIDAD - Rutas de Tickets
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const ticketController = require('../controllers/ticketController');
const attachmentController = require('../controllers/attachmentController');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

// Configurar multer para carga de archivos en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

/**
 * POST /api/tickets
 * INTEGRIDAD - Crear nuevo ticket
 */
router.post(
  '/',
  authenticateToken,
  checkPermission('tickets', 'create'),
  ticketController.createTicket
);

/**
 * GET /api/tickets
 * INTEGRIDAD - Listar tickets (según permisos del rol)
 */
router.get(
  '/',
  authenticateToken,
  ticketController.listTickets
);

/**
 * GET /api/tickets/:id
 * INTEGRIDAD - Obtener detalles de un ticket
 */
router.get(
  '/:id',
  authenticateToken,
  ticketController.getTicket
);

/**
 * PUT /api/tickets/:id
 * INTEGRIDAD - Actualizar ticket
 */
router.put(
  '/:id',
  authenticateToken,
  ticketController.updateTicket
);

/**
 * POST /api/tickets/:id/escalate
 * INTEGRIDAD - Escalar ticket
 */
router.post(
  '/:id/escalate',
  authenticateToken,
  ticketController.escalateTicket
);

/**
 * POST /api/tickets/:id/comments
 * INTEGRIDAD - Agregar comentario
 */
router.post(
  '/:id/comments',
  authenticateToken,
  ticketController.addComment
);

/**
 * GET /api/tickets/:id/history
 * INTEGRIDAD - Obtener historial de cambios
 */
router.get(
  '/:id/history',
  authenticateToken,
  ticketController.getHistory
);

/**
 * POST /api/tickets/:ticketId/attachments
 * SEGURIDAD - Subir archivo adjunto
 */
router.post(
  '/:ticketId/attachments',
  authenticateToken,
  upload.single('file'),
  attachmentController.uploadAttachment
);

/**
 * GET /api/tickets/:ticketId/attachments/:attachmentId
 * SEGURIDAD - Descargar archivo adjunto (con verificación de integridad)
 */
router.get(
  '/:ticketId/attachments/:attachmentId',
  authenticateToken,
  attachmentController.downloadAttachment
);

/**
 * DELETE /api/tickets/:ticketId/attachments/:attachmentId
 * SEGURIDAD - Eliminar archivo adjunto
 */
router.delete(
  '/:ticketId/attachments/:attachmentId',
  authenticateToken,
  attachmentController.deleteAttachment
);

module.exports = router;
