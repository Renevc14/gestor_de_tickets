/**
 * AUTENTICACIÓN — Controlador de Autenticación
 * Monografía UCB: login por email, JWT + MFA opcional
 */

const bcrypt = require('bcrypt');
const prisma = require('../config/database');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const { generateMFASecret, verifyTOTP } = require('../middleware/mfa');
const {
  logLoginSuccess,
  logLoginFailed,
  logAccountLocked,
  logPasswordChanged,
  logMFAEnabled,
  logAuditEvent
} = require('../helpers/audit');
const { securityConfig } = require('../config/security');

// ─── helpers internos ──────────────────────────────────────────────────────

function isLocked(user) {
  return user.lock_until && user.lock_until > new Date();
}

async function incrementAttempts(userId) {
  const maxAttempts = securityConfig.accountLockout.maxLoginAttempts;
  const lockDuration = securityConfig.accountLockout.lockoutDuration;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      login_attempts: { increment: 1 }
    }
  });

  if (updated.login_attempts >= maxAttempts) {
    await prisma.user.update({
      where: { id: userId },
      data: { lock_until: new Date(Date.now() + lockDuration) }
    });
  }
}

async function resetAttempts(userId) {
  await prisma.user.update({
    where: { id: userId },
    data: { login_attempts: 0, lock_until: null, last_login: new Date() }
  });
}

// ─── Controladores ─────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Registro de nuevo usuario (rol SOLICITANTE por defecto)
 */
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'name, email y password son requeridos' });
    }

    // Política de contraseña
    const { validatePassword } = require('../helpers/validation');
    const pwValidation = validatePassword(password);
    if (!pwValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña no cumple los requisitos',
        errors: pwValidation.errors
      });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, securityConfig.encryption.saltRounds);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: 'SOLICITANTE',
        status: 'ACTIVO',
        password_history: JSON.stringify([hashedPassword])
      },
      select: { id: true, name: true, email: true, role: true, status: true, created_at: true }
    });

    await logAuditEvent(user.id, 'register_user', 'user', user.id, { email: user.email }, req, true);

    res.status(201).json({ success: true, message: 'Usuario registrado exitosamente', user });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ success: false, message: 'Error en el registro' });
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email y password son requeridos' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user) {
      await logLoginFailed(email, 'Usuario no encontrado', req);
      return res.status(401).json({ success: false, message: 'Email o contraseña incorrectos' });
    }

    if (user.status !== 'ACTIVO') {
      return res.status(403).json({ success: false, message: 'Cuenta inactiva. Contacte al administrador.' });
    }

    if (isLocked(user)) {
      await logAccountLocked(user.id, req);
      return res.status(403).json({ success: false, message: 'Cuenta bloqueada por demasiados intentos fallidos. Intente más tarde.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      await incrementAttempts(user.id);
      await logLoginFailed(email, 'Contraseña incorrecta', req);
      return res.status(401).json({ success: false, message: 'Email o contraseña incorrectos' });
    }

    await resetAttempts(user.id);

    // MFA requerido
    if (user.mfa_enabled) {
      return res.status(200).json({
        success: true,
        message: 'Ingrese código MFA',
        mfaRequired: true,
        userId: user.id
      });
    }

    const token = generateToken(user.id, user.name, user.role);
    const refreshToken = generateRefreshToken(user.id);

    await logLoginSuccess(user.id, req);

    res.status(200).json({
      success: true,
      message: 'Login exitoso',
      token,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ success: false, message: 'Error en el login' });
  }
};

/**
 * POST /api/auth/login-mfa
 */
const verifyLoginMFA = async (req, res) => {
  try {
    const { userId, mfaCode } = req.body;

    if (!userId || !mfaCode) {
      return res.status(400).json({ success: false, message: 'userId y mfaCode son requeridos' });
    }

    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
    }

    const isValidMFA = verifyTOTP(user.mfa_secret, mfaCode);

    if (!isValidMFA) {
      await logAuditEvent(user.id, 'mfa_login_failed', 'user', user.id, {}, req, false, 'Codigo MFA invalido');
      return res.status(403).json({ success: false, message: 'Código MFA inválido o expirado' });
    }

    await resetAttempts(user.id);

    const token = generateToken(user.id, user.name, user.role);
    const refreshToken = generateRefreshToken(user.id);

    await logLoginSuccess(user.id, req);

    res.status(200).json({
      success: true,
      message: 'MFA verificado exitosamente',
      token,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Error en MFA login:', error);
    res.status(500).json({ success: false, message: 'Error verificando MFA' });
  }
};

/**
 * POST /api/auth/setup-mfa
 */
const setupMFA = async (req, res) => {
  try {
    const mfaData = await generateMFASecret(req.user.email);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { mfa_secret: mfaData.secret }
    });

    res.status(200).json({
      success: true,
      message: 'QR code generado. Escanee con Google Authenticator',
      qrCode: mfaData.qrCode,
      manualEntryKey: mfaData.manualEntryKey
    });
  } catch (error) {
    console.error('Error setup MFA:', error);
    res.status(500).json({ success: false, message: 'Error configurando MFA' });
  }
};

/**
 * POST /api/auth/verify-mfa
 */
const verifyMFA = async (req, res) => {
  try {
    const { mfaCode } = req.body;

    if (!mfaCode) {
      return res.status(400).json({ success: false, message: 'Código MFA es requerido' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!user.mfa_secret) {
      return res.status(400).json({ success: false, message: 'Primero debe generar el QR code' });
    }

    const isValid = verifyTOTP(user.mfa_secret, mfaCode);

    if (!isValid) {
      return res.status(403).json({ success: false, message: 'Código MFA inválido' });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { mfa_enabled: true }
    });

    await logMFAEnabled(req.user.id, req);

    res.status(200).json({ success: true, message: 'MFA habilitado exitosamente', mfaEnabled: true });
  } catch (error) {
    console.error('Error verificando MFA:', error);
    res.status(500).json({ success: false, message: 'Error activando MFA' });
  }
};

/**
 * POST /api/auth/disable-mfa
 */
const disableMFA = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Contraseña es requerida' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { mfa_enabled: false, mfa_secret: null }
    });

    await logAuditEvent(req.user.id, 'mfa_disabled', 'user', req.user.id, {}, req, true);

    res.status(200).json({ success: true, message: 'MFA deshabilitado' });
  } catch (error) {
    console.error('Error deshabilitando MFA:', error);
    res.status(500).json({ success: false, message: 'Error deshabilitando MFA' });
  }
};

/**
 * POST /api/auth/refresh
 */
const refreshToken = async (req, res) => {
  try {
    const user = req.user;
    const token = generateToken(user.id, user.name, user.role);
    const newRefreshToken = generateRefreshToken(user.id);

    res.status(200).json({ success: true, token, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error refrescando token' });
  }
};

/**
 * GET /api/auth/profile
 */
const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, email: true, role: true, status: true,
        mfa_enabled: true, last_login: true, created_at: true
      }
    });

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo perfil' });
  }
};

/**
 * PATCH /api/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'currentPassword y newPassword son requeridos' });
    }

    const { validatePassword } = require('../helpers/validation');
    const pwValidation = validatePassword(newPassword);
    if (!pwValidation.isValid) {
      return res.status(400).json({ success: false, message: 'La contraseña no cumple los requisitos', errors: pwValidation.errors });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const isValid = await bcrypt.compare(currentPassword, user.password);

    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Contraseña actual incorrecta' });
    }

    // Verificar historial de contraseñas
    const history = Array.isArray(user.password_history) ? user.password_history : JSON.parse(user.password_history || '[]');
    for (const oldHash of history) {
      if (await bcrypt.compare(newPassword, oldHash)) {
        return res.status(400).json({ success: false, message: 'No puede reutilizar contraseñas recientes' });
      }
    }

    const newHash = await bcrypt.hash(newPassword, securityConfig.encryption.saltRounds);
    const updatedHistory = [newHash, ...history].slice(0, securityConfig.passwordPolicy.historyCount);

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        password: newHash,
        password_history: JSON.stringify(updatedHistory),
        last_password_change: new Date()
      }
    });

    await logPasswordChanged(req.user.id, req);

    res.status(200).json({ success: true, message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({ success: false, message: 'Error cambiando contraseña' });
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
  getProfile,
  changePassword
};
