/**
 * SEED — TicketFlow
 * Datos iniciales: categorías del sistema + usuario administrador
 * Ejecutar: npx prisma db seed
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('[seed] Iniciando seed de base de datos...');

  // ─── Categorías iniciales (monografía: "lista predefinida") ─
  const categories = [
    { name: 'Software', color: '#3B82F6' },       // azul
    { name: 'Hardware', color: '#F59E0B' },        // ámbar
    { name: 'Accesos', color: '#10B981' },         // verde
    { name: 'Operaciones', color: '#8B5CF6' },     // violeta
    { name: 'Redes', color: '#EF4444' },           // rojo
    { name: 'Correo Electrónico', color: '#EC4899' }, // rosa
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: { color: cat.color },
      create: cat,
    });
  }
  console.log(`  OK ${categories.length} categorias creadas/verificadas`);

  // ─── Usuario administrador por defecto ───────────────────────
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@TicketFlow2025!';
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ticketflow.com' },
    update: {},
    create: {
      name: 'Administrador del Sistema',
      email: 'admin@ticketflow.com',
      password: hashedPassword,
      role: 'ADMINISTRADOR',
      status: 'ACTIVO',
    },
  });
  console.log(`  OK Admin creado: ${admin.email}`);

  // ─── Usuario técnico de demo ─────────────────────────────────
  const tecnicoPassword = process.env.TECNICO_PASSWORD || 'Tecnico@TicketFlow2025!';
  const hashedTecnico = await bcrypt.hash(tecnicoPassword, 12);

  await prisma.user.upsert({
    where: { email: 'tecnico@ticketflow.com' },
    update: {},
    create: {
      name: 'Técnico de Soporte',
      email: 'tecnico@ticketflow.com',
      password: hashedTecnico,
      role: 'TECNICO',
      status: 'ACTIVO',
    },
  });
  console.log('  OK Tecnico demo creado: tecnico@ticketflow.com');

  // ─── Usuario solicitante de demo ─────────────────────────────
  const solPass = await bcrypt.hash('Solicitante@2025!', 12);
  await prisma.user.upsert({
    where: { email: 'usuario@ticketflow.com' },
    update: {},
    create: {
      name: 'Usuario Solicitante',
      email: 'usuario@ticketflow.com',
      password: solPass,
      role: 'SOLICITANTE',
      status: 'ACTIVO',
    },
  });
  console.log('  OK Solicitante demo creado: usuario@ticketflow.com');

  console.log('\n[seed] Completado correctamente');
  console.log('─────────────────────────────────────────');
  console.log('  Credenciales por defecto:');
  console.log('  Admin       → admin@ticketflow.com  / Admin@TicketFlow2025!');
  console.log('  Técnico     → tecnico@ticketflow.com / Tecnico@TicketFlow2025!');
  console.log('  Solicitante → usuario@ticketflow.com / Solicitante@2025!');
  console.log('─────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('[seed] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
