/**
 * AUTENTICACIÓN - Modelo de Usuario
 * Implementa políticas de contraseñas, bloqueo de cuenta y MFA
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { securityConfig } = require('../config/security');

const UserSchema = new mongoose.Schema(
  {
    // AUTENTICACIÓN - Identificación
    username: {
      type: String,
      required: [true, 'Usuario es requerido'],
      unique: true,
      trim: true,
      minlength: [3, 'Usuario debe tener al menos 3 caracteres'],
      maxlength: [50, 'Usuario no puede exceder 50 caracteres']
    },

    email: {
      type: String,
      required: [true, 'Email es requerido'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
    },

    // AUTENTICACIÓN - Contraseña hasheada
    password: {
      type: String,
      required: [true, 'Contraseña es requerida'],
      minlength: [12, 'Contraseña debe tener al menos 12 caracteres'],
      select: false // no incluir contraseña por defecto en queries
    },

    // CONFIABILIDAD - Historial de contraseñas (últimas 6)
    passwordHistory: [
      {
        password: String,
        changedAt: { type: Date, default: Date.now }
      }
    ],

    // CONTROL DE ACCESO - Rol del usuario
    role: {
      type: String,
      enum: ['cliente', 'agente_n1', 'agente_n2', 'supervisor', 'administrador'],
      required: [true, 'Rol es requerido'],
      default: 'cliente'
    },

    // AUTENTICACIÓN - MFA (TOTP)
    mfaEnabled: {
      type: Boolean,
      default: false
    },

    mfaSecret: {
      type: String,
      select: false // no incluir secret por defecto
    },

    // AUTENTICACIÓN - Bloqueo de cuenta
    loginAttempts: {
      type: Number,
      default: 0
    },

    lockUntil: {
      type: Date // fecha hasta la cual la cuenta está bloqueada
    },

    lastLogin: Date,

    lastPasswordChange: {
      type: Date,
      default: Date.now
    },

    // CONTROL - Estado del usuario
    isActive: {
      type: Boolean,
      default: true
    },

    // AUDITORÍA - Tracking de cambios
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true
    },

    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

/**
 * AUTENTICACIÓN - Middleware: Hash de contraseña antes de guardar
 * Solo hashear si la contraseña fue modificada
 */
UserSchema.pre('save', async function (next) {
  // Si la contraseña no fue modificada, continuar
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // CONFIABILIDAD - Guardar contraseña anterior en historial
    if (this.password && !this.isNew) {
      const oldPassword = await User.findById(this._id).select('password');
      if (oldPassword) {
        this.passwordHistory.push({
          password: oldPassword.password,
          changedAt: new Date()
        });
        // Mantener solo las últimas 6 contraseñas
        if (this.passwordHistory.length > securityConfig.passwordPolicy.historyCount) {
          this.passwordHistory.shift();
        }
      }
    }

    // AUTENTICACIÓN - Hash con bcrypt
    const salt = await bcrypt.genSalt(securityConfig.encryption.saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    this.lastPasswordChange = new Date();

    next();
  } catch (error) {
    next(error);
  }
});

/**
 * AUTENTICACIÓN - Método para comparar contraseñas
 */
UserSchema.methods.comparePassword = async function (passwordAttempt) {
  try {
    return await bcrypt.compare(passwordAttempt, this.password);
  } catch (error) {
    throw new Error('Error comparando contraseñas');
  }
};

/**
 * AUTENTICACIÓN - Método para obtener usuario seguro (sin datos sensibles)
 */
UserSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.passwordHistory;
  delete userObject.mfaSecret;
  return userObject;
};

/**
 * AUTENTICACIÓN - Virtual para verificar si cuenta está bloqueada
 */
UserSchema.virtual('isLocked').get(function () {
  return this.lockUntil && this.lockUntil > Date.now();
});

/**
 * AUTENTICACIÓN - Método para registrar intento de login fallido
 */
UserSchema.methods.incLoginAttempts = function () {
  // Si el bloqueo ha expirado, resetear intentos
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }

  // Incrementar intentos
  const updates = { $inc: { loginAttempts: 1 } };

  // Si se alcanzó el máximo de intentos, bloquear la cuenta
  const maxAttempts = securityConfig.accountLockout.maxLoginAttempts;
  const lockoutDuration = securityConfig.accountLockout.lockoutDuration;

  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + lockoutDuration };
  }

  return this.updateOne(updates);
};

/**
 * AUTENTICACIÓN - Método para resetear intentos de login
 */
UserSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

/**
 * AUTENTICACIÓN - Índices para optimizar queries
 */
UserSchema.index({ role: 1 });

const User = mongoose.model('User', UserSchema);

module.exports = User;
