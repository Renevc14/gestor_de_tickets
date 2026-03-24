/**
 * RF06 — Controlador de Reportes y Métricas
 * Datos para Chart.js en el frontend
 * Solo accesible por ADMINISTRADOR
 */

const prisma = require('../config/database');
const ExcelJS = require('exceljs');

/**
 * GET /api/reports/dashboard
 * Resumen general: tickets por estado, prioridad, SLA breaches
 */
const getDashboard = async (req, res) => {
  try {
    const now = new Date();

    const [
      ticketsByStatus,
      ticketsByPriority,
      ticketsByCategory,
      slaBreaches,
      recentTickets
    ] = await Promise.all([
      // Tickets por estado
      prisma.ticket.groupBy({
        by: ['status'],
        _count: { status: true }
      }),
      // Tickets por prioridad
      prisma.ticket.groupBy({
        by: ['priority'],
        _count: { priority: true }
      }),
      // Tickets por categoría
      prisma.ticket.groupBy({
        by: ['category_id'],
        _count: { category_id: true }
      }),
      // SLA breaches: tickets con deadline pasado no resueltos/cerrados
      prisma.ticket.count({
        where: {
          sla_deadline: { lt: now },
          status: { notIn: ['RESUELTO', 'CERRADO'] }
        }
      }),
      // Últimos 10 tickets
      prisma.ticket.findMany({
        take: 10,
        orderBy: { created_at: 'desc' },
        include: {
          creator: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, color: true } }
        }
      })
    ]);

    // Derivar totales del groupBy (misma fuente que los gráficos → siempre consistente)
    const statusRows = ticketsByStatus.map(t => ({ status: t.status, count: Number(t._count.status) }));
    const totalTickets   = statusRows.reduce((sum, r) => sum + r.count, 0);
    const resolvedTickets = statusRows
      .filter(r => ['RESUELTO', 'CERRADO'].includes(r.status))
      .reduce((sum, r) => sum + r.count, 0);

    // Obtener nombres de categorías
    const categories = await prisma.category.findMany({ select: { id: true, name: true, color: true } });
    const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]));

    const ticketsByCategoryNamed = ticketsByCategory.map(item => ({
      category: categoryMap[item.category_id]?.name || 'Sin categoria',
      color: categoryMap[item.category_id]?.color || '#9CA3AF',
      count: Number(item._count.category_id)
    }));

    console.log('[reports/dashboard] statusRows:', JSON.stringify(statusRows));
    console.log('[reports/dashboard] summary → total:', totalTickets, 'resolved:', resolvedTickets, 'sla:', Number(slaBreaches));

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total:       totalTickets,
          resolved:    resolvedTickets,
          open:        totalTickets - resolvedTickets,
          slaBreaches: Number(slaBreaches)
        },
        ticketsByStatus: statusRows,
        ticketsByPriority: ticketsByPriority.map(t => ({ priority: t.priority, count: Number(t._count.priority) })),
        ticketsByCategory: ticketsByCategoryNamed,
        recentTickets
      }
    });
  } catch (error) {
    console.error('Error obteniendo dashboard:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo datos del dashboard' });
  }
};

/**
 * GET /api/reports/by-tech
 * Carga de trabajo por técnico: cantidad de tickets asignados y resueltos
 */
const getByTech = async (req, res) => {
  try {
    const techs = await prisma.user.findMany({
      where: { role: 'TECNICO' },
      select: {
        id: true,
        name: true,
        email: true,
        _count: { select: { tickets_assigned: true } }
      }
    });

    const techStats = await Promise.all(
      techs.map(async (tech) => {
        const [assigned, resolved, inProcess] = await Promise.all([
          prisma.ticket.count({ where: { tech_id: tech.id } }),
          prisma.ticket.count({ where: { tech_id: tech.id, status: { in: ['RESUELTO', 'CERRADO'] } } }),
          prisma.ticket.count({ where: { tech_id: tech.id, status: 'EN_PROCESO' } })
        ]);

        return {
          id: tech.id,
          name: tech.name,
          email: tech.email,
          assigned,
          resolved,
          inProcess,
          pending: assigned - resolved - inProcess
        };
      })
    );

    res.status(200).json({ success: true, data: techStats });
  } catch (error) {
    console.error('Error obteniendo reporte por técnico:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo reporte por técnico' });
  }
};

/**
 * GET /api/reports/by-category
 * Distribución de tickets por categoría
 */
const getByCategory = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { tickets: true } },
        tickets: {
          select: { status: true, priority: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const data = categories.map(cat => {
      const statusCounts = {};
      const priorityCounts = {};

      cat.tickets.forEach(t => {
        statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
        priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
      });

      return {
        id: cat.id,
        name: cat.name,
        color: cat.color,
        total: cat._count.tickets,
        byStatus: statusCounts,
        byPriority: priorityCounts
      };
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error obteniendo reporte por categoría:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo reporte por categoría' });
  }
};

/**
 * GET /api/reports/resolution-time
 * Tiempo promedio de resolución por prioridad (en horas)
 */
const getResolutionTime = async (req, res) => {
  try {
    const resolved = await prisma.ticket.findMany({
      where: {
        status: { in: ['RESUELTO', 'CERRADO'] },
        resolved_at: { not: null }
      },
      select: { priority: true, created_at: true, resolved_at: true }
    });

    const byPriority = {};
    for (const ticket of resolved) {
      const hours = (ticket.resolved_at - ticket.created_at) / (1000 * 60 * 60);
      if (!byPriority[ticket.priority]) {
        byPriority[ticket.priority] = { total: 0, count: 0 };
      }
      byPriority[ticket.priority].total += hours;
      byPriority[ticket.priority].count += 1;
    }

    const data = Object.entries(byPriority).map(([priority, stats]) => ({
      priority,
      avgHours: stats.count > 0 ? (stats.total / stats.count).toFixed(2) : 0,
      count: stats.count
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error obteniendo tiempo de resolución:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo tiempo de resolución' });
  }
};

/**
 * GET /api/reports/export
 * Exporta tickets y metricas por tecnico a un archivo Excel (.xlsx)
 * Solo ADMINISTRADOR
 */
const exportToExcel = async (req, res) => {
  try {
    const [tickets, techs, categories] = await Promise.all([
      prisma.ticket.findMany({
        orderBy: { created_at: 'desc' },
        include: {
          creator: { select: { name: true, email: true } },
          assignee: { select: { name: true } },
          category: { select: { name: true } }
        }
      }),
      prisma.user.findMany({
        where: { role: 'TECNICO' },
        select: { id: true, name: true, email: true }
      }),
      prisma.category.findMany({ select: { id: true, name: true } })
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TicketFlow';
    workbook.created = new Date();

    // ── Hoja 1: Tickets ─────────────────────────────────────────────────────
    const sheetTickets = workbook.addWorksheet('Tickets');

    sheetTickets.columns = [
      { header: 'ID',          key: 'id',          width: 8  },
      { header: 'Titulo',      key: 'title',       width: 40 },
      { header: 'Estado',      key: 'status',      width: 14 },
      { header: 'Prioridad',   key: 'priority',    width: 12 },
      { header: 'Categoria',   key: 'category',    width: 18 },
      { header: 'Solicitante', key: 'requester',   width: 24 },
      { header: 'Tecnico',     key: 'tech',        width: 24 },
      { header: 'Creado',      key: 'created_at',  width: 20 },
      { header: 'Resuelto',    key: 'resolved_at', width: 20 },
      { header: 'Cerrado',     key: 'closed_at',   width: 20 }
    ];

    // Cabecera en negrita con fondo gris
    sheetTickets.getRow(1).font = { bold: true };
    sheetTickets.getRow(1).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FFD9D9D9' }
    };

    for (const t of tickets) {
      sheetTickets.addRow({
        id:          t.id,
        title:       t.title,
        status:      t.status,
        priority:    t.priority,
        category:    t.category?.name || '',
        requester:   t.creator?.name || '',
        tech:        t.assignee?.name || '',
        created_at:  t.created_at ? new Date(t.created_at).toLocaleString('es-ES') : '',
        resolved_at: t.resolved_at ? new Date(t.resolved_at).toLocaleString('es-ES') : '',
        closed_at:   t.closed_at  ? new Date(t.closed_at).toLocaleString('es-ES') : ''
      });
    }

    // ── Hoja 2: Metricas por tecnico ─────────────────────────────────────────
    const sheetTechs = workbook.addWorksheet('Carga por Tecnico');

    sheetTechs.columns = [
      { header: 'Tecnico',    key: 'name',      width: 28 },
      { header: 'Email',      key: 'email',     width: 30 },
      { header: 'Asignados',  key: 'assigned',  width: 14 },
      { header: 'En Proceso', key: 'inProcess', width: 14 },
      { header: 'Resueltos',  key: 'resolved',  width: 14 },
      { header: 'Pendientes', key: 'pending',   width: 14 }
    ];

    sheetTechs.getRow(1).font = { bold: true };
    sheetTechs.getRow(1).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FFD9D9D9' }
    };

    for (const tech of techs) {
      const [assigned, inProcess, resolved] = await Promise.all([
        prisma.ticket.count({ where: { tech_id: tech.id } }),
        prisma.ticket.count({ where: { tech_id: tech.id, status: 'EN_PROCESO' } }),
        prisma.ticket.count({ where: { tech_id: tech.id, status: { in: ['RESUELTO', 'CERRADO'] } } })
      ]);
      sheetTechs.addRow({
        name: tech.name,
        email: tech.email,
        assigned,
        inProcess,
        resolved,
        pending: assigned - inProcess - resolved
      });
    }

    // ── Hoja 3: Resumen por categoria ────────────────────────────────────────
    const sheetCats = workbook.addWorksheet('Por Categoria');

    sheetCats.columns = [
      { header: 'Categoria', key: 'name',  width: 24 },
      { header: 'Total',     key: 'total', width: 12 }
    ];

    sheetCats.getRow(1).font = { bold: true };
    sheetCats.getRow(1).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FFD9D9D9' }
    };

    for (const cat of categories) {
      const count = await prisma.ticket.count({ where: { category_id: cat.id } });
      sheetCats.addRow({ name: cat.name, total: count });
    }

    // ── Enviar respuesta ─────────────────────────────────────────────────────
    const filename = `reporte-tickets-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exportando Excel:', error);
    res.status(500).json({ success: false, message: 'Error generando el reporte' });
  }
};

module.exports = { getDashboard, getByTech, getByCategory, getResolutionTime, exportToExcel };
