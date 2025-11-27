/**
 * INTEGRIDAD - Componente para Crear Ticket
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketAPI, getStoredUser, clearAuth } from '../services/api';

const CreateTicket = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'soporte_funcional',
    priority: 'media',
    confidentiality: 'interno'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Verificar autenticación
  if (!user) {
    navigate('/login');
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validar campos
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Todos los campos son requeridos');
      setLoading(false);
      return;
    }

    try {
      // INTEGRIDAD - Crear ticket
      const response = await ticketAPI.createTicket(
        formData.title,
        formData.description,
        formData.category,
        formData.priority,
        formData.confidentiality
      );

      // Redirigir al ticket creado
      navigate(`/tickets/${response.data.ticket._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Error creando ticket');
      if (err.response?.status === 401) {
        clearAuth();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="bg-gradient-to-r from-teams-blue to-teams-blue-hover shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-blue-700 rounded-lg transition-colors duration-200"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white">Crear Nuevo Ticket</h1>
                <p className="text-blue-100 text-sm mt-1">Reporte un nuevo incidente</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Error Alert */}
        {error && (
          <div className="alert alert-error mb-8">
            <div className="flex items-start">
              <svg className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="form-group">
              <label className="label">Título del Ticket *</label>
              <div>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  maxLength="200"
                  required
                  placeholder="Resumen breve del problema"
                  className="input"
                />
                <p className="text-xs text-teams-gray-dark mt-2">{formData.title.length}/200 caracteres</p>
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="label">Descripción Detallada *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                placeholder="Describa el problema en detalle, pasos para reproducirlo, ambiente afectado, etc."
                rows="6"
                className="input"
              />
              <p className="text-xs text-teams-gray-dark mt-2">Proporcione la mayor cantidad de detalles posible</p>
            </div>

            {/* Grid: Category and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category */}
              <div className="form-group">
                <label className="label">Categoría *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="input"
                >
                  <option value="soporte_funcional">Soporte Funcional</option>
                  <option value="incidente">Incidente</option>
                  <option value="alarma">Alarma</option>
                </select>
              </div>

              {/* Priority */}
              <div className="form-group">
                <label className="label">Prioridad *</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  required
                  className="input"
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Crítica</option>
                </select>
                <p className="text-xs text-teams-gray-dark mt-2">Seleccione según el impacto en el servicio</p>
              </div>
            </div>

            {/* Confidentiality */}
            <div className="form-group">
              <label className="label">Nivel de Confidencialidad</label>
              <select
                name="confidentiality"
                value={formData.confidentiality}
                onChange={handleChange}
                className="input"
              >
                <option value="publico">Público</option>
                <option value="interno">Interno</option>
                <option value="confidencial">Confidencial</option>
              </select>
              <p className="text-xs text-teams-gray-dark mt-2">Indique si el ticket contiene información sensible</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-6 border-t border-dark-bg-tertiary">
              <button
                type="submit"
                disabled={loading || !formData.title.trim() || !formData.description.trim()}
                className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Crear Ticket
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 btn-secondary"
              >
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
