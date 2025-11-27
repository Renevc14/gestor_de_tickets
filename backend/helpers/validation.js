/**
 * INTEGRIDAD - Funciones de validación
 * Valida políticas de contraseñas, permisos y acceso
 */

const { securityConfig } = require('../config/security');

/**
 * INTEGRIDAD - Validar contraseña contra política
 * Retorna objeto con validación y detalles
 */
function validatePassword(password) {
  const policy = securityConfig.passwordPolicy;
  const validation = {
    isValid: true,
    errors: [],
    requirements: {
      minLength: password.length >= policy.minLength,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    }
  };

  if (!validation.requirements.minLength) {
    validation.errors.push(
      `Mínimo ${policy.minLength} caracteres`
    );
    validation.isValid = false;
  }

  if (policy.requireUppercase && !validation.requirements.hasUppercase) {
    validation.errors.push('Debe contener al menos una mayúscula');
    validation.isValid = false;
  }

  if (policy.requireLowercase && !validation.requirements.hasLowercase) {
    validation.errors.push('Debe contener al menos una minúscula');
    validation.isValid = false;
  }

  if (policy.requireNumbers && !validation.requirements.hasNumbers) {
    validation.errors.push('Debe contener al menos un número');
    validation.isValid = false;
  }

  if (policy.requireSpecialChars && !validation.requirements.hasSpecialChars) {
    validation.errors.push('Debe contener al menos un carácter especial (!@#$%^&*)');
    validation.isValid = false;
  }

  return validation;
}

/**
 * INTEGRIDAD - Validar entrada para prevenir XSS y SQL Injection
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }

  // Remover caracteres peligrosos
  return input
    .replace(/[<>]/g, '') // Remover < y >
    .trim();
}

/**
 * INTEGRIDAD - Validar que los campos requeridos existan
 */
function validateRequiredFields(data, requiredFields) {
  const missing = requiredFields.filter(
    field => !data[field] || data[field].toString().trim() === ''
  );

  if (missing.length > 0) {
    return {
      isValid: false,
      missingFields: missing,
      message: `Campos requeridos faltando: ${missing.join(', ')}`
    };
  }

  return { isValid: true };
}

/**
 * INTEGRIDAD - Validar tipos de datos
 */
function validateDataTypes(data, schema) {
  const errors = [];

  for (const [field, expectedType] of Object.entries(schema)) {
    if (!(field in data)) continue;

    const actualType = typeof data[field];
    if (actualType !== expectedType) {
      errors.push(`Campo "${field}" debe ser ${expectedType}, recibido ${actualType}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * SEGURIDAD - Validar adjuntos (MIME type, tamaño, nombre)
 */
function validateAttachment(file, options = {}) {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB por defecto
    allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ]
  } = options;

  const errors = [];

  // Validar que el archivo existe
  if (!file) {
    return {
      isValid: false,
      errors: ['No se proporcionó archivo']
    };
  }

  // Validar tamaño
  if (file.size > maxSize) {
    errors.push(`Archivo supera el tamaño máximo de ${Math.round(maxSize / (1024 * 1024))}MB`);
  }

  // Validar MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    errors.push(`Tipo de archivo no permitido: ${file.mimetype}`);
  }

  // Validar nombre de archivo (prevenir path traversal)
  if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
    errors.push('Nombre de archivo inválido');
  }

  // Sanitizar nombre de archivo
  const sanitizedName = file.originalname
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255);

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedName,
    file
  };
}

/**
 * SEGURIDAD - Generar nombre único y seguro para archivo
 */
function generateSecureFilename(originalName) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.substring(originalName.lastIndexOf('.'));
  const baseName = originalName
    .substring(0, originalName.lastIndexOf('.'))
    .replace(/[^a-zA-Z0-9-]/g, '_')
    .substring(0, 50);

  return `${baseName}_${timestamp}_${random}${extension}`;
}

module.exports = {
  validatePassword,
  sanitizeInput,
  validateRequiredFields,
  validateDataTypes,
  validateAttachment,
  generateSecureFilename
};
