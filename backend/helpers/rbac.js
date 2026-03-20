/**
 * CONFIDENCIALIDAD — Control de Acceso basado en Roles (RBAC)
 * Monografía UCB: 3 roles — SOLICITANTE, TECNICO, ADMINISTRADOR
 */

/**
 * Matriz de permisos por rol (monografía sección 3.2.2)
 */
const permissions = {
  SOLICITANTE: {
    tickets: ['create', 'read_own', 'add_comments'],
    comments: ['create', 'read_own'],
    attachments: ['upload_own'],
    auditLogs: []
  },
  TECNICO: {
    tickets: ['create', 'read_assigned', 'read_unassigned', 'update_assigned', 'add_comments'],
    comments: ['create', 'read_all'],
    attachments: ['upload', 'download'],
    auditLogs: ['view_own']
  },
  ADMINISTRADOR: {
    tickets: ['*'],
    comments: ['*'],
    attachments: ['*'],
    auditLogs: ['*'],
    users: ['*'],
    categories: ['*'],
    reports: ['*']
  }
};

/**
 * Verificar si un rol tiene un permiso específico
 */
function hasPermission(role, resource, action) {
  if (!permissions[role]) return false;
  const rolePerms = permissions[role][resource];
  if (!rolePerms) return false;
  if (rolePerms.includes('*')) return true;
  return rolePerms.includes(action);
}

/**
 * Verificar acceso a un ticket específico según rol y acción
 * Trabaja con objetos Prisma (user_id / tech_id como Int)
 */
function canAccessTicket(ticket, user, action) {
  const role = user.role;

  if (role === 'ADMINISTRADOR') return true;

  if (role === 'SOLICITANTE') {
    if (action === 'create') return true;
    // Lee/comenta solo sus propios tickets
    return ticket.user_id === user.id;
  }

  if (role === 'TECNICO') {
    if (action === 'create') return true;
    if (action === 'read_unassigned' && !ticket.tech_id) return true;
    // Accede a tickets asignados a él
    return ticket.tech_id === user.id;
  }

  return false;
}

/**
 * Verificar acceso a auditoría
 */
function canAccessAuditLogs(user) {
  return user.role === 'ADMINISTRADOR';
}

/**
 * Obtener filtros Prisma WHERE según rol
 */
function getTicketFilters(user) {
  switch (user.role) {
    case 'SOLICITANTE':
      return { user_id: user.id };
    case 'TECNICO':
      return {
        OR: [
          { tech_id: user.id },
          { tech_id: null }
        ]
      };
    case 'ADMINISTRADOR':
      return {};
    default:
      return { id: -1 }; // Acceso denegado
  }
}

module.exports = {
  permissions,
  hasPermission,
  canAccessTicket,
  canAccessAuditLogs,
  getTicketFilters
};
