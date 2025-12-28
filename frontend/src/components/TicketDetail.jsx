/**
 * INTEGRIDAD - Componente Detalle de Ticket
 * Muestra informacion completa del ticket con historial, comentarios y adjuntos
 * Diseno inspirado en Jira Dark Mode
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ticketAPI, getStoredUser, clearAuth } from '../services/api';

const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getStoredUser();

  const [ticket, setTicket] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadTicket();
    loadAssignableUsers();
  }, [id]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      setError('');
      const [ticketRes, historyRes] = await Promise.all([
        ticketAPI.getTicket(id),
        ticketAPI.getHistory(id)
      ]);
      setTicket(ticketRes.data.ticket);
      setHistory(historyRes.data.history);
      setEditData(ticketRes.data.ticket);
    } catch (err) {
      console.error('Error cargando ticket:', err);
      if (err.response?.status === 401) {
        setError('Sesion expirada');
        clearAuth();
        navigate('/login');
      } else if (err.response?.status === 403) {
        setError('No tiene acceso a este ticket');
        setTimeout(() => navigate('/dashboard'), 2000);
      } else if (err.response?.status === 404) {
        setError('Ticket no encontrado');
      } else {
        setError(err.response?.data?.message || 'Error cargando ticket');
      }
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignableUsers = async () => {
    // Todos pueden reasignar excepto clientes
    if (user?.role === 'cliente') return;
    try {
      const response = await ticketAPI.getAssignableUsers();
      setAssignableUsers(response.data.users || []);
    } catch (err) {
      console.error('Error cargando usuarios asignables:', err);
    }
  };

  const handleStartEditing = () => {
    setEditing(true);
    setEditData({
      ...ticket,
      assignedTo: ticket.assignedTo?._id || ''
    });
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);

    try {
      const response = await ticketAPI.addComment(id, comment);
      setComment('');
      // Actualizar solo los comentarios y el historial sin recargar todo
      setTicket(prev => ({
        ...prev,
        comments: response.data.comments
      }));
      setHistory(response.data.history);
    } catch (err) {
      setError('Error al agregar comentario');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const updateData = {
        title: editData.title,
        description: editData.description,
        priority: editData.priority,
        status: editData.status
      };

      // Solo supervisores y admin pueden reasignar
      if (['supervisor', 'administrador'].includes(user?.role) && editData.assignedTo !== ticket.assignedTo?._id) {
        updateData.assignedTo = editData.assignedTo;
      }

      await ticketAPI.updateTicket(id, updateData);
      setEditing(false);
      loadTicket();
    } catch (err) {
      setError('Error al actualizar ticket');
    } finally {
      setSubmitting(false);
    }
  };

  // Funcion para reasignar ticket directamente
  const handleReassign = async (newAssigneeId) => {
    if (newAssigneeId === (ticket.assignedTo?._id || '')) return;
    setSubmitting(true);
    try {
      const response = await ticketAPI.updateTicket(id, { assignedTo: newAssigneeId || null });
      setTicket(response.data.ticket);
      // Recargar historial
      const historyRes = await ticketAPI.getHistory(id);
      setHistory(historyRes.data.history);
    } catch (err) {
      console.error('Error reasignando:', err.response?.data || err);
      setError(err.response?.data?.message || 'Error al reasignar ticket');
    } finally {
      setSubmitting(false);
    }
  };

  // Configuracion de estados
  const statusConfig = {
    abierto: { color: 'text-jira-blue', bg: 'bg-jira-blue/10', icon: '📬' },
    en_proceso: { color: 'text-jira-purple', bg: 'bg-jira-purple/10', icon: '🔄' },
    resuelto: { color: 'text-jira-green', bg: 'bg-jira-green/10', icon: '✅' },
    cerrado: { color: 'text-jira-text-subtle', bg: 'bg-jira-bg-hover', icon: '🔒' }
  };

  // Configuracion de prioridades
  const priorityConfig = {
    critica: { color: 'text-jira-red', bg: 'bg-jira-red/10', icon: '🔴' },
    alta: { color: 'text-jira-orange', bg: 'bg-jira-orange/10', icon: '🟠' },
    media: { color: 'text-jira-yellow', bg: 'bg-jira-yellow/10', icon: '🟡' },
    baja: { color: 'text-jira-green', bg: 'bg-jira-green/10', icon: '🟢' }
  };

  // Configuracion de confidencialidad
  const confidentialityConfig = {
    publico: { icon: '🌐', label: 'Publico' },
    interno: { icon: '🏢', label: 'Interno' },
    confidencial: { icon: '🔒', label: 'Confidencial' }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-jira-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-jira-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-jira-text-subtle">Cargando ticket...</p>
        </div>
      </div>
    );
  }

  // Error or not found state
  if (!ticket) {
    return (
      <div className="min-h-screen bg-jira-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-jira-red/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-jira-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-jira-text mb-2">{error || 'Ticket no encontrado'}</h2>
          <button onClick={() => navigate('/dashboard')} className="btn-primary mt-4">
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentStatus = statusConfig[ticket.status] || statusConfig.abierto;
  const currentPriority = priorityConfig[ticket.priority] || priorityConfig.media;
  const currentConfidentiality = confidentialityConfig[ticket.confidentiality] || confidentialityConfig.interno;

  return (
    <div className="min-h-screen bg-jira-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-jira-bg-card/95 backdrop-blur-sm border-b border-jira-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
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
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 bg-jira-blue-subtle text-jira-blue text-sm font-mono rounded">
                    {ticket.ticketNumber}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${currentStatus.bg} ${currentStatus.color}`}>
                    {currentStatus.icon} {ticket.status?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <h1 className="text-lg font-semibold text-jira-text mt-1 line-clamp-1">{ticket.title}</h1>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2">
              {!editing && ['agente_n1', 'agente_n2', 'supervisor', 'administrador'].includes(user?.role) && (
                <button
                  onClick={handleStartEditing}
                  className="btn-secondary"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 pt-6">
          <div className="alert alert-error animate-scale-in">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">{error}</span>
            <button onClick={() => setError('')} className="ml-auto p-1 hover:bg-jira-red/20 rounded">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket Information Card */}
            <div className="card animate-fade-in-up">
              <div className="card-body">
                {!editing ? (
                  <>
                    {/* Description */}
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-jira-text-subtle uppercase tracking-wide mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                        Descripcion
                      </h3>
                      <div className="p-4 rounded-lg bg-jira-bg border border-jira-border">
                        <p className="text-jira-text leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-3 rounded-lg bg-jira-bg border border-jira-border">
                        <span className="text-xs text-jira-text-subtlest uppercase tracking-wide block mb-1">Estado</span>
                        <span className={`inline-flex items-center gap-1 text-sm font-medium ${currentStatus.color}`}>
                          {currentStatus.icon} {ticket.status?.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-jira-bg border border-jira-border">
                        <span className="text-xs text-jira-text-subtlest uppercase tracking-wide block mb-1">Prioridad</span>
                        <span className={`inline-flex items-center gap-1 text-sm font-medium ${currentPriority.color}`}>
                          {currentPriority.icon} {ticket.priority}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-jira-bg border border-jira-border">
                        <span className="text-xs text-jira-text-subtlest uppercase tracking-wide block mb-1">Categoria</span>
                        <span className="text-sm text-jira-text capitalize">{ticket.category?.replace('_', ' ')}</span>
                      </div>
                      <div className="p-3 rounded-lg bg-jira-bg border border-jira-border">
                        <span className="text-xs text-jira-text-subtlest uppercase tracking-wide block mb-1">Confidencialidad</span>
                        <span className="text-sm text-jira-text">{currentConfidentiality.icon} {currentConfidentiality.label}</span>
                      </div>
                    </div>

                    {/* People Section */}
                    <div className="mt-6 pt-6 border-t border-jira-border">
                      <h3 className="text-sm font-medium text-jira-text-subtle uppercase tracking-wide mb-4">Personas</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-jira-blue to-jira-purple flex items-center justify-center">
                            <span className="text-sm font-bold text-white">{ticket.createdBy?.username?.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <span className="text-xs text-jira-text-subtlest block">Creado por</span>
                            <span className="text-sm text-jira-text font-medium">{ticket.createdBy?.username}</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-jira-text-subtlest block mb-2">Asignado a</span>
                          {user?.role !== 'cliente' ? (
                            <select
                              value={ticket.assignedTo?._id || ''}
                              onChange={(e) => handleReassign(e.target.value)}
                              disabled={submitting}
                              className="input text-sm py-2"
                            >
                              <option value="">Sin asignar</option>
                              {assignableUsers.map((u) => (
                                <option key={u._id} value={u._id}>
                                  {u.username} ({u.role})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="flex items-center gap-3">
                              {ticket.assignedTo ? (
                                <>
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-jira-green to-jira-teal flex items-center justify-center">
                                    <span className="text-xs font-bold text-white">{ticket.assignedTo?.username?.charAt(0).toUpperCase()}</span>
                                  </div>
                                  <span className="text-sm text-jira-text font-medium">{ticket.assignedTo?.username}</span>
                                </>
                              ) : (
                                <span className="text-sm text-jira-text-subtle italic">Sin asignar</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Dates Section */}
                    <div className="mt-6 pt-6 border-t border-jira-border">
                      <h3 className="text-sm font-medium text-jira-text-subtle uppercase tracking-wide mb-4">Fechas</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-jira-text-subtlest block mb-1">Creado</span>
                          <span className="text-jira-text">{new Date(ticket.createdAt).toLocaleString('es-ES')}</span>
                        </div>
                        <div>
                          <span className="text-jira-text-subtlest block mb-1">SLA Deadline</span>
                          <span className={`${new Date(ticket.slaDeadline) < new Date() ? 'text-jira-red' : 'text-jira-text'}`}>
                            {new Date(ticket.slaDeadline).toLocaleString('es-ES')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Edit Form */
                  <form onSubmit={handleUpdateTicket} className="space-y-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-jira-text">Editar Ticket</h3>
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="p-2 hover:bg-jira-bg-hover rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5 text-jira-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="form-group">
                      <label className="label">Titulo</label>
                      <input
                        type="text"
                        value={editData.title}
                        onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                        className="input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="label">Descripcion</label>
                      <textarea
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        className="input resize-none"
                        rows="5"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="form-group">
                        <label className="label">Prioridad</label>
                        <select
                          value={editData.priority}
                          onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                          className="input"
                        >
                          <option value="baja">Baja</option>
                          <option value="media">Media</option>
                          <option value="alta">Alta</option>
                          <option value="critica">Critica</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="label">Estado</label>
                        <select
                          value={editData.status}
                          onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                          className="input"
                        >
                          <option value="abierto">Abierto</option>
                          <option value="en_proceso">En Proceso</option>
                          <option value="resuelto">Resuelto</option>
                          <option value="cerrado">Cerrado</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-jira-border">
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="btn-secondary flex-1"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="btn-primary flex-1"
                      >
                        {submitting ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Guardando...
                          </span>
                        ) : 'Guardar Cambios'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* History Timeline */}
            <div className="card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="card-body">
                <h3 className="text-sm font-medium text-jira-text-subtle uppercase tracking-wide mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Historial de Cambios
                </h3>

                {history.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-jira-bg-hover flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-jira-text-subtlest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-jira-text-subtle text-sm">Sin cambios registrados</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-jira-border" />

                    <div className="space-y-4">
                      {history.map((entry, idx) => (
                        <div key={idx} className="relative pl-10 animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                          {/* Timeline dot */}
                          <div className="absolute left-2.5 w-3 h-3 rounded-full bg-jira-blue border-2 border-jira-bg-card" />

                          <div className="p-3 rounded-lg bg-jira-bg border border-jira-border hover:border-jira-border-bold transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-jira-blue-subtle text-jira-blue">
                                  {entry.action}
                                </span>
                                <span className="text-sm text-jira-text font-medium">{entry.changedBy?.username}</span>
                              </div>
                              <span className="text-xs text-jira-text-subtlest">{new Date(entry.timestamp).toLocaleString('es-ES')}</span>
                            </div>
                            <p className="text-sm text-jira-text-subtle mb-2">
                              Modifico <span className="font-medium text-jira-text">{entry.field}</span>
                            </p>
                            <div className="flex items-center gap-2 text-xs">
                              <code className="px-2 py-1 rounded bg-jira-bg-hover text-jira-red line-through">{entry.oldValue || 'null'}</code>
                              <svg className="w-4 h-4 text-jira-text-subtlest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                              <code className="px-2 py-1 rounded bg-jira-green/10 text-jira-green">{entry.newValue}</code>
                            </div>
                            {entry.ipAddress && (
                              <p className="text-xs text-jira-text-subtlest mt-2 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                                IP: {entry.ipAddress}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Right */}
          <div className="space-y-6">
            {/* Comments */}
            <div className="card animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
              <div className="card-body">
                <h3 className="text-sm font-medium text-jira-text-subtle uppercase tracking-wide mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  Comentarios
                  {ticket.comments?.length > 0 && (
                    <span className="ml-auto px-2 py-0.5 rounded-full bg-jira-blue-subtle text-jira-blue text-xs">
                      {ticket.comments.length}
                    </span>
                  )}
                </h3>

                <div className="space-y-3 mb-4 max-h-80 overflow-y-auto custom-scrollbar">
                  {!ticket.comments || ticket.comments.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="w-10 h-10 rounded-full bg-jira-bg-hover flex items-center justify-center mx-auto mb-2">
                        <svg className="w-5 h-5 text-jira-text-subtlest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <p className="text-jira-text-subtle text-sm">Sin comentarios</p>
                    </div>
                  ) : (
                    ticket.comments.map((c, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-jira-bg border border-jira-border animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-jira-purple to-jira-blue flex items-center justify-center">
                            <span className="text-xs font-bold text-white">{c.author?.username?.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="text-sm font-medium text-jira-text">{c.author?.username}</span>
                          <span className="text-xs text-jira-text-subtlest ml-auto">{new Date(c.timestamp).toLocaleString('es-ES')}</span>
                        </div>
                        <p className="text-sm text-jira-text-subtle pl-8">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="pt-4 border-t border-jira-border">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Escribe un comentario..."
                    rows="3"
                    className="input text-sm resize-none mb-3"
                  />
                  <button
                    type="submit"
                    disabled={!comment.trim() || submitting}
                    className="btn-primary w-full"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Publicando...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Publicar
                      </span>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Attachments */}
            <div className="card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="card-body">
                <h3 className="text-sm font-medium text-jira-text-subtle uppercase tracking-wide mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  Adjuntos
                  {ticket.attachments?.length > 0 && (
                    <span className="ml-auto px-2 py-0.5 rounded-full bg-jira-blue-subtle text-jira-blue text-xs">
                      {ticket.attachments.length}
                    </span>
                  )}
                </h3>

                {!ticket.attachments || ticket.attachments.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="w-10 h-10 rounded-full bg-jira-bg-hover flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-jira-text-subtlest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </div>
                    <p className="text-jira-text-subtle text-sm">Sin archivos adjuntos</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {ticket.attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-jira-bg border border-jira-border hover:border-jira-border-bold transition-colors group">
                        <div className="w-8 h-8 rounded-lg bg-jira-blue-subtle flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-jira-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-jira-text truncate group-hover:text-jira-blue transition-colors">{att.originalName || att.filename}</p>
                          <p className="text-xs text-jira-text-subtlest">{(att.size / 1024).toFixed(2)} KB</p>
                        </div>
                        <svg className="w-4 h-4 text-jira-text-subtlest group-hover:text-jira-blue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Info */}
            <div className="card animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
              <div className="card-body">
                <h3 className="text-sm font-medium text-jira-text-subtle uppercase tracking-wide mb-4">Informacion Rapida</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-jira-text-subtlest">Numero</span>
                    <span className="font-mono text-jira-text">{ticket.ticketNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-jira-text-subtlest">Actualizado</span>
                    <span className="text-jira-text">{new Date(ticket.updatedAt).toLocaleDateString('es-ES')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TicketDetail;
