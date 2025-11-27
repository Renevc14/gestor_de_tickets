/**
 * AUTENTICACIÓN - Controlador de Autenticación
 * Maneja registro, login, MFA y gestión de sesiones
 */

const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const { generateMFASecret, verifyTOTP } = require('../middleware/mfa');
const { validatePassword, sanitizeInput, validateRequiredFields } = require('../helpers/validation');
const {
  logLoginSuccess,
  logLoginFailed,
  logAccountLocked,
  logPasswordChanged,
  logMFAEnabled
} = require('../helpers/audit');
const { securityConfig } = require('../config/security');

/**
 * AUTENTICACIÓN - Registrar nuevo usuario
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // INTEGRIDAD - Validar campos requeridos
    const validation = validateRequiredFields(req.body, ['username', 'email', 'password', 'confirmPassword']);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
        missingFields: validation.missingFields
      });
    }

    // INTEGRIDAD - Validar que las contraseñas coincidan
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Las contraseñas no coinciden'
      });
    }

    // INTEGRIDAD - Validar política de contraseña
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña no cumple con los requisitos',
        requirements: passwordValidation.requirements,
        errors: passwordValidation.errors
      });
    }

    // INTEGRIDAD - Sanitizar entrada
    const sanitizedUsername = sanitizeInput(username);
    const sanitizedEmail = sanitizeInput(email);

    // CONFIDENCIALIDAD - Verificar si usuario ya existe
    const existingUser = await User.findOne({
      $or: [{ username: sanitizedUsername }, { email: sanitizedEmail }]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Usuario o email ya existe'
      });
    }

    // AUTENTICACIÓN - Crear usuario
    const user = new User({
      username: sanitizedUsername,
      email: sanitizedEmail,
      password,
      role: 'cliente' // Por defecto, nuevo usuario es cliente
    });

    await user.save();

    // NO REPUDIO - Registrar registro de usuario
    const { logAuditEvent } = require('../helpers/audit');
    await logAuditEvent(
      user._id,
      'register_user',
      'user',
      user._id,
      { username: sanitizedUsername },
      req,
      true
    );

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el registro'
    });
  }
};

/**
 * AUTENTICACIÓN - Login con soporte para MFA
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // INTEGRIDAD - Validar campos requeridos
    const validation = validateRequiredFields(req.body, ['username', 'password']);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    // Buscar usuario
    const user = await User.findOne({ username }).select('+password +mfaSecret');

    if (!user) {
      // NO REPUDIO - Registrar login fallido
      await logLoginFailed(username, 'Usuario no encontrado', req);

      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña incorrectos'
      });
    }

    // AUTENTICACIÓN - Verificar si cuenta está bloqueada
    if (user.isLocked) {
      // NO REPUDIO - Registrar intento en cuenta bloqueada
      await logAccountLocked(user._id, req);

      return res.status(403).json({
        success: false,
        message: 'Cuenta bloqueada por demasiados intentos fallidos. Intente más tarde.'
      });
    }

    // AUTENTICACIÓN - Verificar contraseña
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // AUTENTICACIÓN - Incrementar intentos fallidos
      await user.incLoginAttempts();

      // NO REPUDIO - Registrar login fallido
      await logLoginFailed(username, 'Contraseña incorrecta', req);

      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña incorrectos'
      });
    }

    // AUTENTICACIÓN - Contraseña correcta, resetear intentos
    await user.resetLoginAttempts();

    // AUTENTICACIÓN - Si MFA está habilitado, requerir código
    if (user.mfaEnabled) {
      return res.status(200).json({
        success: true,
        message: 'Ingrese código MFA',
        mfaRequired: true,
        userId: user._id
      });
    }

    // AUTENTICACIÓN - Generar tokens
    const token = generateToken(user._id, user.username, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Actualizar último login
    user.lastLogin = new Date();
    await user.save();

    // NO REPUDIO - Registrar login exitoso
    await logLoginSuccess(user._id, req);

    res.status(200).json({
      success: true,
      message: 'Login exitoso',
      token,
      refreshToken,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el login'
    });
  }
};

/**
 * AUTENTICACIÓN - Verificar código MFA durante login
 * POST /api/auth/login-mfa
 */
const verifyLoginMFA = async (req, res) => {
  try {
    const { userId, mfaCode } = req.body;

    // Validar campos
    if (!userId || !mfaCode) {
      return res.status(400).json({
        success: false,
        message: 'userId y mfaCode son requeridos'
      });
    }

    // Buscar usuario
    const user = await User.findById(userId).select('+mfaSecret');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // AUTENTICACIÓN - Verificar TOTP
    const isValidMFA = verifyTOTP(user.mfaSecret, mfaCode);

    if (!isValidMFA) {
      return res.status(403).json({
        success: false,
        message: 'Código MFA inválido o expirado'
      });
    }

    // AUTENTICACIÓN - Generar tokens
    const token = generateToken(user._id, user.username, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Actualizar último login
    user.lastLogin = new Date();
    await user.save();

    // NO REPUDIO - Registrar login exitoso
    await logLoginSuccess(user._id, req);

    res.status(200).json({
      success: true,
      message: 'MFA verificado exitosamente',
      token,
      refreshToken,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Error en MFA login:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando MFA'
    });
  }
};

/**
 * AUTENTICACIÓN - Configurar MFA (generar QR)
 * POST /api/auth/setup-mfa
 */
const setupMFA = async (req, res) => {
  try {
    const userId = req.user._id;

    // Generar secreto MFA
    const mfaData = await generateMFASecret(req.user.username);

    // Guardar secreto temporalmente (sin activar aún)
    const user = await User.findById(userId);
    user.mfaSecret = mfaData.secret;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'QR code generado. Escanee con Google Authenticator',
      qrCode: mfaData.qrCode,
      manualEntryKey: mfaData.manualEntryKey
    });
  } catch (error) {
    console.error('Error setup MFA:', error);
    res.status(500).json({
      success: false,
      message: 'Error configurando MFA'
    });
  }
};

/**
 * AUTENTICACIÓN - Verificar y activar MFA
 * POST /api/auth/verify-mfa
 */
const verifyMFA = async (req, res) => {
  try {
    const userId = req.user._id;
    const { mfaCode } = req.body;

    if (!mfaCode) {
      return res.status(400).json({
        success: false,
        message: 'Código MFA es requerido'
      });
    }

    // Buscar usuario
    const user = await User.findById(userId).select('+mfaSecret');

    if (!user.mfaSecret) {
      return res.status(400).json({
        success: false,
        message: 'Primero debe generar el QR code'
      });
    }

    // AUTENTICACIÓN - Verificar código
    const isValid = verifyTOTP(user.mfaSecret, mfaCode);

    if (!isValid) {
      return res.status(403).json({
        success: false,
        message: 'Código MFA inválido'
      });
    }

    // AUTENTICACIÓN - Activar MFA
    user.mfaEnabled = true;
    await user.save();

    // NO REPUDIO - Registrar MFA habilitado
    await logMFAEnabled(userId, req);

    res.status(200).json({
      success: true,
      message: 'MFA habilitado exitosamente',
      mfaEnabled: true
    });
  } catch (error) {
    console.error('Error verificando MFA:', error);
    res.status(500).json({
      success: false,
      message: 'Error activando MFA'
    });
  }
};

/**
 * AUTENTICACIÓN - Deshabilitar MFA
 * POST /api/auth/disable-mfa
 */
const disableMFA = async (req, res) => {
  try {
    const userId = req.user._id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña es requerida'
      });
    }

    // Verificar contraseña
    const user = await User.findById(userId).select('+password');
    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña incorrecta'
      });
    }

    // Deshabilitar MFA
    user.mfaEnabled = false;
    user.mfaSecret = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'MFA deshabilitado'
    });
  } catch (error) {
    console.error('Error deshabilitando MFA:', error);
    res.status(500).json({
      success: false,
      message: 'Error deshabilitando MFA'
    });
  }
};

/**
 * AUTENTICACIÓN - Refresh token
 * POST /api/auth/refresh
 */
const refreshToken = async (req, res) => {
  try {
    const user = req.user;

    // Generar nuevo token
    const token = generateToken(user._id, user.username, user.role);
    const newRefreshToken = generateRefreshToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Token refrescado',
      token,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error refrescando token'
    });
  }
};

/**
 * AUTENTICACIÓN - Obtener perfil del usuario actual
 * GET /api/auth/profile
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo perfil'
    });
  }
};

module.exports = {
  register,
  login,
  verifyLoginMFA,
  setupMFA,
  verifyMFA,
  disableMFA,
  refreshToken,
  getProfile
};
