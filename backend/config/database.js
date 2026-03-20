/**
 * DATABASE — Prisma Client singleton
 * Compatible con PostgreSQL local (desarrollo) y Railway (producción)
 * La variable DATABASE_URL se configura en .env para cada entorno
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

/**
 * Health check para Prisma/PostgreSQL
 */
const healthCheck = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Health check fallido:', error.message);
    return false;
  }
};

module.exports = prisma;
module.exports.healthCheck = healthCheck;
