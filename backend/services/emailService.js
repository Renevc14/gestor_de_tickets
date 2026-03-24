/**
 * Servicio de notificaciones por correo electronico
 * Monografia UCB: notificaciones al asignar ticket y al cambiar estado
 *
 * En modo test (NODE_ENV=test) retorna silenciosamente sin enviar.
 * Requiere variables de entorno: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */

const nodemailer = require('nodemailer');

// ─── Transporter ──────────────────────────────────────────────────────────────

function createTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

async function sendMail(options) {
  if (process.env.NODE_ENV === 'test') return;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;

  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    ...options
  });
}

// ─── Templates ────────────────────────────────────────────────────────────────

/**
 * Notifica al tecnico cuando se le asigna un ticket
 * @param {object} tech   - { name, email }
 * @param {object} ticket - { id, title, priority, category }
 */
async function sendTicketAssigned(tech, ticket) {
  await sendMail({
    to:      tech.email,
    subject: `[TicketFlow] Ticket #${ticket.id} asignado a ti`,
    text: [
      `Hola ${tech.name},`,
      '',
      `Se te ha asignado el ticket #${ticket.id}: "${ticket.title}"`,
      `Prioridad: ${ticket.priority}`,
      `Categoria: ${ticket.category?.name || '-'}`,
      '',
      'Por favor, revisa el sistema para mas detalles.',
      '',
      'TicketFlow'
    ].join('\n')
  });
}

/**
 * Notifica al creador del ticket cuando cambia su estado
 * @param {object} user      - { name, email }
 * @param {object} ticket    - { id, title }
 * @param {string} oldStatus
 * @param {string} newStatus
 */
async function sendStatusChanged(user, ticket, oldStatus, newStatus) {
  await sendMail({
    to:      user.email,
    subject: `[TicketFlow] Ticket #${ticket.id} cambio de estado: ${oldStatus} -> ${newStatus}`,
    text: [
      `Hola ${user.name},`,
      '',
      `El estado de tu ticket #${ticket.id}: "${ticket.title}"`,
      `cambio de ${oldStatus} a ${newStatus}.`,
      '',
      'Ingresa al sistema para ver los detalles.',
      '',
      'TicketFlow'
    ].join('\n')
  });
}

/**
 * Notifica a los administradores cuando un ticket es reabierto
 * @param {object} admin  - { name, email }
 * @param {object} ticket - { id, title }
 */
async function sendTicketReopened(admin, ticket) {
  await sendMail({
    to:      admin.email,
    subject: `[TicketFlow] Ticket #${ticket.id} fue reabierto`,
    text: [
      `Hola ${admin.name},`,
      '',
      `El ticket #${ticket.id}: "${ticket.title}" fue reabierto por el solicitante.`,
      '',
      'Revisa el sistema para reasignarlo.',
      '',
      'TicketFlow'
    ].join('\n')
  });
}

module.exports = { sendTicketAssigned, sendStatusChanged, sendTicketReopened };
