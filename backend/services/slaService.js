/**
 * DISPONIBILIDAD — Servicio de Monitoreo SLA
 * Ejecuta cron job cada 5 minutos para detectar tickets con SLA vencido
 * Monografía: CRITICA=2h, ALTA=8h, MEDIA=24h, BAJA=72h
 */

const cron = require('node-cron');
const prisma = require('../config/database');
const { logAuditEvent } = require('../helpers/audit');

let cronJob = null;

// SLA según monografía (horas)
const SLA_HOURS = { CRITICA: 2, ALTA: 8, MEDIA: 24, BAJA: 72 };

/**
 * Calcular SLA deadline según prioridad
 */
function calculateSLADeadline(priority) {
  const hours = SLA_HOURS[priority] || 24;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

/**
 * Obtener tiempo restante hasta SLA vencimiento
 */
function getTimeRemaining(slaDeadline) {
  const remaining = new Date(slaDeadline) - Date.now();
  if (remaining < 0) return { expired: true, text: 'SLA vencido' };
  const hours = Math.floor(remaining / (3600 * 1000));
  const minutes = Math.floor((remaining % (3600 * 1000)) / (60 * 1000));
  return { expired: false, hours, minutes, text: `${hours}h ${minutes}m` };
}

/**
 * Verificar tickets con SLA vencido y registrar en auditoría
 */
async function checkSLADeadlines() {
  try {
    const now = new Date();

    // Tickets con SLA vencido no resueltos
    const expired = await prisma.ticket.findMany({
      where: {
        sla_deadline: { lt: now },
        status: { notIn: ['RESUELTO', 'CERRADO'] }
      },
      select: {
        id: true, title: true, priority: true, status: true, sla_deadline: true,
        assignee: { select: { id: true, name: true, email: true } }
      }
    });

    for (const ticket of expired) {
      // Verificar si ya se registró el breach en audit_logs
      const existing = await prisma.auditLog.findFirst({
        where: {
          resource_id: String(ticket.id),
          action: 'sla_breached'
        }
      });

      if (!existing) {
        await logAuditEvent(
          null,
          'sla_breached',
          'ticket',
          ticket.id,
          {
            title: ticket.title,
            priority: ticket.priority,
            status: ticket.status,
            sla_deadline: ticket.sla_deadline,
            assignee: ticket.assignee?.name
          },
          { headers: {}, connection: {} }, // req mock para cron
          false,
          'SLA vencido'
        );

        console.log(`[SLA] Vencido — Ticket #${ticket.id}: ${ticket.title} [${ticket.priority}]`);
      }
    }

    // Tickets con SLA próximo a vencer (próximas 2 horas)
    const warningTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const upcoming = await prisma.ticket.findMany({
      where: {
        sla_deadline: { gte: now, lte: warningTime },
        status: { notIn: ['RESUELTO', 'CERRADO'] }
      },
      select: {
        id: true, title: true, priority: true, sla_deadline: true,
        assignee: { select: { name: true, email: true } }
      }
    });

    if (upcoming.length > 0) {
      console.log(`[SLA] ${upcoming.length} ticket(s) con SLA proximo a vencer`);
    }

  } catch (error) {
    console.error('Error verificando SLA:', error.message);
  }
}

/**
 * Iniciar monitoreo (cron job cada 5 minutos)
 */
function initializeSLAMonitoring() {
  console.log('[SLA] Iniciando monitoreo (cada 5 min)...');

  cronJob = cron.schedule('*/5 * * * *', async () => {
    try {
      await checkSLADeadlines();
    } catch (error) {
      console.error('Error en cron de SLA:', error);
    }
  });

  // Ejecutar inmediatamente al iniciar
  checkSLADeadlines().catch(err => console.error('Error inicial SLA:', err));
}

/**
 * Detener monitoreo
 */
function stopSLAMonitoring() {
  if (cronJob) {
    cronJob.stop();
    console.log('Monitoreo de SLA detenido');
  }
}

module.exports = {
  initializeSLAMonitoring,
  stopSLAMonitoring,
  checkSLADeadlines,
  calculateSLADeadline,
  getTimeRemaining
};
