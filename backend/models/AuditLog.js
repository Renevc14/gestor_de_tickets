/**
 * NO REPUDIO - Modelo de Registro de Auditoría
 * Implementa logs INMUTABLES para rastrear todos los eventos del sistema
 */

const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    // NO REPUDIO - Usuario que realizó la acción
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Usuario es requerido'],
      index: true
    },

    // NO REPUDIO - Acción realizada
    action: {
      type: String,
      required: [true, 'Acción es requerida'],
      enum: [
        'login_success',
        'login_failed',
        'login_blocked',
        'logout',
        'register_user',
        'password_changed',
        'password_reset',
        'mfa_enabled',
        'mfa_disabled',
        'ticket_created',
        'ticket_updated',
        'ticket_priority_changed',
        'ticket_escalated',
        'ticket_resolved',
        'ticket_closed',
        'ticket_assigned',
        'ticket_reassigned',
        'comment_added',
        'attachment_uploaded',
        'permission_denied',
        'access_unauthorized'
      ],
      index: true
    },

    // NO REPUDIO - Recurso afectado
    resource: {
      type: String,
      enum: ['ticket', 'user', 'system', 'attachment', 'comment'],
      required: [true, 'Recurso es requerido'],
      index: true
    },

    // NO REPUDIO - ID del recurso afectado
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true
    },

    // NO REPUDIO - Detalles adicionales de la acción
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    // NO REPUDIO - Dirección IP del usuario
    ipAddress: {
      type: String,
      required: [true, 'IP es requerida']
    },

    // NO REPUDIO - User Agent (navegador/cliente)
    userAgent: String,

    // NO REPUDIO - Timestamp inmutable
    timestamp: {
      type: Date,
      default: Date.now,
      immutable: true,
      index: true
    },

    // NO REPUDIO - Resultado de la acción
    success: {
      type: Boolean,
      default: true
    },

    // NO REPUDIO - Mensaje de error si aplica
    errorMessage: String
  },
  {
    timestamps: false // No usar timestamps automáticos, usar timestamp manual
  }
);

/**
 * NO REPUDIO - Middleware: Prevenir modificación de logs existentes
 * Los logs son INMUTABLES - solo se permite inserción
 */
AuditLogSchema.pre('save', function (next) {
  // Si el documento ya existe, rechazar la operación
  if (!this.isNew) {
    const error = new Error('No se pueden modificar logs de auditoría');
    error.statusCode = 403;
    return next(error);
  }
  next();
});

/**
 * NO REPUDIO - Middleware: Prevenir eliminación de logs
 */
AuditLogSchema.pre('findByIdAndDelete', function (next) {
  const error = new Error('No se pueden eliminar logs de auditoría');
  error.statusCode = 403;
  return next(error);
});

AuditLogSchema.pre('deleteMany', function (next) {
  const error = new Error('No se pueden eliminar logs de auditoría');
  error.statusCode = 403;
  return next(error);
});

/**
 * NO REPUDIO - Índices para consultas eficientes
 */
AuditLogSchema.index({ user: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1, timestamp: -1 });
AuditLogSchema.index({ ipAddress: 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

module.exports = AuditLog;
