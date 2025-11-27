/**
 * CONFIDENCIALIDAD - Control de Acceso basado en Roles (RBAC)
 * Define matriz de permisos para cada rol
 */

/**
 * CONFIDENCIALIDAD - Matriz de permisos por rol
 */
const permissions = {
  cliente: {
    tickets: ['create', 'read_own'],
    comments: ['create', 'read_own'],
    attachments: ['upload_own'],
    auditLogs: []
  },
  agente_n1: {
    tickets: ['create', 'read_assigned', 'update_assigned', 'add_comments'],
    comments: ['create', 'read_assigned'],
    attachments: ['upload', 'download'],
    auditLogs: ['view_own']
  },
  agente_n2: {
    tickets: ['create', 'read_assigned', 'update_assigned', 'escalate', 'add_comments'],
    comments: ['create', 'read_assigned'],
    attachments: ['upload', 'download'],
    auditLogs: ['view_own']
  },
  supervisor: {
    tickets: ['create', 'read_all', 'update_all', 'reassign', 'reports', 'add_comments'],
    comments: ['create', 'read_all'],
    attachments: ['upload', 'download'],
    auditLogs: ['view_all', 'filter']
  },
  administrador: {
    tickets: ['*'],
    comments: ['*'],
    attachments: ['*'],
    auditLogs: ['*'],
    users: ['*']
  }
};

/**
 * CONFIDENCIALIDAD - Verificar si un rol tiene un permiso específico
 * @param {string} role - Rol del usuario
 * @param {string} resource - Recurso (tickets, comments, etc)
 * @param {string} action - Acción (create, read_own, etc)
 * @returns {boolean} True si tiene permiso
 */
function hasPermission(role, resource, action) {
  if (!permissions[role]) {
    return false;
  }

  const rolePermissions = permissions[role][resource];
  if (!rolePermissions) {
    return false;
  }

  // Admin tiene todos los permisos
  if (rolePermissions.includes('*')) {
    return true;
  }

  return rolePermissions.includes(action);
}

/**
 * CONFIDENCIALIDAD - Obtener todos los permisos de un rol
 */
function getRolePermissions(role) {
  return permissions[role] || {};
}

/**
 * CONFIDENCIALIDAD - Verificar acceso a un ticket específico
 * @param {Object} ticket - Documento del ticket
 * @param {Object} user - Usuario intentando acceder
 * @param {string} action - Acción intentada
 * @returns {boolean} True si tiene acceso
 */
function canAccessTicket(ticket, user, action) {
  const role = user.role;

  // Admin puede hacer cualquier cosa
  if (role === 'administrador') {
    return true;
  }

  // Cliente solo ve sus propios tickets
  if (role === 'cliente') {
    if (action === 'read_own') {
      // Cliente puede leer tickets que él creó
      // Manejar tanto ObjectId como documentos populados
      const ticketCreatorId = ticket.createdBy?._id?.toString() || ticket.createdBy?.toString();
      const currentUserId = user._id.toString();
      return ticketCreatorId === currentUserId;
    }
    if (action === 'create') {
      return true;
    }
    if (action === 'add_comments') {
      // Cliente puede comentar en sus propios tickets
      const ticketCreatorId = ticket.createdBy?._id?.toString() || ticket.createdBy?.toString();
      const currentUserId = user._id.toString();
      return ticketCreatorId === currentUserId;
    }
    return false;
  }

  // Agentes ven tickets asignados
  if (['agente_n1', 'agente_n2'].includes(role)) {
    if (action === 'read_assigned' || action === 'update_assigned' || action === 'add_comments') {
      // Manejar tanto ObjectId como documentos populados
      const ticketAssigneeId = ticket.assignedTo?._id?.toString() || ticket.assignedTo?.toString();
      const currentUserId = user._id.toString();
      return ticketAssigneeId === currentUserId;
    }
    if (action === 'create') {
      return true;
    }
    if (action === 'escalate' && role === 'agente_n2') {
      // Manejar tanto ObjectId como documentos populados
      const ticketAssigneeId = ticket.assignedTo?._id?.toString() || ticket.assignedTo?.toString();
      const currentUserId = user._id.toString();
      return ticketAssigneeId === currentUserId;
    }
    return false;
  }

  // Supervisor ve todos
  if (role === 'supervisor') {
    return true;
  }

  return false;
}

/**
 * CONFIDENCIALIDAD - Verificar acceso a auditoría
 */
function canAccessAuditLogs(user) {
  return ['supervisor', 'administrador'].includes(user.role);
}

/**
 * CONFIDENCIALIDAD - Obtener filtros de tickets según rol
 * Retorna query MongoDB para filtrar tickets visibles
 */
function getTicketFilters(user) {
  const filters = {};

  switch (user.role) {
    case 'cliente':
      // Cliente solo ve sus propios tickets (creados por él)
      filters.createdBy = user._id;
      break;

    case 'agente_n1':
    case 'agente_n2':
      // Agentes ven tickets asignados a ellos
      filters.assignedTo = user._id;
      break;

    case 'supervisor':
    case 'administrador':
      // Supervisor y admin ven todos
      // No aplicar filtros
      break;

    default:
      // Acceso denegado por defecto
      filters._id = null;
  }

  return filters;
}

module.exports = {
  permissions,
  hasPermission,
  getRolePermissions,
  canAccessTicket,
  canAccessAuditLogs,
  getTicketFilters
};
