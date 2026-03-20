/**
 * CONFIDENCIALIDAD — Middleware RBAC
 * Monografía UCB: roles SOLICITANTE, TECNICO, ADMINISTRADOR
 */

const { hasPermission, canAccessAuditLogs } = require('../helpers/rbac');
const { logAccessDenied } = require('../helpers/audit');

/**
 * Verificar que el rol del usuario está en la lista permitida
 * Uso: checkRole(['ADMINISTRADOR', 'TECNICO'])
 */
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logAccessDenied(
        req.user.id,
        'system',
        'access_attempt',
        `Rol no autorizado: ${req.user.role}`,
        req
      );
      return res.status(403).json({ success: false, message: 'Rol no autorizado para esta acción' });
    }

    next();
  };
};

/**
 * Verificar permiso específico sobre un recurso
 * Uso: checkPermission('tickets', 'create')
 */
const checkPermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    if (!hasPermission(req.user.role, resource, action)) {
      logAccessDenied(req.user.id, resource, action, `Permiso denegado`, req);
      return res.status(403).json({ success: false, message: `No tiene permiso para ${action} en ${resource}` });
    }

    next();
  };
};

/**
 * Verificar acceso a logs de auditoría (solo ADMINISTRADOR)
 */
const checkAuditAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'No autenticado' });
  }

  if (!canAccessAuditLogs(req.user)) {
    logAccessDenied(req.user.id, 'auditLogs', 'view', 'Acceso denegado a auditoría', req);
    return res.status(403).json({ success: false, message: 'No tiene acceso a logs de auditoría' });
  }

  next();
};

module.exports = { checkRole, checkPermission, checkAuditAccess };
