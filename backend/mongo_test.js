const mongoose = require('mongoose');

async function test() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ticket_system');
    
    const Ticket = mongoose.model('Ticket', new mongoose.Schema(
      { ticketNumber: String, createdBy: mongoose.Schema.Types.ObjectId, title: String },
      { collection: 'tickets' }
    ));
    
    const User = mongoose.model('User', new mongoose.Schema(
      { username: String, email: String, role: String },
      { collection: 'users' }
    ));

    console.log('\n📊 ESTADO DE LA BASE DE DATOS\n');
    
    const userCount = await User.countDocuments();
    const ticketCount = await Ticket.countDocuments();
    
    console.log(`👥 Usuarios: ${userCount}`);
    console.log(`🎫 Tickets: ${ticketCount}`);
    
    if (userCount > 0) {
      console.log('\n📝 ÚLTIMOS USUARIOS:');
      const users = await User.find().limit(3);
      users.forEach(u => console.log(`  - ${u.username} (${u.role})`));
    }
    
    if (ticketCount > 0) {
      console.log('\n🎫 ÚLTIMOS TICKETS:');
      const tickets = await Ticket.find().limit(3);
      tickets.forEach(t => console.log(`  - ${t.ticketNumber}: ${t.title}`));
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

test();
