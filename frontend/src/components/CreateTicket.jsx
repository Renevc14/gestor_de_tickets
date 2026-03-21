/**
 * CreateTicket — Crear nuevo ticket con categorías dinámicas desde API
 * Monografía UCB: category_id FK, prioridades actualizadas
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketAPI, categoryAPI, getStoredUser, clearAuth } from '../services/api';

const CreateTicket = () => {
  const navigate = useNavigate();
  const user = getStoredUser();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    priority: 'MEDIA'
  });
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCats, setLoadingCats] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadCategories();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCategories = async () => {
    try {
      const response = await categoryAPI.listCategories();
      setCategories(response.data.categories);
      if (response.data.categories.length > 0) {
        setFormData(prev => ({ ...prev, category_id: String(response.data.categories[0].id) }));
      }
    } catch {
      setError('Error cargando categorías');
    } finally {
      setLoadingCats(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.title.trim() || !formData.description.trim() || !formData.category_id) {
      setError('Todos los campos son requeridos');
      setLoading(false);
      return;
    }

    try {
      const response = await ticketAPI.createTicket({
        title: formData.title,
        description: formData.description,
        category_id: parseInt(formData.category_id),
        priority: formData.priority
      });

      navigate(`/tickets/${response.data.ticket.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Error creando ticket');
      if (err.response?.status === 401) { clearAuth(); navigate('/login'); }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      <header className="bg-gradient-to-r from-teams-blue to-teams-blue-hover shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-dark-bg-secondary rounded-lg transition-colors">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">Crear Nuevo Ticket</h1>
              <p className="text-indigo-200 text-sm mt-1">Reporte un nuevo incidente o solicitud</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="alert alert-error mb-6">
            <span>{error}</span>
          </div>
        )}

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Título */}
            <div className="form-group">
              <label className="label">Título del Ticket *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                maxLength="100"
                required
                placeholder="Resumen breve del problema"
                className="input"
              />
              <p className="text-xs text-teams-gray-dark mt-1">{formData.title.length}/100 caracteres</p>
            </div>

            {/* Descripción */}
            <div className="form-group">
              <label className="label">Descripción Detallada *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                placeholder="Describa el problema con el mayor detalle posible"
                rows="6"
                className="input"
              />
            </div>

            {/* Categoría + Prioridad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label className="label">Categoría *</label>
                {loadingCats ? (
                  <div className="input animate-pulse bg-dark-bg-secondary"></div>
                ) : (
                  <select name="category_id" value={formData.category_id} onChange={handleChange} required className="input">
                    <option value="">Seleccione una categoría</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label className="label">Prioridad *</label>
                <select name="priority" value={formData.priority} onChange={handleChange} required className="input">
                  <option value="BAJA">Baja (72h SLA)</option>
                  <option value="MEDIA">Media (24h SLA)</option>
                  <option value="ALTA">Alta (8h SLA)</option>
                  <option value="CRITICA">Crítica (2h SLA)</option>
                </select>
                <p className="text-xs text-teams-gray-dark mt-1">Seleccione según el impacto en el servicio</p>
              </div>
            </div>

            {/* Indicador de categoría seleccionada */}
            {formData.category_id && (
              <div className="flex items-center gap-2">
                {categories.find(c => String(c.id) === formData.category_id) && (
                  <>
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: categories.find(c => String(c.id) === formData.category_id)?.color }}></span>
                    <span className="text-sm text-dark-secondary">
                      {categories.find(c => String(c.id) === formData.category_id)?.name}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-3 pt-6 border-t border-dark-bg-tertiary">
              <button
                type="submit"
                disabled={loading || !formData.title.trim() || !formData.description.trim() || !formData.category_id}
                className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <><div className="spinner w-4 h-4"></div> Creando...</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> Crear Ticket</>
                )}
              </button>
              <button type="button" onClick={() => navigate('/dashboard')} className="flex-1 btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default CreateTicket;
