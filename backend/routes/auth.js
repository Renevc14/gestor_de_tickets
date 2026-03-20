/**
 * AUTENTICACIÓN — Rutas de Autenticación
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, authenticateRefreshToken } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/login-mfa', authController.verifyLoginMFA);
router.post('/refresh', authenticateRefreshToken, authController.refreshToken);
router.get('/profile', authenticateToken, authController.getProfile);
router.patch('/change-password', authenticateToken, authController.changePassword);
router.post('/setup-mfa', authenticateToken, authController.setupMFA);
router.post('/verify-mfa', authenticateToken, authController.verifyMFA);
router.post('/disable-mfa', authenticateToken, authController.disableMFA);

module.exports = router;
