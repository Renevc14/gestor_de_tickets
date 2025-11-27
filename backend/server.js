/**
 * SISTEMA DE GESTIÓN DE TICKETS CON CRITERIOS DE SEGURIDAD AVANZADOS
 * Sistema completo con todos los criterios de seguridad implementados
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { connectDB, healthCheck } = require('./config/database');

// Importar rutas
const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const auditRoutes = require('./routes/audit');

// Inicializar aplicación
const app = express();

/**
 * CONFIDENCIALIDAD - Configurar Helmet para headers de seguridad
 */
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
  hsts: {
    maxAge: 31536000, // 1 año
    includeSubDomains: true,
    preload: true
  }
}));

/**
 * CONFIDENCIALIDAD - Configurar CORS
 */
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-MFA-Token']
}));

/**
 * DISPONIBILIDAD - Rate Limiting
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests
  message: 'Demasiadas solicitudes desde esta IP, intente más tarde',
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// Middleware para parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * DISPONIBILIDAD - Health check endpoint
 */
app.get('/health', async (req, res) => {
  try {
    const dbHealthy = await healthCheck();
    res.status(dbHealthy ? 200 : 503).json({
      success: dbHealthy,
      message: dbHealthy ? 'Sistema operativo' : 'Base de datos no disponible',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Error en health check'
    });
  }
});

/**
 * DEBUG - Endpoint para diagnosticar estado de BD
 */
app.get('/debug/db-status', async (req, res) => {
  try {
    const Ticket = require('./models/Ticket');
    const User = require('./models/User');

    const ticketCount = await Ticket.countDocuments();
    const userCount = await User.countDocuments();
    const tickets = await Ticket.find().limit(5).lean();
    const users = await User.find().limit(5).lean();

    res.json({
      success: true,
      stats: {
        totalTickets: ticketCount,
        totalUsers: userCount
      },
      lastTickets: tickets.map(t => ({
        _id: t._id,
        ticketNumber: t.ticketNumber,
        title: t.title,
        createdBy: t.createdBy
      })),
      lastUsers: users.map(u => ({
        _id: u._id,
        username: u.username,
        role: u.role
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Rutas API
 */
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/audit-logs', auditRoutes);

/**
 * Ruta raíz
 */
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Sistema de Gestión de Tickets',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      tickets: '/api/tickets',
      auditLogs: '/api/audit-logs',
      health: '/health'
    }
  });
});

/**
 * Manejo de rutas no encontradas
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

/**
 * Manejo global de errores
 */
app.use((err, req, res, next) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { error: err.stack })
  });
});

/**
 * Conectar a base de datos e iniciar servidor
 */
const startServer = async () => {
  try {
    // Conectar a MongoDB
    await connectDB();
    console.log('✓ Base de datos conectada');

    // Iniciar servidor
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`✓ Servidor ejecutándose en puerto ${PORT}`);
      console.log(`✓ Modo: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`✓ Endpoints disponibles:`);
      console.log(`  - POST /api/auth/register (Registro)`);
      console.log(`  - POST /api/auth/login (Login)`);
      console.log(`  - GET /api/tickets (Listar tickets)`);
      console.log(`  - GET /health (Health check)`);
    });
  } catch (error) {
    console.error('✗ Error iniciando servidor:', error.message);
    process.exit(1);
  }
};

// Iniciar servidor
startServer();

// Manejo de excepciones no capturadas
process.on('unhandledRejection', (error) => {
  console.error('✗ Unhandled Rejection:', error);
  process.exit(1);
});

module.exports = app;
