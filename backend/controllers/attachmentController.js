/**
 * INTEGRIDAD Y SEGURIDAD - Controlador de Adjuntos
 * Maneja upload y descarga segura de archivos con validación
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const Ticket = require('../models/Ticket');
const { validateAttachment, generateSecureFilename } = require('../helpers/validation');
const { logAuditEvent } = require('../helpers/audit');

/**
 * SEGURIDAD - Subir archivo adjunto a ticket
 * Valida MIME type, tamaño, sanitiza nombre
 */
async function uploadAttachment(req, res) {
  try {
    const { ticketId } = req.params;
    const file = req.file;
    const userId = req.user._id;

    // Validar que el ticket existe
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      await logAuditEvent({
        user: userId,
        action: 'file_upload_failed',
        resource: 'ticket',
        resourceId: ticketId,
        details: { reason: 'Ticket no encontrado' },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: false,
        errorMessage: 'Ticket no encontrado'
      });

      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    // Validar acceso (solo quien creó o está asignado)
    const hasAccess =
      ticket.createdBy.toString() === userId.toString() ||
      ticket.assignedTo?.toString() === userId.toString() ||
      req.user.role === 'administrador' ||
      req.user.role === 'supervisor';

    if (!hasAccess) {
      await logAuditEvent({
        user: userId,
        action: 'permission_denied',
        resource: 'ticket',
        resourceId: ticketId,
        details: { action: 'file_upload' },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: false,
        errorMessage: 'No tiene permiso para subir archivos a este ticket'
      });

      return res.status(403).json({ error: 'No tiene permiso para subir archivos a este ticket' });
    }

    // Validar el archivo
    const validation = validateAttachment(file, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
      ]
    });

    if (!validation.isValid) {
      await logAuditEvent({
        user: userId,
        action: 'file_upload_failed',
        resource: 'ticket',
        resourceId: ticketId,
        details: { errors: validation.errors },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: false,
        errorMessage: validation.errors.join('; ')
      });

      return res.status(400).json({ errors: validation.errors });
    }

    // Generar nombre seguro
    const secureFilename = generateSecureFilename(file.originalname);
    const uploadsDir = path.join(__dirname, '../uploads');

    // Crear directorio si no existe
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
    } catch (err) {
      console.error('Error creando directorio uploads:', err);
    }

    // Guardar archivo
    const filePath = path.join(uploadsDir, secureFilename);
    await fs.writeFile(filePath, file.buffer);

    // Calcular checksum del archivo
    const fileBuffer = await fs.readFile(filePath);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Agregar información del archivo al ticket
    const attachmentData = {
      filename: secureFilename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      checksum: checksum,
      uploadedBy: userId,
      uploadedAt: new Date(),
      filePath: filePath
    };

    // Inicializar array de adjuntos si no existe
    if (!ticket.attachments) {
      ticket.attachments = [];
    }

    ticket.attachments.push(attachmentData);
    await ticket.save();

    // Loguear en auditoría
    await logAuditEvent({
      user: userId,
      action: 'file_uploaded',
      resource: 'ticket',
      resourceId: ticketId,
      details: {
        filename: secureFilename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true
    });

    return res.status(200).json({
      message: 'Archivo subido exitosamente',
      attachment: {
        filename: secureFilename,
        originalName: file.originalname,
        size: file.size,
        uploadedAt: attachmentData.uploadedAt
      }
    });

  } catch (error) {
    console.error('Error subiendo archivo:', error);
    return res.status(500).json({ error: 'Error al subir el archivo' });
  }
}

/**
 * SEGURIDAD - Descargar archivo adjunto
 * Verifica permisos y checksum antes de descargar
 */
async function downloadAttachment(req, res) {
  try {
    const { ticketId, attachmentId } = req.params;
    const userId = req.user._id;

    // Validar que el ticket existe
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      await logAuditEvent({
        user: userId,
        action: 'file_download_failed',
        resource: 'ticket',
        resourceId: ticketId,
        details: { reason: 'Ticket no encontrado' },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: false,
        errorMessage: 'Ticket no encontrado'
      });

      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    // Validar acceso
    const hasAccess =
      ticket.createdBy.toString() === userId.toString() ||
      ticket.assignedTo?.toString() === userId.toString() ||
      req.user.role === 'administrador' ||
      req.user.role === 'supervisor';

    if (!hasAccess) {
      await logAuditEvent({
        user: userId,
        action: 'permission_denied',
        resource: 'ticket',
        resourceId: ticketId,
        details: { action: 'file_download', attachmentId },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: false,
        errorMessage: 'No tiene permiso para descargar archivos de este ticket'
      });

      return res.status(403).json({ error: 'No tiene permiso' });
    }

    // Encontrar el archivo
    const attachment = ticket.attachments?.find(
      att => att._id.toString() === attachmentId
    );

    if (!attachment) {
      await logAuditEvent({
        user: userId,
        action: 'file_download_failed',
        resource: 'ticket',
        resourceId: ticketId,
        details: { reason: 'Archivo no encontrado', attachmentId },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: false,
        errorMessage: 'Archivo no encontrado'
      });

      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    // Verificar que el archivo existe en el sistema de archivos
    try {
      await fs.access(attachment.filePath);
    } catch (err) {
      return res.status(404).json({ error: 'Archivo no disponible' });
    }

    // Verificar integridad del archivo (checksum)
    const fileBuffer = await fs.readFile(attachment.filePath);
    const calculatedChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    if (calculatedChecksum !== attachment.checksum) {
      await logAuditEvent({
        user: userId,
        action: 'file_download_failed',
        resource: 'ticket',
        resourceId: ticketId,
        details: { reason: 'Checksum no coincide', attachmentId },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: false,
        errorMessage: 'Archivo corrupto: checksum no coincide'
      });

      return res.status(400).json({ error: 'Archivo corrupto' });
    }

    // Loguear descarga
    await logAuditEvent({
      user: userId,
      action: 'file_downloaded',
      resource: 'ticket',
      resourceId: ticketId,
      details: {
        filename: attachment.filename,
        originalName: attachment.originalName,
        size: attachment.size
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true
    });

    // Enviar archivo
    res.download(attachment.filePath, attachment.originalName);

  } catch (error) {
    console.error('Error descargando archivo:', error);
    return res.status(500).json({ error: 'Error al descargar el archivo' });
  }
}

/**
 * SEGURIDAD - Eliminar archivo adjunto
 */
async function deleteAttachment(req, res) {
  try {
    const { ticketId, attachmentId } = req.params;
    const userId = req.user._id;

    // Validar que el ticket existe
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    // Validar acceso (solo quien creó, asignado, admin o supervisor)
    const hasAccess =
      ticket.createdBy.toString() === userId.toString() ||
      ticket.assignedTo?.toString() === userId.toString() ||
      req.user.role === 'administrador' ||
      req.user.role === 'supervisor';

    if (!hasAccess) {
      await logAuditEvent({
        user: userId,
        action: 'permission_denied',
        resource: 'ticket',
        resourceId: ticketId,
        details: { action: 'file_delete', attachmentId },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: false
      });

      return res.status(403).json({ error: 'No tiene permiso' });
    }

    // Encontrar el archivo
    const attachmentIndex = ticket.attachments?.findIndex(
      att => att._id.toString() === attachmentId
    );

    if (attachmentIndex === -1 || attachmentIndex === undefined) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    const attachment = ticket.attachments[attachmentIndex];

    // Eliminar archivo del sistema de archivos
    try {
      await fs.unlink(attachment.filePath);
    } catch (err) {
      console.error('Error eliminando archivo:', err);
    }

    // Remover del array
    ticket.attachments.splice(attachmentIndex, 1);
    await ticket.save();

    // Loguear en auditoría
    await logAuditEvent({
      user: userId,
      action: 'file_deleted',
      resource: 'ticket',
      resourceId: ticketId,
      details: { filename: attachment.filename },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true
    });

    return res.status(200).json({ message: 'Archivo eliminado exitosamente' });

  } catch (error) {
    console.error('Error eliminando archivo:', error);
    return res.status(500).json({ error: 'Error al eliminar el archivo' });
  }
}

module.exports = {
  uploadAttachment,
  downloadAttachment,
  deleteAttachment
};
