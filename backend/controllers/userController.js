/**
 * CONTROL DE ACCESO - Controlador de Usuarios
 * Solo accesible por Administradores
 */

const User = require('../models/User');
const { logAuditEvent } = require('../helpers/audit');

/**
 * Listar todos los usuarios
 * GET /api/users
 */
const listUsers = async (req, res) => {
  try {
    const { role, isActive, page = 1, limit = 20 } = req.query;

    const filters = {};
    if (role) filters.role = role;
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    const skip = (page - 1) * limit;

    const users = await User.find(filters)
      .select('-password -mfaSecret -mfaTempSecret -passwordHistory')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filters);

    res.status(200).json({
      success: true,
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listando usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error listando usuarios'
    });
  }
};

/**
 * Obtener un usuario por ID
 * GET /api/users/:id
 */
const getUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select('-password -mfaSecret -mfaTempSecret -passwordHistory');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo usuario'
    });
  }
};

/**
 * Actualizar rol de usuario
 * PUT /api/users/:id/role
 */
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['cliente', 'agente_n1', 'agente_n2', 'supervisor', 'administrador'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Rol inválido. Roles válidos: ${validRoles.join(', ')}`
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // No permitir cambiar el rol del propio admin
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No puede cambiar su propio rol'
      });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    // Registrar en auditoría
    await logAuditEvent(
      req.user._id,
      'user_role_changed',
      'user',
      user._id,
      { oldRole, newRole: role, username: user.username },
      req,
      true
    );

    res.status(200).json({
      success: true,
      message: `Rol de ${user.username} actualizado a ${role}`,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Error actualizando rol:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando rol de usuario'
    });
  }
};

/**
 * Activar/Desactivar usuario
 * PUT /api/users/:id/status
 */
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // No permitir desactivarse a sí mismo
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No puede desactivar su propia cuenta'
      });
    }

    const oldStatus = user.isActive;
    user.isActive = isActive;
    await user.save();

    // Registrar en auditoría
    await logAuditEvent(
      req.user._id,
      isActive ? 'user_activated' : 'user_deactivated',
      'user',
      user._id,
      { username: user.username, oldStatus, newStatus: isActive },
      req,
      true
    );

    res.status(200).json({
      success: true,
      message: `Usuario ${user.username} ${isActive ? 'activado' : 'desactivado'}`,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Error actualizando estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando estado de usuario'
    });
  }
};

module.exports = {
  listUsers,
  getUser,
  updateUserRole,
  updateUserStatus
};
