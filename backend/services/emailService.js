/**
 * DISPONIBILIDAD - Servicio de Notificaciones por Email
 * Envía notificaciones de tickets por correo electrónico
 */

const nodemailer = require('nodemailer');
const User = require('../models/User');

// Configurar transporte de email
let transporter = null;

function initializeEmailService() {
  // Soportar múltiples proveedores de email
  const emailProvider = process.env.EMAIL_PROVIDER || 'smtp';

  if (emailProvider === 'smtp') {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true', // true para 465, false para otros
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else if (emailProvider === 'sendgrid') {
    const sgTransport = require('nodemailer-sendgrid-transport');
    transporter = nodemailer.createTransport(
      sgTransport({
        auth: {
          api_key: process.env.SENDGRID_API_KEY
        }
      })
    );
  }

  return transporter;
}

/**
 * DISPONIBILIDAD - Verificar que el servicio de email está configurado
 */
function isEmailServiceConfigured() {
  if (!transporter) {
    transporter = initializeEmailService();
  }

  if (!process.env.SMTP_HOST && !process.env.SENDGRID_API_KEY) {
    return false;
  }

  return true;
}

/**
 * DISPONIBILIDAD - Enviar email de notificación
 */
async function sendEmail(to, subject, htmlContent) {
  try {
    if (!isEmailServiceConfigured()) {
      console.warn('Servicio de email no configurado. Email no enviado.');
      return { sent: false, reason: 'Email service not configured' };
    }

    const mailOptions = {
      from: process.env.SMTP_FROM_EMAIL || 'noreply@ticketsystem.com',
      to: to,
      subject: subject,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email enviado:', info.messageId);

    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error enviando email:', error);
    return { sent: false, error: error.message };
  }
}

/**
 * DISPONIBILIDAD - Template de email: Ticket Creado
 */
function getTicketCreatedEmailTemplate(ticketNumber, title, description, priority, user) {
  const priorityColors = {
    critica: '#d32f2f',
    alta: '#f57c00',
    media: '#fbc02d',
    baja: '#388e3c'
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .ticket-number { font-size: 24px; font-weight: 600; color: #000; }
        .content { margin: 20px 0; }
        .field { margin: 15px 0; }
        .label { font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase; }
        .value { font-size: 14px; color: #333; margin-top: 5px; }
        .priority-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 4px;
          color: white;
          font-weight: 600;
          font-size: 12px;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background: #2196F3;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          margin-top: 20px;
        }
        .footer { border-top: 1px solid #eee; padding-top: 20px; margin-top: 40px; font-size: 12px; color: #999; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="ticket-number">Nuevo Ticket: ${ticketNumber}</div>
        </div>

        <div class="content">
          <p>Hola ${user.username},</p>
          <p>Tu ticket ha sido creado exitosamente en el sistema de gestión.</p>

          <div class="field">
            <div class="label">Titulo</div>
            <div class="value">${title}</div>
          </div>

          <div class="field">
            <div class="label">Descripcion</div>
            <div class="value">${description}</div>
          </div>

          <div class="field">
            <div class="label">Prioridad</div>
            <div class="value">
              <span class="priority-badge" style="background-color: ${priorityColors[priority]}">
                ${priority.toUpperCase()}
              </span>
            </div>
          </div>

          <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Ver Ticket</a>
        </div>

        <div class="footer">
          <p>No respondas a este correo. Este es un mensaje automático del Sistema de Gestión de Tickets.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * DISPONIBILIDAD - Template de email: Ticket Resuelto
 */
function getTicketResolvedEmailTemplate(ticketNumber, title, user) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #c8e6c9; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
        .success-icon { font-size: 48px; margin-bottom: 10px; }
        .ticket-number { font-size: 24px; font-weight: 600; color: #2e7d32; }
        .content { margin: 20px 0; }
        .field { margin: 15px 0; }
        .label { font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase; }
        .value { font-size: 14px; color: #333; margin-top: 5px; }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background: #2196F3;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          margin-top: 20px;
        }
        .footer { border-top: 1px solid #eee; padding-top: 20px; margin-top: 40px; font-size: 12px; color: #999; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="success-icon">✓</div>
          <div class="ticket-number">Ticket Resuelto</div>
        </div>

        <div class="content">
          <p>Hola ${user.username},</p>
          <p>Tu ticket ha sido marcado como resuelto.</p>

          <div class="field">
            <div class="label">Numero de Ticket</div>
            <div class="value">${ticketNumber}</div>
          </div>

          <div class="field">
            <div class="label">Titulo</div>
            <div class="value">${title}</div>
          </div>

          <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Ver Detalles</a>
        </div>

        <div class="footer">
          <p>No respondas a este correo. Este es un mensaje automático del Sistema de Gestión de Tickets.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * DISPONIBILIDAD - Template de email: SLA próximo a vencer
 */
function getSLAWarningEmailTemplate(ticketNumber, title, hoursRemaining, assignedTo) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .warning-icon { font-size: 32px; }
        .title { font-size: 20px; font-weight: 600; color: #856404; margin-top: 10px; }
        .content { margin: 20px 0; }
        .field { margin: 15px 0; }
        .label { font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase; }
        .value { font-size: 14px; color: #333; margin-top: 5px; }
        .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background: #ff9800;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          margin-top: 20px;
        }
        .footer { border-top: 1px solid #eee; padding-top: 20px; margin-top: 40px; font-size: 12px; color: #999; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="warning-icon">⚠</div>
          <div class="title">Alerta de SLA</div>
        </div>

        <div class="content">
          <p>Hola ${assignedTo},</p>
          <p>Tu ticket está próximo a que venza el SLA.</p>

          <div class="field">
            <div class="label">Numero de Ticket</div>
            <div class="value">${ticketNumber}</div>
          </div>

          <div class="field">
            <div class="label">Titulo</div>
            <div class="value">${title}</div>
          </div>

          <div class="alert">
            Tiempo restante: ${hoursRemaining} horas
          </div>

          <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Tomar Acción</a>
        </div>

        <div class="footer">
          <p>No respondas a este correo. Este es un mensaje automático del Sistema de Gestión de Tickets.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * DISPONIBILIDAD - Enviar notificación: Ticket Creado
 */
async function notifyTicketCreated(ticketData, createdBy) {
  try {
    const user = await User.findById(createdBy);
    if (!user) return;

    const htmlContent = getTicketCreatedEmailTemplate(
      ticketData.ticketNumber,
      ticketData.title,
      ticketData.description,
      ticketData.priority,
      user
    );

    await sendEmail(
      user.email,
      `Ticket ${ticketData.ticketNumber}: ${ticketData.title}`,
      htmlContent
    );
  } catch (error) {
    console.error('Error notificando ticket creado:', error);
  }
}

/**
 * DISPONIBILIDAD - Enviar notificación: Ticket Resuelto
 */
async function notifyTicketResolved(ticketData, userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const htmlContent = getTicketResolvedEmailTemplate(
      ticketData.ticketNumber,
      ticketData.title,
      user
    );

    await sendEmail(
      user.email,
      `Ticket ${ticketData.ticketNumber} Resuelto`,
      htmlContent
    );
  } catch (error) {
    console.error('Error notificando ticket resuelto:', error);
  }
}

/**
 * DISPONIBILIDAD - Enviar notificación: SLA próximo a vencer
 */
async function notifySLAWarning(ticketData, assignedToId, hoursRemaining) {
  try {
    if (!assignedToId) return;

    const user = await User.findById(assignedToId);
    if (!user) return;

    const htmlContent = getSLAWarningEmailTemplate(
      ticketData.ticketNumber,
      ticketData.title,
      hoursRemaining,
      user.username
    );

    await sendEmail(
      user.email,
      `Alerta SLA: Ticket ${ticketData.ticketNumber}`,
      htmlContent
    );
  } catch (error) {
    console.error('Error notificando alerta SLA:', error);
  }
}

module.exports = {
  isEmailServiceConfigured,
  sendEmail,
  notifyTicketCreated,
  notifyTicketResolved,
  notifySLAWarning,
  initializeEmailService
};
