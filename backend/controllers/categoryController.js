/**
 * CATEGORÍAS — Controlador de Categorías
 * CRUD completo (solo ADMINISTRADOR puede crear/editar/eliminar)
 * Todos los roles autenticados pueden listar
 */

const prisma = require('../config/database');
const { logAuditEvent } = require('../helpers/audit');

/**
 * GET /api/categories
 */
const listCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { tickets: true } } }
    });

    res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error('Error listando categorías:', error);
    res.status(500).json({ success: false, message: 'Error listando categorías' });
  }
};

/**
 * GET /api/categories/:id
 */
const getCategory = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { tickets: true } } }
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
    }

    res.status(200).json({ success: true, category });
  } catch (error) {
    console.error('Error obteniendo categoría:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo categoría' });
  }
};

/**
 * POST /api/categories
 */
const createCategory = async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name || !color) {
      return res.status(400).json({ success: false, message: 'name y color son requeridos' });
    }

    // Validar formato de color hex
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return res.status(400).json({ success: false, message: 'color debe ser un código hex válido (ej: #3B82F6)' });
    }

    const existing = await prisma.category.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Ya existe una categoría con ese nombre' });
    }

    const category = await prisma.category.create({
      data: { name: name.trim(), color }
    });

    await logAuditEvent(req.user.id, 'category_created', 'category', category.id, { name: category.name }, req, true);

    res.status(201).json({ success: true, message: 'Categoría creada', category });
  } catch (error) {
    console.error('Error creando categoría:', error);
    res.status(500).json({ success: false, message: 'Error creando categoría' });
  }
};

/**
 * PATCH /api/categories/:id
 */
const updateCategory = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, color } = req.body;

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
    }

    const updateData = {};
    if (name) {
      // Verificar nombre único (excluyendo la categoría actual)
      const duplicate = await prisma.category.findFirst({ where: { name: name.trim(), NOT: { id } } });
      if (duplicate) {
        return res.status(409).json({ success: false, message: 'Ya existe otra categoría con ese nombre' });
      }
      updateData.name = name.trim();
    }
    if (color) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return res.status(400).json({ success: false, message: 'color debe ser un código hex válido' });
      }
      updateData.color = color;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
    }

    const updated = await prisma.category.update({ where: { id }, data: updateData });

    await logAuditEvent(req.user.id, 'category_updated', 'category', id, updateData, req, true);

    res.status(200).json({ success: true, message: 'Categoría actualizada', category: updated });
  } catch (error) {
    console.error('Error actualizando categoría:', error);
    res.status(500).json({ success: false, message: 'Error actualizando categoría' });
  }
};

/**
 * DELETE /api/categories/:id
 * Solo si no tiene tickets asociados
 */
const deleteCategory = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { tickets: true } } }
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
    }

    if (category._count.tickets > 0) {
      return res.status(409).json({
        success: false,
        message: `No se puede eliminar: la categoría tiene ${category._count.tickets} ticket(s) asociado(s)`
      });
    }

    await prisma.category.delete({ where: { id } });

    await logAuditEvent(req.user.id, 'category_deleted', 'category', id, { name: category.name }, req, true);

    res.status(200).json({ success: true, message: 'Categoría eliminada' });
  } catch (error) {
    console.error('Error eliminando categoría:', error);
    res.status(500).json({ success: false, message: 'Error eliminando categoría' });
  }
};

module.exports = { listCategories, getCategory, createCategory, updateCategory, deleteCategory };
