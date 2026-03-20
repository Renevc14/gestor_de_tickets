/**
 * INTEGRIDAD — Controlador de Adjuntos
 * Tabla `attachments` en PostgreSQL con verificación SHA-256
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const prisma = require('../config/database');
const { logAuditEvent } = require('../helpers/audit');
const { validateAttachment, generateSecureFilename } = require('../helpers/validation');

const UPLOADS_DIR = path.join(__dirname, '../uploads');

const ALLOWED_MIMETYPES = [
  'image/jpeg', 'image/png', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv'
];

function hasTicketAccess(ticket, user) {
  if (user.role === 'ADMINISTRADOR') return true;
  if (ticket.user_id === user.id) return true;
  if (ticket.tech_id === user.id) return true;
  return false;
}

/**
 * POST /api/tickets/:ticketId/attachments
 */
async function uploadAttachment(req, res) {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No se recibió ningún archivo' });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }

    if (!hasTicketAccess(ticket, req.user)) {
      await logAuditEvent(req.user.id, 'permission_denied', 'ticket', ticketId, { action: 'file_upload' }, req, false);
      return res.status(403).json({ success: false, message: 'No tiene permiso para subir archivos a este ticket' });
    }

    // Validar tipo y tamaño
    const validation = validateAttachment(file, {
      maxSize: 10 * 1024 * 1024, // 10 MB
      allowedMimeTypes: ALLOWED_MIMETYPES
    });

    if (!validation.isValid) {
      await logAuditEvent(req.user.id, 'file_upload_failed', 'ticket', ticketId, { errors: validation.errors }, req, false);
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    // Crear directorio si no existe
    await fs.mkdir(UPLOADS_DIR, { recursive: true });

    // Guardar archivo con nombre seguro
    const secureFilename = generateSecureFilename(file.originalname);
    const filePath = path.join(UPLOADS_DIR, secureFilename);
    await fs.writeFile(filePath, file.buffer);

    // Calcular checksum SHA-256
    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // Guardar en tabla attachments
    const attachment = await prisma.attachment.create({
      data: {
        ticket_id: ticketId,
        filename: secureFilename,
        path: filePath,
        mimetype: file.mimetype,
        size: file.size,
        checksum,
        uploaded_by: req.user.id
      }
    });

    await logAuditEvent(req.user.id, 'file_uploaded', 'attachment', attachment.id, {
      filename: secureFilename,
      originalName: file.originalname,
      size: file.size,
      checksum
    }, req, true);

    return res.status(201).json({
      success: true,
      message: 'Archivo subido exitosamente',
      attachment: {
        id: attachment.id,
        filename: secureFilename,
        originalName: file.originalname,
        size: file.size,
        uploaded_at: attachment.uploaded_at
      }
    });
  } catch (error) {
    console.error('Error subiendo archivo:', error);
    return res.status(500).json({ success: false, message: 'Error al subir el archivo' });
  }
}

/**
 * GET /api/tickets/:ticketId/attachments/:attachmentId/download
 */
async function downloadAttachment(req, res) {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const attachmentId = parseInt(req.params.attachmentId);

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }

    if (!hasTicketAccess(ticket, req.user)) {
      await logAuditEvent(req.user.id, 'permission_denied', 'ticket', ticketId, { action: 'file_download' }, req, false);
      return res.status(403).json({ success: false, message: 'No tiene permiso' });
    }

    const attachment = await prisma.attachment.findFirst({
      where: { id: attachmentId, ticket_id: ticketId }
    });

    if (!attachment) {
      return res.status(404).json({ success: false, message: 'Archivo no encontrado' });
    }

    // Verificar que el archivo existe
    try {
      await fs.access(attachment.path);
    } catch {
      return res.status(404).json({ success: false, message: 'Archivo no disponible en disco' });
    }

    // Verificar integridad (SHA-256)
    const fileBuffer = await fs.readFile(attachment.path);
    const calculatedChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    if (calculatedChecksum !== attachment.checksum) {
      await logAuditEvent(req.user.id, 'file_integrity_failed', 'attachment', attachmentId, {}, req, false, 'Checksum no coincide');
      return res.status(400).json({ success: false, message: 'Archivo corrupto: checksum no coincide' });
    }

    await logAuditEvent(req.user.id, 'file_downloaded', 'attachment', attachmentId, { filename: attachment.filename }, req, true);

    res.download(attachment.path, attachment.filename);
  } catch (error) {
    console.error('Error descargando archivo:', error);
    return res.status(500).json({ success: false, message: 'Error al descargar el archivo' });
  }
}

/**
 * DELETE /api/tickets/:ticketId/attachments/:attachmentId
 */
async function deleteAttachment(req, res) {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const attachmentId = parseInt(req.params.attachmentId);

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }

    if (!hasTicketAccess(ticket, req.user)) {
      return res.status(403).json({ success: false, message: 'No tiene permiso' });
    }

    const attachment = await prisma.attachment.findFirst({
      where: { id: attachmentId, ticket_id: ticketId }
    });

    if (!attachment) {
      return res.status(404).json({ success: false, message: 'Archivo no encontrado' });
    }

    // Eliminar archivo físico
    try {
      await fs.unlink(attachment.path);
    } catch (err) {
      console.error('Error eliminando archivo físico:', err.message);
    }

    await prisma.attachment.delete({ where: { id: attachmentId } });

    await logAuditEvent(req.user.id, 'file_deleted', 'attachment', attachmentId, { filename: attachment.filename }, req, true);

    return res.status(200).json({ success: true, message: 'Archivo eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando archivo:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar el archivo' });
  }
}

module.exports = { uploadAttachment, downloadAttachment, deleteAttachment };
