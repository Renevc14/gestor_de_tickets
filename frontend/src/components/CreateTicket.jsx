/**
 * INTEGRIDAD - Componente para Crear Ticket
 * Diseno inspirado en Jira Dark Mode
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

  // Verificar autenticacion
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

  // Configuracion de prioridades con colores
  const priorityConfig = {
    baja: { color: 'text-jira-text-subtle', bg: 'bg-jira-bg-hover', icon: '↓' },
    media: { color: 'text-jira-yellow', bg: 'bg-jira-yellow/10', icon: '→' },
    alta: { color: 'text-jira-orange', bg: 'bg-jira-orange/10', icon: '↑' },
    critica: { color: 'text-jira-red', bg: 'bg-jira-red/10', icon: '⚡' }
  };

  // Configuracion de categorias con iconos
  const categoryConfig = {
    soporte_funcional: { icon: '🔧', label: 'Soporte Funcional' },
    incidente: { icon: '⚠️', label: 'Incidente' },
    alarma: { icon: '🚨', label: 'Alarma' }
  };

  // Configuracion de confidencialidad
  const confidentialityConfig = {
    publico: { icon: '🌐', label: 'Publico', desc: 'Visible para todos' },
    interno: { icon: '🏢', label: 'Interno', desc: 'Solo personal autorizado' },
    confidencial: { icon: '🔒', label: 'Confidencial', desc: 'Acceso restringido' }
  };

  return (
    <div className="min-h-screen bg-jira-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-jira-bg-card/95 backdrop-blur-sm border-b border-jira-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-jira-bg-hover rounded-lg transition-all duration-200 group"
              >
                <svg className="w-5 h-5 text-jira-text-subtle group-hover:text-jira-blue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-jira-text flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-jira-blue to-jira-purple flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </span>
                  Crear Nuevo Ticket
                </h1>
                <p className="text-jira-text-subtle text-sm mt-0.5">Reporte un nuevo incidente o solicitud</p>
              </div>
            </div>

            {/* User Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-jira-bg-hover rounded-full">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-jira-green to-jira-teal flex items-center justify-center">
                <span className="text-xs font-bold text-white">{user.username?.charAt(0).toUpperCase()}</span>
              </div>
              <span className="text-sm text-jira-text-subtle">{user.username}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Progress Indicator */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-jira-blue text-white flex items-center justify-center text-sm font-semibold">1</span>
              <span className="text-sm text-jira-text font-medium">Informacion del Ticket</span>
            </div>
            <div className="flex-1 h-0.5 bg-jira-border" />
            <div className="flex items-center gap-2 opacity-40">
              <span className="w-8 h-8 rounded-full bg-jira-bg-hover text-jira-text-subtle flex items-center justify-center text-sm font-semibold border border-jira-border">2</span>
              <span className="text-sm text-jira-text-subtle">Confirmacion</span>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error mb-6 animate-scale-in">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Form Card */}
        <div className="card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="form-group">
                <label className="label">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-jira-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    Titulo del Ticket
                    <span className="text-jira-red">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  maxLength="200"
                  required
                  placeholder="Ej: Error al procesar pagos en modulo de facturacion"
                  className="input"
                  autoFocus
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-jira-text-subtlest">Resuma el problema en una linea clara</p>
                  <span className={`text-xs font-mono ${formData.title.length > 180 ? 'text-jira-orange' : 'text-jira-text-subtlest'}`}>
                    {formData.title.length}/200
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="label">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-jira-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    Descripcion Detallada
                    <span className="text-jira-red">*</span>
                  </span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  placeholder="Describa el problema en detalle:&#10;- Pasos para reproducirlo&#10;- Comportamiento esperado vs actual&#10;- Ambiente afectado (produccion, desarrollo, etc.)&#10;- Impacto en el negocio"
                  rows="6"
                  className="input resize-none"
                />
                <p className="text-xs text-jira-text-subtlest mt-2">
                  Cuanta mas informacion proporcione, mas rapido podremos resolver su caso
                </p>
              </div>

              {/* Category and Priority Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category */}
                <div className="form-group">
                  <label className="label">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-jira-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Categoria
                      <span className="text-jira-red">*</span>
                    </span>
                  </label>
                  <div className="space-y-2">
                    {Object.entries(categoryConfig).map(([key, config]) => (
                      <label
                        key={key}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                          formData.category === key
                            ? 'border-jira-blue bg-jira-blue-subtle'
                            : 'border-jira-border hover:border-jira-border-bold hover:bg-jira-bg-hover'
                        }`}
                      >
                        <input
                          type="radio"
                          name="category"
                          value={key}
                          checked={formData.category === key}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <span className="text-lg">{config.icon}</span>
                        <span className={`text-sm font-medium ${formData.category === key ? 'text-jira-blue' : 'text-jira-text'}`}>
                          {config.label}
                        </span>
                        {formData.category === key && (
                          <svg className="w-4 h-4 text-jira-blue ml-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Priority */}
                <div className="form-group">
                  <label className="label">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-jira-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                      </svg>
                      Prioridad
                      <span className="text-jira-red">*</span>
                    </span>
                  </label>
                  <div className="space-y-2">
                    {Object.entries(priorityConfig).map(([key, config]) => (
                      <label
                        key={key}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                          formData.priority === key
                            ? `border-current ${config.bg} ${config.color}`
                            : 'border-jira-border hover:border-jira-border-bold hover:bg-jira-bg-hover'
                        }`}
                      >
                        <input
                          type="radio"
                          name="priority"
                          value={key}
                          checked={formData.priority === key}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <span className={`w-6 h-6 rounded flex items-center justify-center text-sm ${formData.priority === key ? config.bg : 'bg-jira-bg-hover'}`}>
                          {config.icon}
                        </span>
                        <span className={`text-sm font-medium capitalize ${formData.priority === key ? config.color : 'text-jira-text'}`}>
                          {key}
                        </span>
                        {formData.priority === key && (
                          <svg className={`w-4 h-4 ml-auto ${config.color}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-jira-text-subtlest mt-2">Seleccione segun el impacto en el servicio</p>
                </div>
              </div>

              {/* Confidentiality */}
              <div className="form-group">
                <label className="label">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-jira-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Nivel de Confidencialidad
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {Object.entries(confidentialityConfig).map(([key, config]) => (
                    <label
                      key={key}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all duration-200 text-center ${
                        formData.confidentiality === key
                          ? 'border-jira-blue bg-jira-blue-subtle'
                          : 'border-jira-border hover:border-jira-border-bold hover:bg-jira-bg-hover'
                      }`}
                    >
                      <input
                        type="radio"
                        name="confidentiality"
                        value={key}
                        checked={formData.confidentiality === key}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <span className="text-2xl">{config.icon}</span>
                      <span className={`text-sm font-medium ${formData.confidentiality === key ? 'text-jira-blue' : 'text-jira-text'}`}>
                        {config.label}
                      </span>
                      <span className="text-xs text-jira-text-subtlest">{config.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Preview Card */}
              {(formData.title || formData.description) && (
                <div className="p-4 rounded-lg bg-jira-bg border border-jira-border animate-fade-in">
                  <div className="flex items-center gap-2 mb-3 text-jira-text-subtle text-xs font-medium uppercase tracking-wide">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Vista Previa
                  </div>
                  <div className="flex items-start gap-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityConfig[formData.priority].bg} ${priorityConfig[formData.priority].color}`}>
                      {formData.priority.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-jira-text font-medium truncate">
                        {formData.title || 'Sin titulo'}
                      </h4>
                      <p className="text-jira-text-subtle text-sm mt-1 line-clamp-2">
                        {formData.description || 'Sin descripcion'}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-jira-text-subtlest">
                        <span>{categoryConfig[formData.category].icon} {categoryConfig[formData.category].label}</span>
                        <span>{confidentialityConfig[formData.confidentiality].icon} {confidentialityConfig[formData.confidentiality].label}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-6 border-t border-jira-border">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="btn-secondary flex-1 py-3"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.title.trim() || !formData.description.trim()}
                  className="btn-primary flex-1 py-3"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creando ticket...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Crear Ticket
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-6 p-4 rounded-lg bg-jira-bg-card border border-jira-border animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-jira-blue-subtle flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-jira-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-jira-text mb-1">Consejos para un mejor ticket</h4>
              <ul className="text-xs text-jira-text-subtle space-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-jira-blue" />
                  Use un titulo descriptivo que resuma el problema
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-jira-blue" />
                  Incluya pasos para reproducir el error
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-jira-blue" />
                  Mencione el ambiente afectado (produccion, staging, desarrollo)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-jira-blue" />
                  Seleccione la prioridad correcta segun el impacto real
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateTicket;
