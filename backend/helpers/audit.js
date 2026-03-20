/**
 * NO REPUDIO — Helper para registrar eventos de auditoría
 * Usa Prisma en lugar de Mongoose (migración a PostgreSQL)
 */

const prisma = require('../config/database');

/**
 * Registrar evento en audit_logs
 */
async function logAuditEvent(
  userId,
  action,
  resource,
  resourceId,
  details = {},
  req,
  success = true,
  errorMessage = null
) {
  try {
    const ipAddress =
      req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req?.connection?.remoteAddress ||
      'unknown';

    const userAgent = req?.headers?.['user-agent'] || 'unknown';

    await prisma.auditLog.create({
      data: {
        user_id: userId || null,
        action,
        resource,
        resource_id: resourceId ? String(resourceId) : null,
        details,
        ip_address: ipAddress,
        user_agent: userAgent,
        success,
        error_msg: errorMessage
      }
    });
  } catch (error) {
    console.error('Error registrando evento de auditoría:', error.message);
    // No lanzar — no interrumpir flujo principal
  }
}

async function logLoginSuccess(userId, req) {
  return logAuditEvent(userId, 'login_success', 'user', userId, {}, req, true);
}

async function logLoginFailed(email, reason, req) {
  return logAuditEvent(null, 'login_failed', 'user', null, { email, reason }, req, false, reason);
}

async function logAccountLocked(userId, req) {
  return logAuditEvent(userId, 'account_locked', 'user', userId, { reason: 'Demasiados intentos fallidos' }, req, false);
}

async function logPasswordChanged(userId, req) {
  return logAuditEvent(userId, 'password_changed', 'user', userId, {}, req, true);
}

async function logTicketCreated(userId, ticketId, ticketData, req) {
  return logAuditEvent(userId, 'ticket_created', 'ticket', ticketId, {
    title: ticketData.title,
    priority: ticketData.priority,
    category_id: ticketData.category_id
  }, req, true);
}

async function logTicketUpdated(userId, ticketId, changes, req) {
  return logAuditEvent(userId, 'ticket_updated', 'ticket', ticketId, { changes }, req, true);
}

async function logAccessDenied(userId, resource, action, reason, req) {
  return logAuditEvent(userId, 'permission_denied', resource, null, { action, reason }, req, false, reason);
}

async function logMFAEnabled(userId, req) {
  return logAuditEvent(userId, 'mfa_enabled', 'user', userId, {}, req, true);
}

async function logAttachmentUploaded(userId, ticketId, filename, checksum, req) {
  return logAuditEvent(userId, 'attachment_uploaded', 'attachment', ticketId, { filename, checksum }, req, true);
}

module.exports = {
  logAuditEvent,
  logLoginSuccess,
  logLoginFailed,
  logAccountLocked,
  logPasswordChanged,
  logTicketCreated,
  logTicketUpdated,
  logAccessDenied,
  logMFAEnabled,
  logAttachmentUploaded
};
