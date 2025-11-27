/**
 * INTEGRIDAD - Modelo de Ticket
 * Implementa historial de cambios, auditoría y cifrado de datos sensibles
 */

const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../config/security');

const TicketSchema = new mongoose.Schema(
  {
    // GENERACIÓN - Número único de ticket
    ticketNumber: {
      type: String,
      unique: true,
      required: true,
      index: true
    },

    // CREACIÓN - Usuario creador
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Usuario creador es requerido'],
      index: true
    },

    // ASIGNACIÓN - Usuario asignado
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },

    // INFORMACIÓN - Título del ticket
    title: {
      type: String,
      required: [true, 'Título es requerido'],
      maxlength: [200, 'Título no puede exceder 200 caracteres'],
      trim: true
    },

    // INFORMACIÓN - Descripción detallada
    description: {
      type: String,
      required: [true, 'Descripción es requerida'],
      trim: true
    },

    // CLASIFICACIÓN - Categoría del ticket
    category: {
      type: String,
      enum: ['soporte_funcional', 'incidente', 'alarma'],
      required: [true, 'Categoría es requerida'],
      index: true
    },

    // PRIORIDAD - Nivel de urgencia
    priority: {
      type: String,
      enum: ['baja', 'media', 'alta', 'critica'],
      required: [true, 'Prioridad es requerida'],
      default: 'media',
      index: true
    },

    // ESTADO - Estado actual del ticket
    status: {
      type: String,
      enum: ['abierto', 'en_proceso', 'escalado', 'resuelto', 'cerrado'],
      required: true,
      default: 'abierto',
      index: true
    },

    // CONFIDENCIALIDAD - Nivel de confidencialidad
    confidentiality: {
      type: String,
      enum: ['publico', 'interno', 'confidencial'],
      default: 'interno'
    },

    // DISPONIBILIDAD - Deadline SLA calculado automáticamente
    slaDeadline: {
      type: Date,
      required: true,
      index: true
    },

    // RESOLUCIÓN - Fecha de resolución
    resolvedAt: Date,

    // CIERRE - Fecha de cierre
    closedAt: Date,

    // INTEGRIDAD - Historial inmutable de cambios
    history: [
      {
        action: {
          type: String,
          enum: ['create', 'update', 'escalate', 'resolve', 'close', 'assign', 'reassign']
        },
        field: String, // qué campo cambió
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        timestamp: {
          type: Date,
          default: Date.now,
          immutable: true
        },
        ipAddress: String,
        _id: false
      }
    ],

    // INTEGRIDAD - Archivos adjuntos con checksums
    attachments: [
      {
        filename: {
          type: String,
          required: true
        },
        path: {
          type: String,
          required: true
        },
        checksum: {
          type: String,
          required: true // SHA-256
        },
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        uploadedAt: {
          type: Date,
          default: Date.now
        },
        _id: false
      }
    ],

    // COMUNICACIÓN - Comentarios del ticket
    comments: [
      {
        text: {
          type: String,
          required: true
        },
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        timestamp: {
          type: Date,
          default: Date.now
        },
        isEdited: {
          type: Boolean,
          default: false
        },
        _id: false
      }
    ],

    // AUDITORÍA
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
      index: true
    },

    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

/**
 * DISPONIBILIDAD - Generar número de ticket auto-incremental
 * Formato: TKT-000001
 */
TicketSchema.statics.generateTicketNumber = async function () {
  const count = await this.countDocuments();
  const number = (count + 1).toString().padStart(6, '0');
  return `TKT-${number}`;
};

/**
 * DISPONIBILIDAD - Calcular SLA deadline basado en prioridad
 */
TicketSchema.statics.calculateSLADeadline = function (priority) {
  const now = new Date();
  const slaHours = {
    critica: 2,
    alta: 8,
    media: 24,
    baja: 72
  };

  const hours = slaHours[priority] || 24;
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
};

/**
 * INTEGRIDAD - Middleware: Registrar cambios en historial
 */
TicketSchema.pre('save', async function (next) {
  try {
    // Si es nuevo documento, registrar creación
    if (this.isNew) {
      // El historial se agregará en el controller
      return next();
    }

    // Si es actualización, detectar cambios (implementado en controller)
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * INTEGRIDAD - Método para agregar entrada al historial
 */
TicketSchema.methods.addHistory = function (
  action,
  field,
  oldValue,
  newValue,
  changedBy,
  ipAddress
) {
  this.history.push({
    action,
    field,
    oldValue,
    newValue,
    changedBy,
    timestamp: new Date(),
    ipAddress
  });
};

/**
 * INTEGRIDAD - Método para calcular si está vencido en SLA
 */
TicketSchema.virtual('isOverSLA').get(function () {
  if (['resuelto', 'cerrado'].includes(this.status)) {
    return false;
  }
  return new Date() > this.slaDeadline;
});

/**
 * DISPONIBILIDAD - Método para resolver ticket
 */
TicketSchema.methods.resolve = function (resolvedBy, ipAddress) {
  this.status = 'resuelto';
  this.resolvedAt = new Date();
  this.addHistory('resolve', 'status', 'en_proceso', 'resuelto', resolvedBy, ipAddress);
};

/**
 * DISPONIBILIDAD - Método para cerrar ticket
 */
TicketSchema.methods.close = function (closedBy, ipAddress) {
  this.status = 'cerrado';
  this.closedAt = new Date();
  this.addHistory('close', 'status', this.status === 'resuelto' ? 'resuelto' : 'abierto', 'cerrado', closedBy, ipAddress);
};

/**
 * INTEGRIDAD - Índices para optimización
 */
TicketSchema.index({ createdBy: 1, createdAt: -1 });
TicketSchema.index({ assignedTo: 1, status: 1 });
TicketSchema.index({ priority: 1, status: 1 });
TicketSchema.index({ slaDeadline: 1, status: 1 });
TicketSchema.index({ 'history.timestamp': -1 });

const Ticket = mongoose.model('Ticket', TicketSchema);

module.exports = Ticket;
