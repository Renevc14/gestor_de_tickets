/**
 * TicketFlow — Backend Server
 * Monografía UCB: Express + Prisma + PostgreSQL
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const prisma = require('./config/database');
const { healthCheck } = require('./config/database');

// ─── Rutas ───────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const auditRoutes = require('./routes/audit');
const userRoutes = require('./routes/users');
const categoryRoutes = require('./routes/categories');
const reportRoutes = require('./routes/reports');

// ─── SLA Monitor ──────────────────────────────────────────────────────────────
const { initializeSLAMonitoring } = require('./services/slaService');

const app = express();

// ─── Trust proxy (Railway / reverse proxies) ──────────────────────────────────
app.set('trust proxy', 1);

// ─── Seguridad: Helmet ────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'data:']
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Demasiadas solicitudes desde esta IP' },
  standardHeaders: true,
  legacyHeaders: false
}));

// ─── Body Parser ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    const dbHealthy = await healthCheck();
    res.status(dbHealthy ? 200 : 503).json({
      success: dbHealthy,
      message: dbHealthy ? 'Sistema operativo' : 'Base de datos no disponible',
      timestamp: new Date()
    });
  } catch {
    res.status(503).json({ success: false, message: 'Error en health check' });
  }
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reports', reportRoutes);

// ─── Ruta raíz ────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'TicketFlow API — Sistema de Gestión de Tickets',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      tickets: '/api/tickets',
      users: '/api/users',
      categories: '/api/categories',
      reports: '/api/reports',
      auditLogs: '/api/audit-logs',
      health: '/health'
    }
  });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    // Verificar conexión a PostgreSQL
    await prisma.$connect();
    console.log('✓ PostgreSQL conectado (Prisma)');

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`✓ Servidor en puerto ${PORT} [${process.env.NODE_ENV || 'development'}]`);
      console.log(`✓ Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log('─────────────────────────────────────────');
      console.log('  Endpoints principales:');
      console.log('  POST  /api/auth/login');
      console.log('  POST  /api/tickets');
      console.log('  GET   /api/tickets');
      console.log('  GET   /api/reports/dashboard');
      console.log('  GET   /health');
      console.log('─────────────────────────────────────────');
    });

    // Iniciar monitoreo SLA
    initializeSLAMonitoring();

  } catch (error) {
    console.error('✗ Error iniciando servidor:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

process.on('unhandledRejection', (error) => {
  console.error('✗ Unhandled Rejection:', error);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = app;
