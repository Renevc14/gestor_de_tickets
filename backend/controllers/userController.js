/**
 * ADMINISTRACIÓN — Controlador de Usuarios
 * Solo accesible por ADMINISTRADOR
 */

const bcrypt = require('bcrypt');
const prisma = require('../config/database');
const { logAuditEvent } = require('../helpers/audit');
const { securityConfig } = require('../config/security');

/**
 * GET /api/users
 */
const listUsers = async (req, res) => {
  try {
    const { role, status, page = 1, limit = 20 } = req.query;

    const where = {};
    if (role) where.role = role;
    if (status) where.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, role: true, status: true,
          mfa_enabled: true, last_login: true, created_at: true,
          login_attempts: true, lock_until: true
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.user.count({ where })
    ]);

    res.status(200).json({
      success: true,
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error listando usuarios:', error);
    res.status(500).json({ success: false, message: 'Error listando usuarios' });
  }
};

/**
 * GET /api/users/:id
 */
const getUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, role: true, status: true,
        mfa_enabled: true, last_login: true, created_at: true,
        login_attempts: true, lock_until: true,
        _count: { select: { tickets_created: true, tickets_assigned: true } }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo usuario' });
  }
};

/**
 * POST /api/users
 * Crear usuario (admin crea con rol especificado)
 */
const createUser = async (req, res) => {
  try {
    const { name, email, password, role = 'SOLICITANTE' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'name, email y password son requeridos' });
    }

    const validRoles = ['SOLICITANTE', 'TECNICO', 'ADMINISTRADOR'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: `role debe ser uno de: ${validRoles.join(', ')}` });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, securityConfig.encryption.saltRounds);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role,
        status: 'ACTIVO',
        password_history: JSON.stringify([hashedPassword])
      },
      select: { id: true, name: true, email: true, role: true, status: true, created_at: true }
    });

    await logAuditEvent(req.user.id, 'user_created', 'user', user.id, { email: user.email, role }, req, true);

    res.status(201).json({ success: true, message: 'Usuario creado exitosamente', user });
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ success: false, message: 'Error creando usuario' });
  }
};

/**
 * PATCH /api/users/:id
 * Actualizar usuario (nombre, rol, estado)
 */
const updateUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, role, status } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // No permitir desactivar al admin que hace la solicitud
    if (id === req.user.id && status === 'INACTIVO') {
      return res.status(400).json({ success: false, message: 'No puede desactivar su propia cuenta' });
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (role) {
      const validRoles = ['SOLICITANTE', 'TECNICO', 'ADMINISTRADOR'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ success: false, message: `role debe ser uno de: ${validRoles.join(', ')}` });
      }
      updateData.role = role;
    }
    if (status) {
      if (!['ACTIVO', 'INACTIVO'].includes(status)) {
        return res.status(400).json({ success: false, message: 'status debe ser ACTIVO o INACTIVO' });
      }
      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'No hay campos válidos para actualizar' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, status: true, updated_at: true }
    });

    await logAuditEvent(req.user.id, 'user_updated', 'user', id, updateData, req, true);

    res.status(200).json({ success: true, message: 'Usuario actualizado', user: updated });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ success: false, message: 'Error actualizando usuario' });
  }
};

/**
 * POST /api/users/:id/unlock
 * Desbloquear cuenta
 */
const unlockUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    await prisma.user.update({
      where: { id },
      data: { login_attempts: 0, lock_until: null }
    });

    await logAuditEvent(req.user.id, 'user_unlocked', 'user', id, {}, req, true);

    res.status(200).json({ success: true, message: 'Cuenta desbloqueada' });
  } catch (error) {
    console.error('Error desbloqueando usuario:', error);
    res.status(500).json({ success: false, message: 'Error desbloqueando usuario' });
  }
};

/**
 * GET /api/users/technicians
 * Lista técnicos activos (para asignación)
 */
const listTechnicians = async (req, res) => {
  try {
    const technicians = await prisma.user.findMany({
      where: { role: 'TECNICO', status: 'ACTIVO' },
      select: {
        id: true, name: true, email: true,
        _count: { select: { tickets_assigned: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.status(200).json({ success: true, technicians });
  } catch (error) {
    console.error('Error listando técnicos:', error);
    res.status(500).json({ success: false, message: 'Error listando técnicos' });
  }
};

module.exports = { listUsers, getUser, createUser, updateUser, unlockUser, listTechnicians };
