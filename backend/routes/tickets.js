/**
 * INTEGRIDAD — Rutas de Tickets
 * Monografía UCB: 6 estados, asignación, historial inmutable
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const ticketController = require('../controllers/ticketController');
const attachmentController = require('../controllers/attachmentController');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/rbac');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

// ─── Tickets CRUD ────────────────────────────────────────────────────────────
router.post('/', authenticateToken, ticketController.createTicket);
router.get('/', authenticateToken, ticketController.listTickets);
router.get('/:id', authenticateToken, ticketController.getTicket);
router.patch('/:id', authenticateToken, ticketController.updateTicket);

// ─── Asignación (solo ADMINISTRADOR) ─────────────────────────────────────────
router.patch('/:id/assign', authenticateToken, checkRole(['ADMINISTRADOR']), ticketController.assignTicket);

// ─── Cambio de estado (TECNICO o ADMINISTRADOR) ───────────────────────────────
router.patch('/:id/status', authenticateToken, checkRole(['TECNICO', 'ADMINISTRADOR']), ticketController.changeStatus);

// ─── Comentarios ─────────────────────────────────────────────────────────────
router.post('/:id/comments', authenticateToken, ticketController.addComment);

// ─── Historial (inmutable) ────────────────────────────────────────────────────
router.get('/:id/history', authenticateToken, ticketController.getHistory);

// ─── Adjuntos ────────────────────────────────────────────────────────────────
router.post('/:ticketId/attachments', authenticateToken, upload.single('file'), attachmentController.uploadAttachment);
router.get('/:ticketId/attachments/:attachmentId/download', authenticateToken, attachmentController.downloadAttachment);
router.delete('/:ticketId/attachments/:attachmentId', authenticateToken, attachmentController.deleteAttachment);

module.exports = router;
