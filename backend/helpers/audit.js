/**
 * NO REPUDIO - Helper para registrar eventos de auditoría
 */

const AuditLog = require('../models/AuditLog');

/**
 * NO REPUDIO - Registrar evento en log de auditoria
 * @param {ObjectId} userId - ID del usuario (opcional para eventos anonimos)
 * @param {string} action - Accion realizada
 * @param {string} resource - Tipo de recurso (ticket, user, system)
 * @param {ObjectId} resourceId - ID del recurso (opcional)
 * @param {Object} details - Detalles adicionales
 * @param {Object} req - Objeto request para extraer IP y User-Agent
 * @param {Boolean} success - Si la accion fue exitosa
 * @param {string} errorMessage - Mensaje de error si aplica
 * @param {string} attemptedUsername - Username intentado (para logins fallidos)
 */
async function logAuditEvent(
  userId,
  action,
  resource,
  resourceId,
  details = {},
  req,
  success = true,
  errorMessage = null,
  attemptedUsername = null
) {
  try {
    // Extraer IP del request
    const ipAddress =
      req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req?.connection?.remoteAddress ||
      req?.ip ||
      'unknown';

    const userAgent = req?.headers?.['user-agent'] || 'unknown';

    // Crear registro de auditoria
    const auditLogData = {
      action,
      resource,
      resourceId,
      details,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      success,
      errorMessage
    };

    // Solo agregar user si existe
    if (userId) {
      auditLogData.user = userId;
    }

    // Agregar username intentado para eventos sin usuario valido
    if (attemptedUsername) {
      auditLogData.attemptedUsername = attemptedUsername;
    }

    const auditLog = new AuditLog(auditLogData);

    // Guardar en base de datos
    await auditLog.save();

    return auditLog;
  } catch (error) {
    console.error('Error registrando evento de auditoria:', error);
    // No lanzar error para no interrumpir el flujo principal
    return null;
  }
}

/**
 * NO REPUDIO - Registrar login exitoso
 */
async function logLoginSuccess(userId, req) {
  return logAuditEvent(
    userId,
    'login_success',
    'user',
    userId,
    { action: 'login' },
    req,
    true
  );
}

/**
 * NO REPUDIO - Registrar login fallido
 */
async function logLoginFailed(username, reason, req) {
  return logAuditEvent(
    null, // No hay usuario valido
    'login_failed',
    'user',
    null,
    { reason },
    req,
    false,
    reason,
    username // Guardar username intentado
  );
}

/**
 * NO REPUDIO - Registrar bloqueo de cuenta
 */
async function logAccountLocked(userId, req) {
  return logAuditEvent(
    userId,
    'login_blocked',
    'user',
    userId,
    { reason: 'Demasiados intentos fallidos' },
    req,
    false
  );
}

/**
 * NO REPUDIO - Registrar cambio de contraseña
 */
async function logPasswordChanged(userId, req) {
  return logAuditEvent(
    userId,
    'password_changed',
    'user',
    userId,
    { action: 'password_change' },
    req,
    true
  );
}

/**
 * NO REPUDIO - Registrar creación de ticket
 */
async function logTicketCreated(userId, ticketId, ticketData, req) {
  return logAuditEvent(
    userId,
    'ticket_created',
    'ticket',
    ticketId,
    {
      ticketNumber: ticketData.ticketNumber,
      title: ticketData.title,
      priority: ticketData.priority,
      category: ticketData.category
    },
    req,
    true
  );
}

/**
 * NO REPUDIO - Registrar actualización de ticket
 */
async function logTicketUpdated(userId, ticketId, changes, req) {
  return logAuditEvent(
    userId,
    'ticket_updated',
    'ticket',
    ticketId,
    { changes },
    req,
    true
  );
}

/**
 * NO REPUDIO - Registrar cambio de prioridad
 */
async function logPriorityChanged(userId, ticketId, oldValue, newValue, req) {
  return logAuditEvent(
    userId,
    'ticket_priority_changed',
    'ticket',
    ticketId,
    { oldValue, newValue },
    req,
    true
  );
}

/**
 * NO REPUDIO - Registrar escalamiento
 */
async function logTicketEscalated(userId, ticketId, reason, req) {
  return logAuditEvent(
    userId,
    'ticket_escalated',
    'ticket',
    ticketId,
    { reason },
    req,
    true
  );
}

/**
 * NO REPUDIO - Registrar acceso denegado
 */
async function logAccessDenied(userId, resource, action, reason, req) {
  return logAuditEvent(
    userId,
    'permission_denied',
    resource,
    null,
    { action, reason },
    req,
    false,
    reason
  );
}

/**
 * NO REPUDIO - Registrar MFA habilitado
 */
async function logMFAEnabled(userId, req) {
  return logAuditEvent(
    userId,
    'mfa_enabled',
    'user',
    userId,
    { action: 'mfa_enabled' },
    req,
    true
  );
}

/**
 * NO REPUDIO - Registrar archivo adjunto
 */
async function logAttachmentUploaded(userId, ticketId, filename, checksum, req) {
  return logAuditEvent(
    userId,
    'attachment_uploaded',
    'attachment',
    ticketId,
    { filename, checksum },
    req,
    true
  );
}

module.exports = {
  logAuditEvent,
  logLoginSuccess,
  logLoginFailed,
  logAccountLocked,
  logPasswordChanged,
  logTicketCreated,
  logTicketUpdated,
  logPriorityChanged,
  logTicketEscalated,
  logAccessDenied,
  logMFAEnabled,
  logAttachmentUploaded
};
