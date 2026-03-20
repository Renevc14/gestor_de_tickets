/**
 * NO REPUDIO — Controlador de Auditoría
 * Logs inmutables — solo lectura (nunca DELETE ni UPDATE)
 */

const prisma = require('../config/database');

/**
 * GET /api/audit-logs
 */
const listAuditLogs = async (req, res) => {
  try {
    const {
      userId,
      action,
      resource,
      startDate,
      endDate,
      success,
      page = 1,
      limit = 20
    } = req.query;

    const where = {};

    if (userId) where.user_id = parseInt(userId);
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (resource) where.resource = resource;
    if (success !== undefined) where.success = success === 'true';

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { timestamp: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.auditLog.count({ where })
    ]);

    res.status(200).json({
      success: true,
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error listando logs de auditoría:', error);
    res.status(500).json({ success: false, message: 'Error listando logs de auditoría' });
  }
};

/**
 * GET /api/audit-logs/stats
 */
const getAuditStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const [
      totalEvents,
      failedAttempts,
      actionGroups,
      resourceGroups
    ] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.count({ where: { ...where, success: false } }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10
      }),
      prisma.auditLog.groupBy({
        by: ['resource'],
        where,
        _count: { resource: true },
        orderBy: { _count: { resource: 'desc' } }
      })
    ]);

    const actionStats = actionGroups.map(g => ({ action: g.action, count: g._count.action }));
    const resourceStats = resourceGroups.map(g => ({ resource: g.resource, count: g._count.resource }));
    const successRate = totalEvents > 0
      ? ((totalEvents - failedAttempts) / totalEvents * 100).toFixed(2) + '%'
      : 'N/A';

    res.status(200).json({
      success: true,
      stats: { totalEvents, failedAttempts, successRate, actionStats, resourceStats }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo estadísticas' });
  }
};

/**
 * GET /api/audit-logs/:id
 */
const getAuditLog = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true, role: true } } }
    });

    if (!log) {
      return res.status(404).json({ success: false, message: 'Log no encontrado' });
    }

    res.status(200).json({ success: true, log });
  } catch (error) {
    console.error('Error obteniendo log:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo log' });
  }
};

module.exports = { listAuditLogs, getAuditStats, getAuditLog };
