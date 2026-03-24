/**
 * INTEGRIDAD — Controlador de Tickets
 * Monografía UCB: 6 estados, 4 prioridades, category_id FK, SLA, ticket_history
 */

const prisma = require('../config/database');
const { canAccessTicket, getTicketFilters } = require('../helpers/rbac');
const { logTicketCreated, logTicketUpdated, logAuditEvent } = require('../helpers/audit');

// SLA según monografía (horas → ms)
const SLA_HOURS = { CRITICA: 2, ALTA: 8, MEDIA: 24, BAJA: 72 };

function calcSLADeadline(priority) {
  const hours = SLA_HOURS[priority] || 24;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

// Incluye relaciones para respuesta completa
const ticketInclude = {
  creator: { select: { id: true, name: true, email: true, role: true } },
  assignee: { select: { id: true, name: true, email: true, role: true } },
  category: { select: { id: true, name: true, color: true } },
  comments: {
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { timestamp: 'asc' }
  },
  history: {
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { timestamp: 'asc' }
  },
  attachments: { include: { uploader: { select: { id: true, name: true } } } }
};

/**
 * POST /api/tickets
 */
const createTicket = async (req, res) => {
  try {
    const { title, description, category_id, priority = 'MEDIA' } = req.body;

    if (!title || !description || !category_id) {
      return res.status(400).json({ success: false, message: 'title, description y category_id son requeridos' });
    }

    const validPriorities = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ success: false, message: `priority debe ser uno de: ${validPriorities.join(', ')}` });
    }

    // Verificar categoría existe
    const category = await prisma.category.findUnique({ where: { id: parseInt(category_id) } });
    if (!category) {
      return res.status(400).json({ success: false, message: 'Categoría no válida' });
    }

    const sla_deadline = calcSLADeadline(priority);

    const ticket = await prisma.ticket.create({
      data: {
        user_id: req.user.id,
        category_id: parseInt(category_id),
        title: title.trim(),
        description: description.trim(),
        priority,
        status: 'NUEVO',
        sla_deadline
      },
      include: ticketInclude
    });

    // Registrar creación en ticket_history
    await prisma.ticketHistory.create({
      data: {
        ticket_id: ticket.id,
        user_id: req.user.id,
        field_changed: 'status',
        old_value: null,
        new_value: 'NUEVO'
      }
    });

    await logTicketCreated(req.user.id, ticket.id, ticket, req);

    res.status(201).json({ success: true, message: 'Ticket creado exitosamente', ticket });
  } catch (error) {
    console.error('Error creando ticket:', error);
    res.status(500).json({ success: false, message: 'Error creando ticket' });
  }
};

/**
 * GET /api/tickets
 */
const listTickets = async (req, res) => {
  try {
    const { status, priority, category_id, search, page = 1, limit = 10 } = req.query;

    const roleWhere = getTicketFilters(req.user);

    const where = { ...roleWhere };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category_id) where.category_id = parseInt(category_id);
    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          creator: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
          category: { select: { id: true, name: true, color: true } },
          _count: { select: { comments: true, attachments: true } }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.ticket.count({ where })
    ]);

    res.status(200).json({
      success: true,
      tickets,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error listando tickets:', error);
    res.status(500).json({ success: false, message: 'Error listando tickets' });
  }
};

/**
 * GET /api/tickets/:id
 */
const getTicket = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const ticket = await prisma.ticket.findUnique({ where: { id }, include: ticketInclude });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }

    if (!canAccessTicket(ticket, req.user, 'read_own') &&
        !canAccessTicket(ticket, req.user, 'read_assigned') &&
        req.user.role !== 'ADMINISTRADOR') {
      return res.status(403).json({ success: false, message: 'No tiene acceso a este ticket' });
    }

    res.status(200).json({ success: true, ticket });
  } catch (error) {
    console.error('Error obteniendo ticket:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo ticket' });
  }
};

/**
 * PATCH /api/tickets/:id — Actualización general (título, descripción, prioridad)
 */
const updateTicket = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description, priority } = req.body;

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }

    if (!canAccessTicket(ticket, req.user, 'update_assigned') && req.user.role !== 'ADMINISTRADOR') {
      return res.status(403).json({ success: false, message: 'No tiene permiso para actualizar este ticket' });
    }

    const updateData = {};
    const historyEntries = [];

    if (title && title !== ticket.title) {
      historyEntries.push({ ticket_id: id, user_id: req.user.id, field_changed: 'title', old_value: ticket.title, new_value: title.trim() });
      updateData.title = title.trim();
    }

    if (description && description !== ticket.description) {
      historyEntries.push({ ticket_id: id, user_id: req.user.id, field_changed: 'description', old_value: ticket.description.substring(0, 255), new_value: description.trim().substring(0, 255) });
      updateData.description = description.trim();
    }

    if (priority && priority !== ticket.priority) {
      historyEntries.push({ ticket_id: id, user_id: req.user.id, field_changed: 'priority', old_value: ticket.priority, new_value: priority });
      updateData.priority = priority;
      updateData.sla_deadline = calcSLADeadline(priority);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'No hay cambios que aplicar' });
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: ticketInclude
    });

    // Registrar historial
    if (historyEntries.length > 0) {
      await prisma.ticketHistory.createMany({ data: historyEntries });
    }

    await logTicketUpdated(req.user.id, id, updateData, req);

    res.status(200).json({ success: true, message: 'Ticket actualizado', ticket: updated });
  } catch (error) {
    console.error('Error actualizando ticket:', error);
    res.status(500).json({ success: false, message: 'Error actualizando ticket' });
  }
};

/**
 * PATCH /api/tickets/:id/assign — Asignar técnico (ADMINISTRADOR)
 */
const assignTicket = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { tech_id } = req.body;

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }

    const oldTechId = ticket.tech_id;
    let newStatus = ticket.status;

    // tech_id = null → desasignar
    if (tech_id === null || tech_id === undefined || tech_id === '') {
      const updated = await prisma.ticket.update({
        where: { id },
        data: { tech_id: null, status: ticket.status === 'ASIGNADO' ? 'NUEVO' : ticket.status },
        include: ticketInclude
      });
      await prisma.ticketHistory.create({
        data: { ticket_id: id, user_id: req.user.id, field_changed: 'tech_id', old_value: oldTechId ? String(oldTechId) : null, new_value: null }
      });
      await logAuditEvent(req.user.id, 'ticket_unassigned', 'ticket', id, {}, req, true);
      return res.status(200).json({ success: true, message: 'Asignacion removida', ticket: updated });
    }

    // Verificar que el técnico existe y tiene rol TECNICO
    const tech = await prisma.user.findUnique({ where: { id: parseInt(tech_id) } });
    if (!tech || tech.role !== 'TECNICO') {
      return res.status(400).json({ success: false, message: 'El usuario no es tecnico' });
    }

    newStatus = ticket.status === 'NUEVO' ? 'ASIGNADO' : ticket.status;

    const updated = await prisma.ticket.update({
      where: { id },
      data: { tech_id: parseInt(tech_id), status: newStatus },
      include: ticketInclude
    });

    // Historial
    await prisma.ticketHistory.createMany({
      data: [
        { ticket_id: id, user_id: req.user.id, field_changed: 'tech_id', old_value: oldTechId ? String(oldTechId) : null, new_value: String(tech_id) },
        ...(ticket.status !== newStatus ? [{ ticket_id: id, user_id: req.user.id, field_changed: 'status', old_value: ticket.status, new_value: newStatus }] : [])
      ]
    });

    await logAuditEvent(req.user.id, 'ticket_assigned', 'ticket', id, { tech_id }, req, true);

    res.status(200).json({ success: true, message: 'Ticket asignado', ticket: updated });
  } catch (error) {
    console.error('Error asignando ticket:', error);
    res.status(500).json({ success: false, message: 'Error asignando ticket' });
  }
};

/**
 * PATCH /api/tickets/:id/status — Cambiar estado
 * Workflow: NUEVO → ASIGNADO → EN_PROCESO → RESUELTO → CERRADO → REABIERTO
 */
const changeStatus = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    const validStatuses = ['NUEVO', 'ASIGNADO', 'EN_PROCESO', 'RESUELTO', 'CERRADO', 'REABIERTO'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `status debe ser uno de: ${validStatuses.join(', ')}` });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }

    // Técnico puede cambiar estados de sus tickets; admin puede todo
    if (req.user.role !== 'ADMINISTRADOR' && ticket.tech_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Solo el técnico asignado o un administrador puede cambiar el estado' });
    }

    const updateData = { status };
    if (status === 'RESUELTO') updateData.resolved_at = new Date();
    if (status === 'CERRADO') updateData.closed_at = new Date();

    const updated = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: ticketInclude
    });

    await prisma.ticketHistory.create({
      data: { ticket_id: id, user_id: req.user.id, field_changed: 'status', old_value: ticket.status, new_value: status }
    });

    await logAuditEvent(req.user.id, 'ticket_status_changed', 'ticket', id, { old: ticket.status, new: status }, req, true);

    res.status(200).json({ success: true, message: `Estado cambiado a ${status}`, ticket: updated });
  } catch (error) {
    console.error('Error cambiando estado:', error);
    res.status(500).json({ success: false, message: 'Error cambiando estado' });
  }
};

/**
 * POST /api/tickets/:id/comments
 */
const addComment = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ success: false, message: 'El comentario no puede estar vacío' });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }

    // Verificar acceso
    if (!canAccessTicket(ticket, req.user, 'add_comments') && req.user.role !== 'ADMINISTRADOR') {
      return res.status(403).json({ success: false, message: 'No puede comentar en este ticket' });
    }

    const comment = await prisma.comment.create({
      data: { ticket_id: id, user_id: req.user.id, content: content.trim() },
      include: { user: { select: { id: true, name: true, role: true } } }
    });

    await prisma.ticketHistory.create({
      data: { ticket_id: id, user_id: req.user.id, field_changed: 'comment', old_value: null, new_value: content.trim().substring(0, 255) }
    });

    await logAuditEvent(req.user.id, 'comment_added', 'ticket', id, { comment_id: comment.id }, req, true);

    res.status(201).json({ success: true, message: 'Comentario agregado', comment });
  } catch (error) {
    console.error('Error agregando comentario:', error);
    res.status(500).json({ success: false, message: 'Error agregando comentario' });
  }
};

/**
 * GET /api/tickets/:id/history
 */
const getHistory = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket no encontrado' });
    }

    if (!canAccessTicket(ticket, req.user, 'read_own') &&
        !canAccessTicket(ticket, req.user, 'read_assigned') &&
        req.user.role !== 'ADMINISTRADOR') {
      return res.status(403).json({ success: false, message: 'No tiene acceso a este ticket' });
    }

    const history = await prisma.ticketHistory.findMany({
      where: { ticket_id: id },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { timestamp: 'asc' }
    });

    res.status(200).json({ success: true, history });
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo historial' });
  }
};

module.exports = {
  createTicket,
  listTickets,
  getTicket,
  updateTicket,
  assignTicket,
  changeStatus,
  addComment,
  getHistory
};
