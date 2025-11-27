/**
 * SEGURIDAD - Configuración centralizada de criterios de seguridad
 * Define algoritmos, políticas y parámetros de seguridad globales
 */

const crypto = require('crypto');

const securityConfig = {
  // CONFIDENCIALIDAD - Cifrado AES-256-GCM
  encryption: {
    algorithm: 'aes-256-gcm',
    key: process.env.ENCRYPTION_KEY || crypto.randomBytes(32),
    saltRounds: 12
  },

  // AUTENTICACIÓN - Políticas JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    expiration: '30m', // 30 minutos de inactividad
    refreshExpiration: '7d' // 7 días
  },

  // AUTENTICACIÓN - Política de Contraseñas
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90, // días antes de expiración
    historyCount: 6 // no reutilizar últimas 6 contraseñas
  },

  // AUTENTICACIÓN - Bloqueo de cuenta
  accountLockout: {
    maxLoginAttempts: 5,
    lockoutDuration: 30 * 60 * 1000 // 30 minutos en milisegundos
  },

  // AUTENTICACIÓN - MFA (TOTP)
  mfa: {
    issuer: process.env.MFA_ISSUER || 'TicketSystemTelco',
    qrSize: 300,
    window: 2 // permitir códigos de ±2 pasos temporales
  },

  // DISPONIBILIDAD - Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 100 // máximo 100 requests por IP
  },

  // DISPONIBILIDAD - Reconexión MongoDB
  mongodb: {
    retryWrites: true,
    retryCount: 3,
    retryDelay: 5000 // 5 segundos
  }
};

/**
 * CONFIDENCIALIDAD - Función para cifrar datos sensibles
 * @param {string} text - Texto a cifrar
 * @returns {string} Texto cifrado en formato: iv:authTag:encryptedData
 */
function encrypt(text) {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      securityConfig.encryption.algorithm,
      securityConfig.encryption.key,
      iv
    );

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Retornar en formato: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Error en cifrado:', error);
    throw error;
  }
}

/**
 * CONFIDENCIALIDAD - Función para descifrar datos
 * @param {string} encryptedData - Datos cifrados en formato: iv:authTag:encryptedData
 * @returns {string} Texto descifrado
 */
function decrypt(encryptedData) {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Formato de datos cifrados inválido');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(
      securityConfig.encryption.algorithm,
      securityConfig.encryption.key,
      iv
    );
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Error en descifrado:', error);
    throw error;
  }
}

/**
 * INTEGRIDAD - Función para calcular SHA-256 checksum de archivos
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @returns {string} Checksum SHA-256 hexadecimal
 */
function calculateChecksum(fileBuffer) {
  return crypto
    .createHash('sha256')
    .update(fileBuffer)
    .digest('hex');
}

module.exports = {
  securityConfig,
  encrypt,
  decrypt,
  calculateChecksum
};
