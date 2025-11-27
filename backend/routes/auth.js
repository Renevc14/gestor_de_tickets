/**
 * AUTENTICACIÓN - Rutas de Autenticación
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, authenticateRefreshToken } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * AUTENTICACIÓN - Registrar nuevo usuario
 */
router.post('/register', authController.register);

/**
 * POST /api/auth/login
 * AUTENTICACIÓN - Login con soporte MFA
 */
router.post('/login', authController.login);

/**
 * POST /api/auth/login-mfa
 * AUTENTICACIÓN - Verificar código MFA durante login
 */
router.post('/login-mfa', authController.verifyLoginMFA);

/**
 * POST /api/auth/refresh
 * AUTENTICACIÓN - Refrescar token
 */
router.post('/refresh', authenticateRefreshToken, authController.refreshToken);

/**
 * GET /api/auth/profile
 * AUTENTICACIÓN - Obtener perfil del usuario actual
 */
router.get('/profile', authenticateToken, authController.getProfile);

/**
 * POST /api/auth/setup-mfa
 * AUTENTICACIÓN - Generar QR code para MFA
 */
router.post('/setup-mfa', authenticateToken, authController.setupMFA);

/**
 * POST /api/auth/verify-mfa
 * AUTENTICACIÓN - Verificar y activar MFA
 */
router.post('/verify-mfa', authenticateToken, authController.verifyMFA);

/**
 * POST /api/auth/disable-mfa
 * AUTENTICACIÓN - Deshabilitar MFA
 */
router.post('/disable-mfa', authenticateToken, authController.disableMFA);

module.exports = router;
