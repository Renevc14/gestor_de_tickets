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

/**
 * AUTENTICACIÓN - Middleware: Requerir MFA para roles específicos
 * Aplica a admin y supervisor
 */
const requireMFA = async (req, res, next) => {
  try {
    // Solo admin y supervisor necesitan MFA
    const requiresSecondFactor = ['administrador', 'supervisor'].includes(req.user.role);

    if (!requiresSecondFactor) {
      return next();
    }

    // Si MFA no está habilitado, retornar error
    if (!req.user.mfaEnabled) {
      return res.status(403).json({
        success: false,
        message: 'MFA es requerido para tu rol',
        code: 'MFA_REQUIRED'
      });
    }

    // Buscar token MFA en header
    const mfaToken = req.headers['x-mfa-token'];

    if (!mfaToken) {
      return res.status(403).json({
        success: false,
        message: 'Token MFA no proporcionado',
        code: 'MFA_TOKEN_REQUIRED'
      });
    }

    // Obtener secret del usuario (con select: false, necesitamos acceso directo)
    const User = require('../models/User');
    const user = await User.findById(req.user._id).select('mfaSecret');

    if (!user.mfaSecret) {
      return res.status(500).json({
        success: false,
        message: 'Error en configuración de MFA'
      });
    }

    // Verificar TOTP
    const isValid = verifyTOTP(user.mfaSecret, mfaToken);

    if (!isValid) {
      return res.status(403).json({
        success: false,
        message: 'Código MFA inválido o expirado',
        code: 'INVALID_MFA_CODE'
      });
    }

    // MFA verificado
    req.mfaVerified = true;
    next();
  } catch (error) {
    console.error('Error en MFA:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando MFA'
    });
  }
};

/**
 * AUTENTICACIÓN - Middleware: Verificar MFA durante login
 */
const checkMFAOnLogin = (req, res, next) => {
  // Si el usuario no tiene MFA habilitado, no requiere verificación
  if (!req.user.mfaEnabled) {
    return next();
  }

  // Si tiene MFA, requerir código en siguiente paso
  return res.status(200).json({
    success: true,
    message: 'Ingrese código MFA',
    mfaRequired: true,
    userId: req.user._id
  });
};

module.exports = {
  generateMFASecret,
  verifyTOTP,
  requireMFA,
  checkMFAOnLogin
};
