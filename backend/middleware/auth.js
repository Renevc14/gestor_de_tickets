/**
 * AUTENTICACIÓN - Middleware de autenticación JWT
 * Verifica y valida tokens en todas las rutas protegidas
 */

const jwt = require('jsonwebtoken');
const { securityConfig } = require('../config/security');
const User = require('../models/User');

/**
 * AUTENTICACIÓN - Middleware para verificar JWT token
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Extraer token del header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }

    // Verificar token
    jwt.verify(token, securityConfig.jwt.secret, async (err, decoded) => {
      if (err) {
        // Token expirado
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            message: 'Token expirado',
            code: 'TOKEN_EXPIRED'
          });
        }

        // Token inválido
        return res.status(403).json({
          success: false,
          message: 'Token inválido'
        });
      }

      // Buscar usuario
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Usuario no existe o está inactivo'
        });
      }

      // Agregar usuario al request
      req.user = user;
      req.token = token;

      next();
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en autenticación'
    });
  }
};

/**
 * AUTENTICACIÓN - Middleware para verificar refresh token
 */
const authenticateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token no proporcionado'
      });
    }

    // AUTENTICACIÓN - Usar REFRESH_TOKEN_SECRET del .env
    const refreshSecret = process.env.REFRESH_TOKEN_SECRET || (securityConfig.jwt.secret + '_refresh');

    jwt.verify(refreshToken, refreshSecret, async (err, decoded) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: 'Refresh token inválido o expirado'
        });
      }

      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Usuario no existe'
        });
      }

      req.user = user;
      next();
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en autenticación'
    });
  }
};

/**
 * AUTENTICACIÓN - Generar JWT token
 */
const generateToken = (userId, username, role) => {
  return jwt.sign(
    {
      userId,
      username,
      role
    },
    securityConfig.jwt.secret,
    { expiresIn: securityConfig.jwt.expiration }
  );
};

/**
 * AUTENTICACIÓN - Generar Refresh token
 */
const generateRefreshToken = (userId) => {
  // AUTENTICACIÓN - Usar REFRESH_TOKEN_SECRET del .env
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
