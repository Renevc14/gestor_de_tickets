/**
 * DISPONIBILIDAD - Servicio de SLA Automático
 * Escalamiento automático y notificaciones cuando vence SLA
 * Se ejecuta cada 5 minutos mediante cron
 */

const cron = require('node-cron');
const Ticket = require('../models/Ticket');
const { logAuditEvent } = require('../helpers/audit');
const { notifySLAWarning } = require('./emailService');

let cronJob = null;

/**
 * DISPONIBILIDAD - Iniciar monitoreo de SLA
 * Se ejecuta al iniciar la aplicación
 */
function initializeSLAMonitoring() {
  console.log('Inicializando monitoreo de SLA...');

  // Ejecutar cada 5 minutos
  cronJob = cron.schedule('*/5 * * * *', async () => {
    try {
      await checkSLADeadlines();
    } catch (error) {
      console.error('Error en job de SLA:', error);
    }
  });

  console.log('Monitoreo de SLA iniciado (cada 5 minutos)');

  // Ejecutar una vez al iniciar para evitar esperar 5 minutos
  checkSLADeadlines().catch(error => console.error('Error inicial en SLA:', error));
}

/**
 * DISPONIBILIDAD - Detener monitoreo de SLA
 */
function stopSLAMonitoring() {
  if (cronJob) {
    cronJob.stop();
    console.log('Monitoreo de SLA detenido');
  }
}

/**
 * DISPONIBILIDAD - Verificar y escalar tickets cuyo SLA ha vencido
 */
async function checkSLADeadlines() {
  try {
    const now = new Date();

    // Encontrar tickets abiertos o en progreso cuyo SLA vencióhace menos de 1 hora
    const expiredSLATickets = await Ticket.find({
      status: { $in: ['abierto', 'en_progreso'] },
      slaDeadline: { $lt: now }
    }).populate('assignedTo', 'email username');

    for (const ticket of expiredSLATickets) {
      // Verificar si ya fue escalado (buscar en el historial)
      const alreadyEscalated = ticket.history?.some(h =>
        h.fieldName === 'escalated' && h.newValue === true
      );

      if (!alreadyEscalated) {
        // Escalar el ticket automáticamente
        await escalateTicketBySLA(ticket);
      }
    }

    // Encontrar tickets cuyo SLA vence en las próximas 2 horas
    const warningTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const upcomingSLATickets = await Ticket.find({
      status: { $in: ['abierto', 'en_progreso'] },
      slaDeadline: { $gte: now, $lte: warningTime },
      slaWarningNotified: { $ne: true }
    }).populate('assignedTo', 'email username');

    for (const ticket of upcomingSLATickets) {
      // Enviar notificación de advertencia
      await notifySLAWarning(ticket, ticket.assignedTo?._id, 2);

      // Marcar que se envió la notificación
      ticket.slaWarningNotified = true;
      await ticket.save();

      // Loguear en auditoría
      await logAuditEvent({
        user: null,
        action: 'sla_warning_sent',
        resource: 'ticket',
        resourceId: ticket._id,
        details: {
          ticketNumber: ticket.ticketNumber,
          assignedTo: ticket.assignedTo?.username
        },
        ipAddress: 'system',
        userAgent: 'SLA Monitor',
        success: true
      });
    }

  } catch (error) {
    console.error('Error verificando SLA:', error);
  }
}

/**
 * DISPONIBILIDAD - Escalar ticket automáticamente
 */
async function escalateTicketBySLA(ticket) {
  try {
    // Cambiar prioridad si es posible
    let newPriority = ticket.priority;
    if (ticket.priority === 'baja') {
      newPriority = 'media';
    } else if (ticket.priority === 'media') {
      newPriority = 'alta';
    } else if (ticket.priority === 'alta') {
      newPriority = 'critica';
    }

    // Registrar cambio en historial
    const changeEntry = {
      changeType: 'escalate',
      fieldName: 'priority',
      oldValue: ticket.priority,
      newValue: newPriority,
      changedBy: null,
      ipAddress: 'system',
      timestamp: new Date(),
      reason: 'SLA vencido'
    };

    if (!ticket.history) {
      ticket.history = [];
    }

    ticket.history.push(changeEntry);
    ticket.priority = newPriority;
    ticket.escalatedBySLA = true;
    ticket.escalationTime = new Date();

    await ticket.save();

    // Loguear en auditoría
    await logAuditEvent({
      user: null,
      action: 'ticket_escalated_sla',
      resource: 'ticket',
      resourceId: ticket._id,
      details: {
        ticketNumber: ticket.ticketNumber,
        oldPriority: changeEntry.oldValue,
        newPriority: newPriority,
        reason: 'SLA vencido'
      },
      ipAddress: 'system',
      userAgent: 'SLA Monitor',
      success: true
    });

    console.log(`Ticket ${ticket.ticketNumber} escalado automáticamente por SLA vencido`);

  } catch (error) {
    console.error(`Error escalando ticket ${ticket.ticketNumber}:`, error);
  }
}

/**
 * DISPONIBILIDAD - Calcular SLA deadline basado en prioridad y categoría
 * Retorna un objeto Date con el deadline
 */
function calculateSLADeadline(priority, category = null) {
  const now = new Date();

  // Mapeo de SLA por prioridad (en horas)
  const slaHours = {
    critica: 1,      // 1 hora
    alta: 4,         // 4 horas
    media: 8,        // 8 horas
    baja: 24         // 1 día
  };

  // Ajustar SLA según categoría si es necesario
  let hours = slaHours[priority] || 8;

  // Incidentes críticos: reducir 30% del tiempo
  if (category === 'incidente' && priority === 'critica') {
    hours = Math.ceil(hours * 0.7);
  }

  const deadline = new Date(now.getTime() + hours * 60 * 60 * 1000);
  return deadline;
}

/**
 * DISPONIBILIDAD - Obtener tiempo restante hasta SLA
 */
function getTimeRemaining(slaDeadline) {
  const now = new Date();
  const remaining = slaDeadline - now;

  if (remaining < 0) {
    return { expired: true, text: 'SLA vencido' };
  }

  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

  return {
    expired: false,
    remaining: remaining,
    hours: hours,
    minutes: minutes,
    text: `${hours}h ${minutes}m`
  };
}

module.exports = {
  initializeSLAMonitoring,
  stopSLAMonitoring,
  checkSLADeadlines,
  calculateSLADeadline,
  getTimeRemaining
};
