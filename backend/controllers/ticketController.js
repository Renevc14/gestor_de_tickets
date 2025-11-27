/**
 * INTEGRIDAD - Controlador de Tickets
 * Maneja creación, actualización, historial y auditoría de tickets
 */

const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { validateRequiredFields, sanitizeInput } = require('../helpers/validation');
const { canAccessTicket, getTicketFilters } = require('../helpers/rbac');
const {
  logTicketCreated,
  logTicketUpdated,
  logPriorityChanged,
  logTicketEscalated,
  logAttachmentUploaded
} = require('../helpers/audit');
const { calculateChecksum } = require('../config/security');

/**
 * INTEGRIDAD - Crear nuevo ticket
 * POST /api/tickets
 */
const createTicket = async (req, res) => {
  try {
    const { title, description, category, priority = 'media', confidentiality = 'interno' } = req.body;

    // INTEGRIDAD - Validar campos requeridos
    const validation = validateRequiredFields(req.body, ['title', 'description', 'category']);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
        missingFields: validation.missingFields
      });
    }

    // INTEGRIDAD - Sanitizar inputs
    const sanitizedTitle = sanitizeInput(title);
    const sanitizedDescription = sanitizeInput(description);

    // Generar número de ticket
    const ticketNumber = await Ticket.generateTicketNumber();

    // Calcular SLA deadline
    const slaDeadline = Ticket.calculateSLADeadline(priority);

    // INTEGRIDAD - Crear ticket
    const ticket = new Ticket({
      ticketNumber,
      createdBy: req.user._id,
      title: sanitizedTitle,
      description: sanitizedDescription,
      category,
      priority,
      confidentiality,
      slaDeadline,
      status: 'abierto'
    });

    // INTEGRIDAD - Registrar creación en historial
    ticket.addHistory(
      'create',
      'status',
      null,
      'abierto',
      req.user._id,
      req.connection.remoteAddress
    );

    await ticket.save();

    // NO REPUDIO - Registrar en auditoría
    await logTicketCreated(req.user._id, ticket._id, ticket.toObject(), req);

    // Populate referencias
    await ticket.populate(['createdBy', 'assignedTo']);

    res.status(201).json({
      success: true,
      message: 'Ticket creado exitosamente',
      ticket
    });
  } catch (error) {
    console.error('Error creando ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando ticket'
    });
  }
};

/**
 * INTEGRIDAD - Listar tickets según rol
 * GET /api/tickets
 */
const listTickets = async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 10 } = req.query;

    // CONFIDENCIALIDAD - Obtener filtros según rol
    const filters = getTicketFilters(req.user);
    console.log(`[listTickets] Usuario ${req.user._id} (${req.user.role}) - Filtros aplicados:`, filters);

    // Agregar filtros adicionales
    if (status) {
      filters.status = status;
    }
    if (priority) {
      filters.priority = priority;
    }

    // Calcular skip para paginación
    const skip = (page - 1) * limit;

    // Obtener tickets
    const tickets = await Ticket.find(filters)
      .populate(['createdBy', 'assignedTo'])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Contar total
    const total = await Ticket.countDocuments(filters);

    console.log(`[listTickets] Encontrados ${tickets.length} tickets (total: ${total})`);

    res.status(200).json({
      success: true,
      tickets,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listando tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Error listando tickets'
    });
  }
};

/**
 * INTEGRIDAD - Obtener detalles de un ticket
 * GET /api/tickets/:id
 */
const getTicket = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[getTicket] Buscando ticket ID: ${id}, Usuario: ${req.user._id}, Rol: ${req.user.role}`);

    // Buscar ticket
    const ticket = await Ticket.findById(id).populate([
      'createdBy',
      'assignedTo',
      'history.changedBy',
      'attachments.uploadedBy',
      'comments.author'
    ]);

    if (!ticket) {
      console.log(`[getTicket] Ticket no encontrado: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }

    console.log(`[getTicket] Ticket encontrado. createdBy: ${ticket.createdBy._id}, assignedTo: ${ticket.assignedTo?._id}`);

    // CONFIDENCIALIDAD - Verificar acceso
    const canReadOwn = canAccessTicket(ticket, req.user, 'read_own');
    const canReadAssigned = canAccessTicket(ticket, req.user, 'read_assigned');
    const isAdmin = req.user.role === 'administrador';
    const isSupervisor = req.user.role === 'supervisor';

    console.log(`[getTicket] Permisos - read_own: ${canReadOwn}, read_assigned: ${canReadAssigned}, admin: ${isAdmin}, supervisor: ${isSupervisor}`);

    if (!canReadOwn && !canReadAssigned && !isAdmin && !isSupervisor) {
      console.log(`[getTicket] Acceso denegado para usuario ${req.user._id}`);
      return res.status(403).json({
        success: false,
        message: 'No tiene acceso a este ticket'
      });
    }

    res.status(200).json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error('Error obteniendo ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo ticket'
    });
  }
};

/**
 * INTEGRIDAD - Actualizar ticket
 * PUT /api/tickets/:id
 */
const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, status, assignedTo } = req.body;

    // Buscar ticket
    const ticket = await Ticket.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }

    // CONFIDENCIALIDAD - Verificar acceso
    if (!canAccessTicket(ticket, req.user, 'update_assigned') &&
        req.user.role !== 'administrador' &&
        req.user.role !== 'supervisor') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para actualizar este ticket'
      });
    }

    const changes = {};

    // Actualizar campos
    if (title) {
      const oldTitle = ticket.title;
      ticket.title = sanitizeInput(title);
      if (oldTitle !== ticket.title) {
        changes.title = { old: oldTitle, new: ticket.title };
        ticket.addHistory('update', 'title', oldTitle, ticket.title, req.user._id, req.connection.remoteAddress);
      }
    }

    if (description) {
      const oldDesc = ticket.description;
      ticket.description = sanitizeInput(description);
      if (oldDesc !== ticket.description) {
        changes.description = { old: oldDesc, new: ticket.description };
        ticket.addHistory('update', 'description', oldDesc, ticket.description, req.user._id, req.connection.remoteAddress);
      }
    }

    if (priority && priority !== ticket.priority) {
      const oldPriority = ticket.priority;
      ticket.priority = priority;
      changes.priority = { old: oldPriority, new: priority };
      ticket.addHistory('update', 'priority', oldPriority, priority, req.user._id, req.connection.remoteAddress);

      // NO REPUDIO - Registrar cambio de prioridad
      await logPriorityChanged(req.user._id, ticket._id, oldPriority, priority, req);
    }

    if (status && status !== ticket.status) {
      const oldStatus = ticket.status;
      ticket.status = status;
      changes.status = { old: oldStatus, new: status };
      ticket.addHistory('update', 'status', oldStatus, status, req.user._id, req.connection.remoteAddress);

      if (status === 'resuelto') {
        ticket.resolvedAt = new Date();
      } else if (status === 'cerrado') {
        ticket.closedAt = new Date();
      }
    }

    if (assignedTo && assignedTo !== ticket.assignedTo?.toString()) {
      const oldAssigned = ticket.assignedTo;
      ticket.assignedTo = assignedTo;
      changes.assignedTo = { old: oldAssigned, new: assignedTo };
      ticket.addHistory('reassign', 'assignedTo', oldAssigned, assignedTo, req.user._id, req.connection.remoteAddress);
    }

    // Guardar cambios
    await ticket.save();

    // NO REPUDIO - Registrar actualización
    if (Object.keys(changes).length > 0) {
      await logTicketUpdated(req.user._id, ticket._id, changes, req);
    }

    // Populate referencias
    await ticket.populate(['createdBy', 'assignedTo']);

    res.status(200).json({
      success: true,
      message: 'Ticket actualizado',
      ticket
    });
  } catch (error) {
    console.error('Error actualizando ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando ticket'
    });
  }
};

/**
 * INTEGRIDAD - Escalar ticket (solo agente_n2)
 * POST /api/tickets/:id/escalate
 */
const escalateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Verificar que sea agente_n2 o superior
    if (!['agente_n2', 'supervisor', 'administrador'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Solo agentes N2 pueden escalar tickets'
      });
    }

    const ticket = await Ticket.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }

    if (ticket.status === 'escalado') {
      return res.status(400).json({
        success: false,
        message: 'El ticket ya está escalado'
      });
    }

    // Actualizar estado
    const oldStatus = ticket.status;
    ticket.status = 'escalado';
    ticket.addHistory('escalate', 'status', oldStatus, 'escalado', req.user._id, req.connection.remoteAddress);

    await ticket.save();

    // NO REPUDIO - Registrar escalamiento
    await logTicketEscalated(req.user._id, ticket._id, reason || 'Sin razón especificada', req);

    await ticket.populate(['createdBy', 'assignedTo']);

    res.status(200).json({
      success: true,
      message: 'Ticket escalado exitosamente',
      ticket
    });
  } catch (error) {
    console.error('Error escalando ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error escalando ticket'
    });
  }
};

/**
 * INTEGRIDAD - Agregar comentario a ticket
 * POST /api/tickets/:id/comments
 */
const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El comentario no puede estar vacío'
      });
    }

    const ticket = await Ticket.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }

    // CONFIDENCIALIDAD - Verificar acceso
    if (!canAccessTicket(ticket, req.user, 'add_comments') &&
        req.user.role !== 'administrador' &&
        req.user.role !== 'supervisor') {
      return res.status(403).json({
        success: false,
        message: 'No puede comentar en este ticket'
      });
    }

    // Agregar comentario
    ticket.comments.push({
      text: sanitizeInput(text),
      author: req.user._id,
      timestamp: new Date()
    });

    // INTEGRIDAD - Registrar en historial que se agregó un comentario
    ticket.addHistory('comment', 'comments', null, text.substring(0, 50), req.user._id, req.connection.remoteAddress);

    await ticket.save();

    // NO REPUDIO - Registrar en auditoría
    const { logAuditEvent } = require('../helpers/audit');
    await logAuditEvent(
      req.user._id,
      'ticket_commented',
      'ticket',
      ticket._id,
      { commentText: text.substring(0, 100) },
      req,
      true
    );

    // Populate y retornar
    await ticket.populate(['comments.author', 'history.changedBy']);

    res.status(200).json({
      success: true,
      message: 'Comentario agregado',
      comments: ticket.comments,
      history: ticket.history
    });
  } catch (error) {
    console.error('Error agregando comentario:', error);
    res.status(500).json({
      success: false,
      message: 'Error agregando comentario'
    });
  }
};

/**
 * INTEGRIDAD - Obtener historial de cambios
 * GET /api/tickets/:id/history
 */
const getHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await Ticket.findById(id).populate('history.changedBy');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }

    // CONFIDENCIALIDAD - Verificar acceso
    if (!canAccessTicket(ticket, req.user, 'read_assigned') &&
        !canAccessTicket(ticket, req.user, 'read_own') &&
        req.user.role !== 'administrador' &&
        req.user.role !== 'supervisor') {
      return res.status(403).json({
        success: false,
        message: 'No tiene acceso a este ticket'
      });
    }

    res.status(200).json({
      success: true,
      history: ticket.history
    });
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo historial'
    });
  }
};

module.exports = {
  createTicket,
  listTickets,
  getTicket,
  updateTicket,
  escalateTicket,
  addComment,
  getHistory
};
