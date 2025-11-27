/**
 * NO REPUDIO - Controlador de Auditoría
 * Maneja la consulta de logs de auditoría (inmutables)
 */

const AuditLog = require('../models/AuditLog');

/**
 * NO REPUDIO - Listar logs de auditoría con filtros
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
      page = 1,
      limit = 20,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    // Construir filtros
    const filters = {};

    if (userId) {
      filters.user = userId;
    }

    if (action) {
      filters.action = action;
    }

    if (resource) {
      filters.resource = resource;
    }

    // Filtrar por rango de fechas
    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) {
        filters.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        filters.timestamp.$lte = new Date(endDate);
      }
    }

    // Calcular skip para paginación
    const skip = (page - 1) * limit;

    // Definir orden
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Obtener logs
    const logs = await AuditLog.find(filters)
      .populate('user', 'username email role')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Contar total
    const total = await AuditLog.countDocuments(filters);

    res.status(200).json({
      success: true,
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listando logs de auditoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error listando logs de auditoría'
    });
  }
};

/**
 * NO REPUDIO - Obtener estadísticas de auditoría
 * GET /api/audit-logs/stats
 */
const getAuditStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Construir filtro de fecha
    const filters = {};
    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) {
        filters.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        filters.timestamp.$lte = new Date(endDate);
      }
    }

    // Contar por acción
    const actionStats = await AuditLog.aggregate([
      { $match: filters },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Contar por recurso
    const resourceStats = await AuditLog.aggregate([
      { $match: filters },
      { $group: { _id: '$resource', count: { $sum: 1 } } }
    ]);

    // Contar por usuario
    const userStats = await AuditLog.aggregate([
      { $match: filters },
      { $group: { _id: '$user', count: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userInfo' } },
      { $unwind: '$userInfo' },
      { $project: { username: '$userInfo.username', count: 1 } },
      { $sort: { count: -1 } }
    ]);

    // Contar intentos fallidos
    const failedAttempts = await AuditLog.countDocuments({
      ...filters,
      success: false
    });

    // Total de eventos
    const totalEvents = await AuditLog.countDocuments(filters);

    res.status(200).json({
      success: true,
      stats: {
        totalEvents,
        failedAttempts,
        successRate: totalEvents > 0 ? ((totalEvents - failedAttempts) / totalEvents * 100).toFixed(2) + '%' : 'N/A',
        actionStats,
        resourceStats,
        userStats
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas'
    });
  }
};

/**
 * NO REPUDIO - Obtener un log específico
 * GET /api/audit-logs/:id
 */
const getAuditLog = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await AuditLog.findById(id).populate('user', 'username email role');

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Log no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      log
    });
  } catch (error) {
    console.error('Error obteniendo log:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo log'
    });
  }
};

module.exports = {
  listAuditLogs,
  getAuditStats,
  getAuditLog
};
