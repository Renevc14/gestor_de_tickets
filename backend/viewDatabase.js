/**
 * Script para visualizar la estructura y contenido de la base de datos
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Importar modelos
const User = require('./models/User');
const Ticket = require('./models/Ticket');
const AuditLog = require('./models/AuditLog');

async function viewDatabase() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('\n✓ Conectado a MongoDB\n');

    // === USUARIOS ===
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║              COLECCIÓN: USERS (USUARIOS)               ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    const usersCount = await User.countDocuments();
    console.log(`Total de usuarios: ${usersCount}\n`);

    if (usersCount > 0) {
      const users = await User.find({}).select('-password -passwordHistory -mfaSecret');
      console.log('Usuarios registrados:');
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. Username: ${user.username}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Rol: ${user.role}`);
        console.log(`   MFA Habilitado: ${user.mfaEnabled}`);
        console.log(`   Activo: ${user.isActive}`);
        console.log(`   Último Login: ${user.lastLogin || 'Nunca'}`);
        console.log(`   Creado: ${user.createdAt}`);
      });
    } else {
      console.log('No hay usuarios registrados aún.\n');
    }

    // === TICKETS ===
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              COLECCIÓN: TICKETS                        ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    const ticketsCount = await Ticket.countDocuments();
    console.log(`Total de tickets: ${ticketsCount}\n`);

    if (ticketsCount > 0) {
      const tickets = await Ticket.find({}).populate('createdBy', 'username email role').populate('assignedTo', 'username email role');
      console.log('Tickets registrados:');
      tickets.forEach((ticket, index) => {
        console.log(`\n${index + 1}. Ticket #${ticket.ticketNumber}`);
        console.log(`   Título: ${ticket.title}`);
        console.log(`   Descripción: ${ticket.description.substring(0, 50)}...`);
        console.log(`   Categoría: ${ticket.category}`);
        console.log(`   Prioridad: ${ticket.priority}`);
        console.log(`   Estado: ${ticket.status}`);
        console.log(`   Creado por: ${ticket.createdBy?.username || 'Desconocido'}`);
        console.log(`   Asignado a: ${ticket.assignedTo?.username || 'No asignado'}`);
        console.log(`   Fecha de creación: ${ticket.createdAt}`);
        console.log(`   Cambios registrados: ${ticket.history.length}`);
      });
    } else {
      console.log('No hay tickets registrados aún.\n');
    }

    // === AUDIT LOGS ===
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              COLECCIÓN: AUDITLOGS                      ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    const auditCount = await AuditLog.countDocuments();
    console.log(`Total de eventos auditados: ${auditCount}\n`);

    if (auditCount > 0) {
      const auditLogs = await AuditLog.find({}).populate('user', 'username email role').sort({ timestamp: -1 }).limit(10);
      console.log('Últimos 10 eventos auditados:\n');
      auditLogs.forEach((log, index) => {
        console.log(`${index + 1}. [${log.action.toUpperCase()}]`);
        console.log(`   Usuario: ${log.user?.username || 'Sistema'}`);
        console.log(`   Recurso: ${log.resource} (ID: ${log.resourceId})`);
        console.log(`   IP: ${log.ipAddress || 'N/A'}`);
        console.log(`   Detalles: ${JSON.stringify(log.details).substring(0, 80)}...`);
        console.log(`   Timestamp: ${log.timestamp}\n`);
      });
    } else {
      console.log('No hay eventos auditados aún.\n');
    }

    // === ESTADÍSTICAS ===
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                  ESTADÍSTICAS GENERALES                ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const ticketsByStatus = await Ticket.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const ticketsByPriority = await Ticket.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    const eventsByAction = await AuditLog.aggregate([
      { $group: { _id: '$action', count: { $sum: 1 } } }
    ]);

    console.log('Usuarios por rol:');
    usersByRole.forEach(item => {
      console.log(`  • ${item._id}: ${item.count}`);
    });

    console.log('\nTickets por estado:');
    ticketsByStatus.forEach(item => {
      console.log(`  • ${item._id}: ${item.count}`);
    });

    console.log('\nTickets por prioridad:');
    ticketsByPriority.forEach(item => {
      console.log(`  • ${item._id}: ${item.count}`);
    });

    console.log('\nEventos auditados por tipo:');
    eventsByAction.forEach(item => {
      console.log(`  • ${item._id}: ${item.count}`);
    });

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              FIN DEL REPORTE DE BASE DE DATOS           ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

viewDatabase();
