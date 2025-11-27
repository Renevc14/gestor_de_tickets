const mongoose = require('mongoose');
const User = require('./models/User');
const Ticket = require('./models/Ticket');

async function debug() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ticket_system');

    console.log('\n=== DIAGNÓSTICO DE ACCESO A TICKETS ===\n');

    // Obtener últimos usuarios
    const users = await User.find().limit(5).lean();
    console.log('📊 Usuarios en BD (últimos 5):');
    users.forEach(u => {
      console.log(`   - ${u.username} (${u.role}) - ID: ${u._id}`);
    });

    // Obtener últimos tickets
    const tickets = await Ticket.find().limit(5).lean();
    console.log('\n🎫 Tickets en BD (últimos 5):');
    tickets.forEach(t => {
      console.log(`   - ${t.ticketNumber}: ${t.title}`);
      console.log(`     Creado por: ${t.createdBy}`);
      console.log(`     Asignado a: ${t.assignedTo || 'Sin asignar'}`);
    });

    // Simular búsqueda
    if (tickets.length > 0 && users.length > 0) {
      const ticket = tickets[0];
      const user = users[0];

      console.log('\n🔍 SIMULANDO BÚSQUEDA:');
      console.log(`   Buscando ticket ID: ${ticket._id}`);
      console.log(`   Con usuario: ${user.username} (${user.role})`);

      const foundTicket = await Ticket.findById(ticket._id);
      if (foundTicket) {
        console.log('   ✅ Ticket encontrado');
        const createdByStr = foundTicket.createdBy.toString();
        const userIdStr = user._id.toString();
        console.log(`   createdBy: ${createdByStr}`);
        console.log(`   userId: ${userIdStr}`);
        console.log(`   ¿Coinciden? ${createdByStr === userIdStr}`);
      } else {
        console.log('   ❌ Ticket NO encontrado');
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

debug();
