/**
 * DISPONIBILIDAD - Configuración de conexión a MongoDB
 * Implementa reconexión automática y manejo de errores
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ticket_system';

    const connection = await mongoose.connect(mongoUri, {
      // DISPONIBILIDAD - Reconexión automática
      retryWrites: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    console.log('✓ MongoDB conectado exitosamente');
    return connection;
  } catch (error) {
    console.error('✗ Error conectando a MongoDB:', error.message);
    process.exit(1);
  }
};

/**
 * DISPONIBILIDAD - Health check para MongoDB
 */
const healthCheck = async () => {
  try {
    const adminDb = mongoose.connection.db.admin();
    const status = await adminDb.ping();
    return status.ok === 1;
  } catch (error) {
    console.error('Health check fallido:', error.message);
    return false;
  }
};

module.exports = {
  connectDB,
  healthCheck
};
