/**
 * CONFIDENCIALIDAD - Middleware de Control de Acceso Basado en Roles (RBAC)
 * Verifica permisos según el rol del usuario
 */

const { hasPermission, canAccessAuditLogs } = require('../helpers/rbac');
const { logAccessDenied } = require('../helpers/audit');

/**
 * CONFIDENCIALIDAD - Middleware: Verificar si rol tiene permiso
 * Uso: checkRole(['administrador', 'supervisor'])(req, res, next)
 */
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logAccessDenied(
        req.user._id,
        'system',
        'access_attempt',
        `Rol no autorizado: ${req.user.role} no en ${allowedRoles.join(', ')}`,
        req
      );

      return res.status(403).json({
        success: false,
        message: 'Rol no autorizado para esta acción'
      });
    }

    next();
  };
};

/**
 * CONFIDENCIALIDAD - Middleware: Verificar permisos específicos
 * Uso: checkPermission('tickets', 'create')(req, res, next)
 */
const checkPermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }

    const allowed = hasPermission(req.user.role, resource, action);

    if (!allowed) {
      logAccessDenied(
        req.user._id,
        resource,
        action,
        `Permiso denegado: ${action} en ${resource}`,
        req
      );

      return res.status(403).json({
        success: false,
        message: `No tiene permiso para ${action} ${resource}`
      });
    }

    next();
  };
};

/**
 * CONFIDENCIALIDAD - Middleware: Verificar acceso a auditoría
 */
const checkAuditAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'No autenticado'
    });
  }

  if (!canAccessAuditLogs(req.user)) {
    logAccessDenied(
      req.user._id,
      'auditLogs',
      'view',
      'Acceso denegado a logs de auditoría',
      req
    );

    return res.status(403).json({
      success: false,
      message: 'No tiene acceso a logs de auditoría'
    });
  }

  next();
};

module.exports = {
  checkRole,
  checkPermission,
  checkAuditAccess
};
