/**
 * Script de prueba para diagnosticar problema con tickets
 * Simula: registro -> login -> crear ticket -> listar tickets -> obtener ticket
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';
const api = axios.create({
  baseURL: API_BASE_URL,
  validateStatus: () => true // No lanzar error en status >= 400
});

let token = null;
let user = null;
let ticketId = null;

async function test() {
  try {
    console.log('🚀 INICIANDO PRUEBAS...\n');

    // 1. REGISTRO
    console.log('1️⃣ REGISTRO');
    const registerRes = await api.post('/auth/register', {
      username: `cliente_${Date.now()}`,
      email: `cliente_${Date.now()}@test.com`,
      password: 'Test@1234567',
      confirmPassword: 'Test@1234567'
    });
    console.log(`Status: ${registerRes.status}`);
    console.log(`Response:`, JSON.stringify(registerRes.data, null, 2));
    console.log();

    if (registerRes.status !== 201) {
      throw new Error(`Registro falló: ${registerRes.status}`);
    }

    user = registerRes.data.user;
    console.log(`✅ Usuario creado: ${user.username} (ID: ${user._id})\n`);

    // 2. LOGIN
    console.log('2️⃣ LOGIN');
    const loginRes = await api.post('/auth/login', {
      username: user.username,
      password: 'Test@1234567'
    });
    console.log(`Status: ${loginRes.status}`);
    console.log(`Response:`, JSON.stringify(loginRes.data, null, 2));
    console.log();

    if (loginRes.status !== 200) {
      throw new Error(`Login falló: ${loginRes.status}`);
    }

    token = loginRes.data.token;
    console.log(`✅ Login exitoso. Token: ${token.substring(0, 20)}...\n`);

    // 3. CREAR TICKET
    console.log('3️⃣ CREAR TICKET');
    const createRes = await api.post(
      '/tickets',
      {
        title: `Test Ticket ${Date.now()}`,
        description: 'Esta es una descripción de prueba',
        category: 'soporte_funcional',
        priority: 'media',
        confidentiality: 'interno'
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    console.log(`Status: ${createRes.status}`);
    console.log(`Response:`, JSON.stringify(createRes.data, null, 2));
    console.log();

    if (createRes.status !== 201) {
      throw new Error(`Crear ticket falló: ${createRes.status}`);
    }

    const createdTicket = createRes.data.ticket;
    ticketId = createdTicket._id;
    console.log(`✅ Ticket creado:\n   ID: ${ticketId}\n   Número: ${createdTicket.ticketNumber}\n`);

    // 4. LISTAR TICKETS
    console.log('4️⃣ LISTAR TICKETS');
    const listRes = await api.get('/tickets', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log(`Status: ${listRes.status}`);
    console.log(`Response:`, JSON.stringify(listRes.data, null, 2));
    console.log();

    if (listRes.status !== 200) {
      throw new Error(`Listar tickets falló: ${listRes.status}`);
    }

    const tickets = listRes.data.tickets;
    console.log(`✅ Tickets encontrados: ${tickets.length}`);
    if (tickets.length > 0) {
      console.log(`   Primer ticket: ${tickets[0]._id}`);
    }
    console.log();

    // 5. OBTENER TICKET ESPECÍFICO
    console.log('5️⃣ OBTENER TICKET ESPECÍFICO');
    console.log(`   Buscando ticket ID: ${ticketId}`);
    const getRes = await api.get(`/tickets/${ticketId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log(`Status: ${getRes.status}`);
    console.log(`Response:`, JSON.stringify(getRes.data, null, 2));
    console.log();

    if (getRes.status !== 200) {
      console.error('❌ FALLO: No se pudo obtener el ticket');
      console.log(`   Status: ${getRes.status}`);
      console.log(`   Mensaje: ${getRes.data.message}`);
    } else {
      console.log('✅ Ticket obtenido exitosamente');
      const ticket = getRes.data.ticket;
      console.log(`   Título: ${ticket.title}`);
      console.log(`   Descripción: ${ticket.description}`);
      console.log(`   createdBy: ${ticket.createdBy._id}`);
      console.log(`   usuarioActual: ${user._id}`);
      console.log(`   ¿Coinciden? ${ticket.createdBy._id === user._id}`);
    }

    console.log('\n✅ TODAS LAS PRUEBAS COMPLETADAS');
    process.exit(0);
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
}

test();
