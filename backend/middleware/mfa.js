/**
 * AUTENTICACIÓN - Middleware de Verificación MFA (TOTP)
 * Implementa autenticación de dos factores usando Google Authenticator
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { securityConfig } = require('../config/security');

/**
 * AUTENTICACIÓN - Generar secreto MFA y QR code
 */
const generateMFASecret = async (username, issuer = securityConfig.mfa.issuer) => {
  try {
    // Generar secreto
    const secret = speakeasy.generateSecret({
      name: `${issuer} (${username})`,
      issuer,
      length: 32
    });

    // Generar QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: securityConfig.mfa.qrSize
    });

    return {
      secret: secret.base32,
      backupCodes: secret.base32, // En producción usar códigos de backup reales
      qrCode,
      manualEntryKey: secret.base32
    };
  } catch (error) {
    throw new Error('Error generando MFA secret: ' + error.message);
  }
};

/**
 * AUTENTICACIÓN - Verificar código TOTP
 */
const verifyTOTP = (secret, token, window = securityConfig.mfa.window) => {
  try {
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window
    });

    return verified;
  } catch (error) {
    console.error('Error verificando TOTP:', error);
    return false;
  }
};

module.exports = {
  generateMFASecret,
  verifyTOTP
};
