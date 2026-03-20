/**
 * AUTENTICACIÓN — Middleware JWT
 * Usa Prisma para lookup de usuario (PostgreSQL)
 */

const jwt = require('jsonwebtoken');
const { securityConfig } = require('../config/security');
const prisma = require('../config/database');

/**
 * Verificar JWT y cargar usuario en req.user
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'Token no proporcionado' });
    }

    jwt.verify(token, securityConfig.jwt.secret, async (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ success: false, message: 'Token expirado', code: 'TOKEN_EXPIRED' });
        }
        return res.status(403).json({ success: false, message: 'Token inválido' });
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          mfa_enabled: true
        }
      });

      if (!user || user.status !== 'ACTIVO') {
        return res.status(403).json({ success: false, message: 'Usuario no existe o está inactivo' });
      }

      req.user = user;
      req.token = token;
      next();
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error en autenticación' });
  }
};

/**
 * Verificar Refresh Token
 */
const authenticateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token no proporcionado' });
    }

    const refreshSecret = process.env.REFRESH_TOKEN_SECRET || (securityConfig.jwt.secret + '_refresh');

    jwt.verify(refreshToken, refreshSecret, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ success: false, message: 'Refresh token inválido o expirado' });
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, email: true, role: true, status: true }
      });

      if (!user || user.status !== 'ACTIVO') {
        return res.status(403).json({ success: false, message: 'Usuario no existe' });
      }

      req.user = user;
      next();
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error en autenticación' });
  }
};

/**
 * Generar JWT
 */
const generateToken = (userId, name, role) => {
  return jwt.sign(
    { userId, name, role },
    securityConfig.jwt.secret,
    { expiresIn: securityConfig.jwt.expiration }
  );
};

/**
 * Generar Refresh Token
 */
const generateRefreshToken = (userId) => {
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET || (securityConfig.jwt.secret + '_refresh');
  return jwt.sign(
    { userId },
    refreshSecret,
    { expiresIn: securityConfig.jwt.refreshExpiration }
  );
};

module.exports = {
  authenticateToken,
  authenticateRefreshToken,
  generateToken,
  generateRefreshToken
};
