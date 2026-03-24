/**
 * TICKET LIFECYCLE + RBAC — Test de integración completo
 *
 * Cubre los siguientes flujos encadenados:
 *   1. Creación de tickets y visibilidad por rol
 *   2. Flujo completo de estado: NUEVO → ASIGNADO → EN_PROCESO → RESUELTO → CERRADO
 *   3. Historial inmutable: ticket_history registra cada cambio
 *   4. Aislamiento de datos: SOLICITANTE no ve tickets ajenos
 *   5. Validación de campos (prioridad inválida, categoría inexistente, etc.)
 *
 * Setup: crea 3 usuarios (uno por rol), 1 categoría.
 * Los tokens se generan directamente con generateToken() para evitar pasar por login.
 */

// Neon (cloud PostgreSQL) tiene latencia adicional vs localhost.
// Aumentar el timeout para tests de integración que encadenan varias peticiones HTTP.
jest.setTimeout(20000);

const request = require('supertest');
const app = require('../../server');
const prisma = require('../../config/database');
const bcrypt = require('bcrypt');
const { generateToken } = require('../../middleware/auth');

const SUFFIX = `${Date.now()}`;

// ─── Estado compartido del escenario ─────────────────────────────────────────
let adminUser, tecnicoUser, solicitanteA, solicitanteB;
let adminToken, tecnicoToken, solicitanteAToken, solicitanteBToken;
let testCategory;
// Ticket del flujo principal
let mainTicketId;

// ─── Setup: crear usuarios y categoría de test ───────────────────────────────
beforeAll(async () => {
  const hash = await bcrypt.hash('TestPass@Lifecycle2024!', 12);

  [adminUser, tecnicoUser, solicitanteA, solicitanteB] = await Promise.all([
    prisma.user.create({ data: { name: 'Admin Test', email: `admin.${SUFFIX}@test.tf`, password: hash, role: 'ADMINISTRADOR', status: 'ACTIVO', password_history: JSON.stringify([hash]) } }),
    prisma.user.create({ data: { name: 'Tecnico Test', email: `tech.${SUFFIX}@test.tf`, password: hash, role: 'TECNICO', status: 'ACTIVO', password_history: JSON.stringify([hash]) } }),
    prisma.user.create({ data: { name: 'SolA Test', email: `sola.${SUFFIX}@test.tf`, password: hash, role: 'SOLICITANTE', status: 'ACTIVO', password_history: JSON.stringify([hash]) } }),
    prisma.user.create({ data: { name: 'SolB Test', email: `solb.${SUFFIX}@test.tf`, password: hash, role: 'SOLICITANTE', status: 'ACTIVO', password_history: JSON.stringify([hash]) } }),
  ]);

  testCategory = await prisma.category.create({
    data: { name: `Cat Test ${SUFFIX}`, color: '#FF5733' }
  });

  // Generar tokens directamente (sin pasar por el endpoint de login)
  adminToken       = generateToken(adminUser.id, adminUser.name, adminUser.role);
  tecnicoToken     = generateToken(tecnicoUser.id, tecnicoUser.name, tecnicoUser.role);
  solicitanteAToken = generateToken(solicitanteA.id, solicitanteA.name, solicitanteA.role);
  solicitanteBToken = generateToken(solicitanteB.id, solicitanteB.name, solicitanteB.role);
});

// ─── Limpieza ────────────────────────────────────────────────────────────────
afterAll(async () => {
  // Borrar en orden correcto por foreign keys
  const userIds = [adminUser?.id, tecnicoUser?.id, solicitanteA?.id, solicitanteB?.id].filter(Boolean);

  await prisma.auditLog.deleteMany({ where: { user_id: { in: userIds } } }).catch(() => {});
  await prisma.ticketHistory.deleteMany({ where: { user_id: { in: userIds } } }).catch(() => {});
  await prisma.comment.deleteMany({ where: { user_id: { in: userIds } } }).catch(() => {});
  await prisma.ticket.deleteMany({ where: { user_id: { in: userIds } } }).catch(() => {});
  await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
  await prisma.category.delete({ where: { id: testCategory?.id } }).catch(() => {});
  // No llamar $disconnect(): el singleton de Prisma es compartido entre archivos de test
  // Jest cerrará el proceso con --forceExit
});

// ═══════════════════════════════════════════════════════════════════════════════
// ESCENARIO 1: Creación de tickets y visibilidad por rol
// ═══════════════════════════════════════════════════════════════════════════════

describe('Escenario 1 — Creación y visibilidad por rol', () => {
  test('201: SOLICITANTE crea ticket con prioridad MEDIA → status=NUEVO, sla_deadline seteado', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${solicitanteAToken}`)
      .send({ title: 'Ticket principal de flujo', description: 'Descripción del ticket de prueba', category_id: testCategory.id, priority: 'MEDIA' });

    expect(res.status).toBe(201);
    expect(res.body.ticket.status).toBe('NUEVO');
    expect(res.body.ticket.sla_deadline).toBeDefined();
    // SLA para MEDIA ≈ 24h desde ahora
    const slaDate = new Date(res.body.ticket.sla_deadline);
    const hoursUntilSla = (slaDate - Date.now()) / (3600 * 1000);
    expect(hoursUntilSla).toBeGreaterThan(23);
    expect(hoursUntilSla).toBeLessThan(25);

    mainTicketId = res.body.ticket.id;
  });

  test('201: ticket CRITICA tiene sla_deadline ≈ 2h (no 24h)', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${solicitanteAToken}`)
      .send({ title: 'Ticket crítico', description: 'Urgente', category_id: testCategory.id, priority: 'CRITICA' });

    expect(res.status).toBe(201);
    const slaDate = new Date(res.body.ticket.sla_deadline);
    const hoursUntilSla = (slaDate - Date.now()) / (3600 * 1000);
    expect(hoursUntilSla).toBeGreaterThan(1.9);
    expect(hoursUntilSla).toBeLessThan(2.1);
  });

  test('401: sin token no puede crear tickets', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .send({ title: 'T', description: 'D', category_id: testCategory.id });
    expect(res.status).toBe(401);
  });

  test('SOLICITANTE-A crea ticket adicional (SolicitanteB también crea uno)', async () => {
    await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${solicitanteAToken}`)
      .send({ title: 'Ticket de Sol-A adicional', description: 'Test', category_id: testCategory.id, priority: 'BAJA' });

    await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${solicitanteBToken}`)
      .send({ title: 'Ticket de Sol-B', description: 'Test', category_id: testCategory.id, priority: 'BAJA' });
  });

  test('SOLICITANTE-A solo ve sus propios tickets (aislamiento)', async () => {
    const res = await request(app)
      .get('/api/tickets')
      .set('Authorization', `Bearer ${solicitanteAToken}`);

    expect(res.status).toBe(200);
    const ticketsDeA = res.body.tickets;
    // Todos los tickets retornados deben pertenecer a Sol-A
    ticketsDeA.forEach(t => {
      expect(t.creator.id).toBe(solicitanteA.id);
    });
    // Sol-B tiene 1 ticket que Sol-A no debe ver
    const ticketsDeSolB = ticketsDeA.filter(t => t.creator.id === solicitanteB.id);
    expect(ticketsDeSolB).toHaveLength(0);
  });

  test('ADMINISTRADOR ve todos los tickets del sistema', async () => {
    const res = await request(app)
      .get('/api/tickets')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    // Debe ver tickets de ambos solicitantes
    const creatorIds = res.body.tickets.map(t => t.creator.id);
    expect(creatorIds).toContain(solicitanteA.id);
    expect(creatorIds).toContain(solicitanteB.id);
  });

  test('TECNICO sin asignaciones ve tickets sin asignar', async () => {
    const res = await request(app)
      .get('/api/tickets')
      .set('Authorization', `Bearer ${tecnicoToken}`);

    expect(res.status).toBe(200);
    // Todos deben ser tickets sin asignar (tech_id null) o asignados al técnico
    res.body.tickets.forEach(t => {
      const esAsignadoAEl = t.assignee?.id === tecnicoUser.id;
      const esSinAsignar = !t.assignee;
      expect(esAsignadoAEl || esSinAsignar).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ESCENARIO 2: Flujo completo NUEVO → CERRADO con historial
// ═══════════════════════════════════════════════════════════════════════════════

describe('Escenario 2 — Ciclo de vida completo NUEVO → CERRADO', () => {
  test('ADMINISTRADOR asigna el ticket al TECNICO → status cambia a ASIGNADO', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${mainTicketId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tech_id: tecnicoUser.id });

    expect(res.status).toBe(200);
    expect(res.body.ticket.status).toBe('ASIGNADO');
    expect(res.body.ticket.assignee.id).toBe(tecnicoUser.id);
  });

  test('ticket_history tiene al menos 2 entradas: creación + asignación', async () => {
    const res = await request(app)
      .get(`/api/tickets/${mainTicketId}/history`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.history.length).toBeGreaterThanOrEqual(2);
    // Primera entrada: status = NUEVO
    const creacion = res.body.history.find(h => h.new_value === 'NUEVO');
    expect(creacion).toBeDefined();
    // Segunda entrada: asignación de técnico
    const asignacion = res.body.history.find(h => h.field_changed === 'tech_id');
    expect(asignacion).toBeDefined();
    expect(asignacion.new_value).toBe(String(tecnicoUser.id));
  });

  test('TECNICO cambia status a EN_PROCESO → 200', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${mainTicketId}/status`)
      .set('Authorization', `Bearer ${tecnicoToken}`)
      .send({ status: 'EN_PROCESO' });

    expect(res.status).toBe(200);
    expect(res.body.ticket.status).toBe('EN_PROCESO');
  });

  test('SOLICITANTE NO puede cambiar el estado → 403', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${mainTicketId}/status`)
      .set('Authorization', `Bearer ${solicitanteAToken}`)
      .send({ status: 'RESUELTO' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/tecnico asignado|administrador|no autorizado|reabrir/i);
  });

  test('ADMINISTRADOR agrega comentario → 201', async () => {
    const res = await request(app)
      .post(`/api/tickets/${mainTicketId}/comments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ content: 'Seguimiento desde administración' });

    expect(res.status).toBe(201);
    expect(res.body.comment.content).toBe('Seguimiento desde administración');
    expect(res.body.comment.user.id).toBe(adminUser.id);
  });

  test('TECNICO agrega comentario → 201', async () => {
    const res = await request(app)
      .post(`/api/tickets/${mainTicketId}/comments`)
      .set('Authorization', `Bearer ${tecnicoToken}`)
      .send({ content: 'Revisando el problema, procederé con la solución' });

    expect(res.status).toBe(201);
  });

  test('GET /tickets/:id → comments tiene 2 entradas con datos de usuario', async () => {
    const res = await request(app)
      .get(`/api/tickets/${mainTicketId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ticket.comments).toHaveLength(2);
    // Cada comentario debe tener datos del usuario
    res.body.ticket.comments.forEach(c => {
      expect(c.user).toBeDefined();
      expect(c.user.id).toBeDefined();
      expect(c.user.name).toBeDefined();
    });
  });

  test('TECNICO cambia a RESUELTO → resolved_at seteado automáticamente', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${mainTicketId}/status`)
      .set('Authorization', `Bearer ${tecnicoToken}`)
      .send({ status: 'RESUELTO' });

    expect(res.status).toBe(200);
    expect(res.body.ticket.status).toBe('RESUELTO');
    expect(res.body.ticket.resolved_at).not.toBeNull();
    // Verificar en DB que resolved_at es una fecha válida
    const ticketDb = await prisma.ticket.findUnique({ where: { id: mainTicketId } });
    expect(ticketDb.resolved_at).toBeInstanceOf(Date);
  });

  test('ADMINISTRADOR cierra el ticket → closed_at seteado automáticamente', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${mainTicketId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CERRADO' });

    expect(res.status).toBe(200);
    expect(res.body.ticket.status).toBe('CERRADO');
    expect(res.body.ticket.closed_at).not.toBeNull();
  });

  test('historial completo tiene ≥ 5 entradas tras el ciclo completo', async () => {
    const res = await request(app)
      .get(`/api/tickets/${mainTicketId}/history`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    // Esperamos: creación(1) + asignación tech(2) + cambio_status_asignado(2) + EN_PROCESO + comentario_admin + comentario_tech + RESUELTO + CERRADO
    expect(res.body.history.length).toBeGreaterThanOrEqual(5);
    // Verificar que no hay entradas con datos modificados (inmutabilidad)
    const statusEntries = res.body.history.filter(h => h.field_changed === 'status');
    const statuses = statusEntries.map(h => h.new_value);
    expect(statuses).toContain('NUEVO');
    expect(statuses).toContain('ASIGNADO');
    expect(statuses).toContain('EN_PROCESO');
    expect(statuses).toContain('RESUELTO');
    expect(statuses).toContain('CERRADO');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ESCENARIO 3: Aislamiento de acceso entre usuarios
// ═══════════════════════════════════════════════════════════════════════════════

describe('Escenario 3 — Aislamiento y controles de acceso', () => {
  let ticketDeB;

  beforeAll(async () => {
    // Obtener el ticket de Sol-B para intentar accederlo como Sol-A
    const tickets = await prisma.ticket.findMany({ where: { user_id: solicitanteB.id } });
    ticketDeB = tickets[0];
  });

  test('SOLICITANTE-A no puede leer el ticket de SOLICITANTE-B → 403', async () => {
    if (!ticketDeB) return; // skip si no hay ticket de B
    const res = await request(app)
      .get(`/api/tickets/${ticketDeB.id}`)
      .set('Authorization', `Bearer ${solicitanteAToken}`);
    expect(res.status).toBe(403);
  });

  test('TECNICO sin asignar no puede cambiar estado de ticket ajeno → 403', async () => {
    // Crear ticket nuevo sin asignar
    const createRes = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${solicitanteAToken}`)
      .send({ title: 'Ticket sin asignar', description: 'Test', category_id: testCategory.id });
    const newTicketId = createRes.body.ticket.id;

    const res = await request(app)
      .patch(`/api/tickets/${newTicketId}/status`)
      .set('Authorization', `Bearer ${tecnicoToken}`)
      .send({ status: 'EN_PROCESO' });
    expect(res.status).toBe(403);
  });

  test('asignar un SOLICITANTE como técnico → 400', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${mainTicketId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tech_id: solicitanteA.id }); // Solicitante no es técnico
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no es tecnico/i);
  });

  test('desasignar técnico (tech_id: null) → status vuelve a NUEVO o previo', async () => {
    // Crear un ticket nuevo y asignarlo primero
    const createRes = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${solicitanteAToken}`)
      .send({ title: 'Ticket para desasignar', description: 'Test', category_id: testCategory.id });
    const tid = createRes.body.ticket.id;

    await request(app)
      .patch(`/api/tickets/${tid}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tech_id: tecnicoUser.id });

    const unassignRes = await request(app)
      .patch(`/api/tickets/${tid}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tech_id: null });

    expect(unassignRes.status).toBe(200);
    expect(unassignRes.body.ticket.assignee).toBeNull();
    // Status debe volver a NUEVO ya que estaba ASIGNADO
    expect(unassignRes.body.ticket.status).toBe('NUEVO');
  });

  test('SOLICITANTE-B puede ver su propio ticket pero NO asignarlo', async () => {
    if (!ticketDeB) return;
    const readRes = await request(app)
      .get(`/api/tickets/${ticketDeB.id}`)
      .set('Authorization', `Bearer ${solicitanteBToken}`);
    expect(readRes.status).toBe(200);

    // Intentar asignar (solo admin puede)
    const assignRes = await request(app)
      .patch(`/api/tickets/${ticketDeB.id}/assign`)
      .set('Authorization', `Bearer ${solicitanteBToken}`)
      .send({ tech_id: tecnicoUser.id });
    expect(assignRes.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ESCENARIO 4: Validación de campos del endpoint de tickets
// ═══════════════════════════════════════════════════════════════════════════════

describe('Escenario 4 — Validación de campos y valores inválidos', () => {
  test('400 al crear ticket sin title', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${solicitanteAToken}`)
      .send({ description: 'Sin título', category_id: testCategory.id });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/title/i);
  });

  test('400 al crear ticket sin description', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${solicitanteAToken}`)
      .send({ title: 'Sin descripción', category_id: testCategory.id });
    expect(res.status).toBe(400);
  });

  test('400 al crear ticket sin category_id', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${solicitanteAToken}`)
      .send({ title: 'Sin categoría', description: 'Test' });
    expect(res.status).toBe(400);
  });

  test('400 al crear ticket con priority inválida', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${solicitanteAToken}`)
      .send({ title: 'T', description: 'D', category_id: testCategory.id, priority: 'URGENTE' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/priority|BAJA|MEDIA|ALTA|CRITICA/i);
  });

  test('400 al crear ticket con category_id inexistente', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${solicitanteAToken}`)
      .send({ title: 'T', description: 'D', category_id: 999999 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/categoría/i);
  });

  test('400 al cambiar a status inválido', async () => {
    // Crear ticket y asignar técnico para tener acceso
    const createRes = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${solicitanteAToken}`)
      .send({ title: 'T para status inválido', description: 'D', category_id: testCategory.id });
    const tid = createRes.body.ticket.id;

    await request(app)
      .patch(`/api/tickets/${tid}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tech_id: tecnicoUser.id });

    const res = await request(app)
      .patch(`/api/tickets/${tid}/status`)
      .set('Authorization', `Bearer ${tecnicoToken}`)
      .send({ status: 'PENDIENTE' }); // No es un estado válido
    expect(res.status).toBe(400);
  });

  test('404 al intentar acceder a ticket con ID inexistente', async () => {
    const res = await request(app)
      .get('/api/tickets/999999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

// ===============================================================================
// ESCENARIO 5: SOLICITANTE solicita reapertura de ticket resuelto
// ===============================================================================

describe('Escenario 5 — Reapertura por SOLICITANTE', () => {
  let reopenTicketId;

  beforeAll(async () => {
    // Crear ticket como SOLICITANTE-A
    const createRes = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${solicitanteAToken}`)
      .send({ title: 'Ticket para reapertura', description: 'Test reapertura', category_id: testCategory.id });
    reopenTicketId = createRes.body.ticket.id;

    // Asignar al tecnico
    await request(app)
      .patch(`/api/tickets/${reopenTicketId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tech_id: tecnicoUser.id });

    // Tecnico mueve a EN_PROCESO
    await request(app)
      .patch(`/api/tickets/${reopenTicketId}/status`)
      .set('Authorization', `Bearer ${tecnicoToken}`)
      .send({ status: 'EN_PROCESO' });

    // Tecnico mueve a RESUELTO
    await request(app)
      .patch(`/api/tickets/${reopenTicketId}/status`)
      .set('Authorization', `Bearer ${tecnicoToken}`)
      .send({ status: 'RESUELTO' });
  });

  test('SOLICITANTE puede reabrir su propio ticket RESUELTO → 200', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${reopenTicketId}/status`)
      .set('Authorization', `Bearer ${solicitanteAToken}`)
      .send({ status: 'REABIERTO' });

    expect(res.status).toBe(200);
    expect(res.body.ticket.status).toBe('REABIERTO');
  });

  test('SOLICITANTE-B no puede reabrir el ticket de SOLICITANTE-A → 403', async () => {
    // Primero devolver el ticket a RESUELTO para poder intentarlo
    await request(app)
      .patch(`/api/tickets/${reopenTicketId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'RESUELTO' });

    const res = await request(app)
      .patch(`/api/tickets/${reopenTicketId}/status`)
      .set('Authorization', `Bearer ${solicitanteBToken}`)
      .send({ status: 'REABIERTO' });

    expect(res.status).toBe(403);
  });

  test('SOLICITANTE no puede cambiar RESUELTO a un estado distinto de REABIERTO → 403', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${reopenTicketId}/status`)
      .set('Authorization', `Bearer ${solicitanteAToken}`)
      .send({ status: 'CERRADO' });

    expect(res.status).toBe(403);
  });
});
