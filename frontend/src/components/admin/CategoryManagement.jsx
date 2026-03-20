/**
 * CategoryManagement — Gestión de categorías (solo ADMINISTRADOR)
 * Crear, editar, eliminar categorías con color hex
 */

import React, { useState, useEffect } from 'react';
import { categoryAPI } from '../../services/api';

// ─── Modal Crear/Editar Categoría ───────────────────────────────────────────
const CategoryModal = ({ category, onClose, onSaved }) => {
  const isEdit = !!category;
  const [form, setForm] = useState({
    name: category?.name || '',
    color: category?.color || '#3B82F6'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEdit) {
        await categoryAPI.updateCategory(category.id, form);
      } else {
        await categoryAPI.createCategory(form);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || `Error ${isEdit ? 'actualizando' : 'creando'} categoría`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="card w-full max-w-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">{isEdit ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
          <button onClick={onClose} className="text-dark-secondary hover:text-white">✕</button>
        </div>

        {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="label">Nombre *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              required
              maxLength="50"
              className="input"
              placeholder="Ej: Software, Hardware..."
            />
          </div>

          <div className="form-group">
            <label className="label">Color *</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.color}
                onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                className="w-12 h-10 rounded cursor-pointer border border-dark-bg-secondary bg-transparent"
              />
              <input
                type="text"
                value={form.color}
                onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                pattern="^#[0-9A-Fa-f]{6}$"
                placeholder="#3B82F6"
                className="input flex-1"
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: form.color }}></span>
              <span className="text-sm text-dark-secondary">{form.name || 'Vista previa'}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="flex-1 btn-primary disabled:opacity-50">
              {loading ? 'Guardando...' : (isEdit ? 'Guardar Cambios' : 'Crear Categoría')}
            </button>
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Componente principal ────────────────────────────────────────────────────
const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCat, setEditCat] = useState(null);

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await categoryAPI.listCategories();
      setCategories(response.data.categories);
    } catch {
      setError('Error cargando categorías');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cat) => {
    if (cat._count?.tickets > 0) {
      setError(`No se puede eliminar "${cat.name}": tiene ${cat._count.tickets} ticket(s) asociado(s)`);
      return;
    }
    if (!window.confirm(`¿Eliminar la categoría "${cat.name}"?`)) return;

    try {
      await categoryAPI.deleteCategory(cat.id);
      loadCategories();
    } catch (err) {
      setError(err.response?.data?.message || 'Error eliminando categoría');
    }
  };

  const openCreate = () => { setEditCat(null); setShowModal(true); };
  const openEdit = (cat) => { setEditCat(cat); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditCat(null); };

  return (
    <div className="space-y-6">
      {showModal && (
        <CategoryModal
          category={editCat}
          onClose={closeModal}
          onSaved={loadCategories}
        />
      )}

      {/* Encabezado */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Gestión de Categorías</h2>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Categoría
          </button>
        </div>
        <p className="text-dark-secondary text-sm mt-2">
          Las categorías definen el tipo de solicitud y ayudan a clasificar y enrutar tickets.
        </p>
      </div>

      {error && (
        <div className="alert alert-error flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-200 hover:text-white">✕</button>
        </div>
      )}

      {loading ? (
        <div className="card text-center py-8"><div className="spinner mx-auto mb-2"></div><p className="text-dark-secondary">Cargando categorías...</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <div key={cat.id} className="card border-l-4" style={{ borderLeftColor: cat.color }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: cat.color }}>
                    {cat.name.charAt(0)}
                  </span>
                  <div>
                    <p className="text-white font-semibold">{cat.name}</p>
                    <p className="text-dark-secondary text-xs mt-0.5">{cat._count?.tickets || 0} ticket(s)</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(cat)} className="p-1.5 bg-teams-blue hover:bg-teams-blue-hover text-white rounded text-xs transition-colors">
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    disabled={cat._count?.tickets > 0}
                    className="p-1.5 bg-red-700 hover:bg-red-600 text-white rounded text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={cat._count?.tickets > 0 ? 'Tiene tickets asociados' : 'Eliminar'}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-dark-secondary font-mono">{cat.color}</span>
                <span className="w-4 h-4 rounded" style={{ backgroundColor: cat.color }}></span>
              </div>
            </div>
          ))}

          {categories.length === 0 && (
            <div className="col-span-3 text-center py-12 text-dark-secondary">
              <p className="text-lg">No hay categorías</p>
              <p className="text-sm mt-1">Cree la primera categoría para comenzar</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
