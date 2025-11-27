/**
 * INTEGRIDAD - Componente Detalle de Ticket
 * Muestra información completa del ticket con historial, comentarios y adjuntos
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
  const [fileInput, setFileInput] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadTicket();
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
        setError('Sesión expirada');
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

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      await ticketAPI.addComment(id, comment);
      setComment('');
      loadTicket();
    } catch (err) {
      setError('Error al agregar comentario');
    }
  };

  const handleUpdateTicket = async (e) => {
    e.preventDefault();
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
    }
  };

  const handleEscalate = async () => {
    try {
      await ticketAPI.escalateTicket(id, 'Escalado por usuario');
      loadTicket();
    } catch (err) {
      setError('Error al escalar ticket');
    }
  };

  const getPriorityClass = (priority) => {
    const classes = {
      critica: 'priority-badge critica',
      alta: 'priority-badge alta',
      media: 'priority-badge media',
      baja: 'priority-badge baja'
    };
    return classes[priority] || 'priority-badge';
  };

  const getStatusColor = (status) => {
    const colors = {
      abierto: '#0078d4',
      en_proceso: '#ffb900',
      escalado: '#d83b01',
      resuelto: '#107c10',
      cerrado: '#595959'
    };
    return colors[status] || '#0078d4';
  };

  if (loading) return <div className="loading"><span className="spinner"></span> Cargando...</div>;

  if (!ticket) return <div className="error-message">Ticket no encontrado</div>;

  const getPriorityBadgeClass = (priority) => {
    const classes = {
      critica: 'bg-red-900 text-red-100',
      alta: 'bg-orange-900 text-orange-100',
      media: 'bg-yellow-900 text-yellow-100',
      baja: 'bg-green-900 text-green-100'
    };
    return classes[priority] || 'bg-gray-700 text-gray-100';
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      abierto: 'bg-blue-900 text-blue-100',
      en_proceso: 'bg-purple-900 text-purple-100',
      escalado: 'bg-red-900 text-red-100',
      resuelto: 'bg-green-900 text-green-100',
      cerrado: 'bg-gray-700 text-gray-100'
    };
    return classes[status] || 'bg-gray-700 text-gray-100';
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="bg-gradient-to-r from-teams-blue to-teams-blue-hover shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
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
                <h1 className="text-3xl font-bold text-white">{ticket?.ticketNumber}</h1>
                <p className="text-blue-100 text-sm mt-1">{ticket?.title}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
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

        {/* Loading */}
        {loading && (
          <div className="card flex items-center justify-center py-12">
            <div className="text-center">
              <div className="spinner mx-auto mb-4"></div>
              <p className="text-dark-secondary">Cargando información...</p>
            </div>
          </div>
        )}

        {!loading && ticket && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Ticket Information */}
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <svg className="w-6 h-6 text-teams-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Información
                  </h2>
                  {!editing && ['agente_n1', 'agente_n2', 'supervisor', 'administrador'].includes(user?.role) && (
                    <button
                      onClick={() => setEditing(true)}
                      className="btn-primary flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>
                  )}
                </div>

                {!editing ? (
                  <div className="space-y-6">
                    {/* Title and Description */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Descripción</h3>
                      <p className="text-dark-secondary leading-relaxed bg-dark-bg-tertiary p-4 rounded-lg">{ticket.description}</p>
                    </div>

                    {/* Grid of Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-teams-gray-dark uppercase tracking-wider">Estado</label>
                        <span className={`badge ${getStatusBadgeClass(ticket.status)} inline-block mt-2`}>
                          {ticket.status}
                        </span>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-teams-gray-dark uppercase tracking-wider">Prioridad</label>
                        <span className={`badge ${getPriorityBadgeClass(ticket.priority)} inline-block mt-2`}>
                          {ticket.priority}
                        </span>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-teams-gray-dark uppercase tracking-wider">Categoría</label>
                        <p className="text-dark-secondary mt-2">{ticket.category}</p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-teams-gray-dark uppercase tracking-wider">Confidencialidad</label>
                        <p className="text-dark-secondary mt-2 capitalize">{ticket.confidentiality}</p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-teams-gray-dark uppercase tracking-wider">Creado Por</label>
                        <p className="text-dark-secondary mt-2">{ticket.createdBy?.username}</p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-teams-gray-dark uppercase tracking-wider">Asignado A</label>
                        <p className="text-dark-secondary mt-2">{ticket.assignedTo?.username || <span className="italic">Sin asignar</span>}</p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-teams-gray-dark uppercase tracking-wider">Creado</label>
                        <p className="text-dark-secondary mt-2">{new Date(ticket.createdAt).toLocaleString('es-ES')}</p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-teams-gray-dark uppercase tracking-wider">SLA Deadline</label>
                        <p className="text-dark-secondary mt-2">{new Date(ticket.slaDeadline).toLocaleString('es-ES')}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {['agente_n2', 'supervisor', 'administrador'].includes(user?.role) && ticket.status !== 'escalado' && (
                      <div className="pt-4 border-t border-dark-bg-tertiary">
                        <button
                          onClick={handleEscalate}
                          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                        >
                          Escalar Ticket
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleUpdateTicket} className="space-y-4">
                    <div className="form-group">
                      <label className="label">Título</label>
                      <input
                        type="text"
                        value={editData.title}
                        onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                        className="input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="label">Descripción</label>
                      <textarea
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        className="input"
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
                          <option value="critica">Crítica</option>
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

                    {['supervisor', 'administrador'].includes(user?.role) && (
                      <div className="form-group">
                        <label className="label">Reasignar A (ID de Usuario)</label>
                        <input
                          type="text"
                          placeholder="Ingresa el ID del usuario"
                          value={editData.assignedTo || ''}
                          onChange={(e) => setEditData({ ...editData, assignedTo: e.target.value })}
                          className="input"
                        />
                        <p className="text-xs text-teams-gray-dark mt-1">Deja vacío para desasignar</p>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4 border-t border-dark-bg-tertiary">
                      <button type="submit" className="flex-1 btn-primary">Guardar Cambios</button>
                      <button type="button" onClick={() => setEditing(false)} className="flex-1 btn-secondary">
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* History */}
              <div className="card">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5 text-teams-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Historial de Cambios
                </h2>

                {history.length === 0 ? (
                  <p className="text-dark-secondary italic text-center py-8">Sin cambios registrados aún</p>
                ) : (
                  <div className="space-y-4">
                    {history.map((entry, idx) => (
                      <div key={idx} className="bg-dark-bg-tertiary p-4 rounded-lg border border-dark-bg-secondary">
                        <div className="flex items-center justify-between mb-2">
                          <span className="badge badge-blue">{entry.action}</span>
                          <span className="text-xs text-teams-gray-dark">{new Date(entry.timestamp).toLocaleString('es-ES')}</span>
                        </div>
                        <div className="text-sm">
                          <p className="text-dark-secondary">
                            <strong>{entry.changedBy?.username}</strong> modificó <strong>{entry.field}</strong>
                          </p>
                          <p className="text-teams-gray-dark mt-1 font-mono text-xs">
                            De: <code className="bg-dark-bg px-2 py-1 rounded">{entry.oldValue}</code>
                          </p>
                          <p className="text-teams-gray-dark font-mono text-xs">
                            A: <code className="bg-dark-bg px-2 py-1 rounded">{entry.newValue}</code>
                          </p>
                          {entry.ipAddress && <p className="text-teams-gray-dark text-xs mt-2">📍 IP: {entry.ipAddress}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Comments */}
              <div className="card">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5 text-teams-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  Comentarios
                </h2>

                <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                  {!ticket.comments || ticket.comments.length === 0 ? (
                    <p className="text-dark-secondary italic text-center py-4">Sin comentarios</p>
                  ) : (
                    ticket.comments.map((c, idx) => (
                      <div key={idx} className="bg-dark-bg-tertiary p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <strong className="text-dark-secondary">{c.author?.username}</strong>
                          <span className="text-xs text-teams-gray-dark">{new Date(c.timestamp).toLocaleString('es-ES')}</span>
                        </div>
                        <p className="text-dark-secondary text-sm">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="space-y-3 pt-4 border-t border-dark-bg-tertiary">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Escribir comentario..."
                    rows="3"
                    className="input text-sm"
                  />
                  <button type="submit" className="w-full btn-primary">
                    Publicar Comentario
                  </button>
                </form>
              </div>

              {/* Attachments */}
              <div className="card">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5 text-teams-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Adjuntos
                </h2>

                {!ticket.attachments || ticket.attachments.length === 0 ? (
                  <p className="text-dark-secondary italic text-center py-4">Sin archivos</p>
                ) : (
                  <div className="space-y-2">
                    {ticket.attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-dark-bg-tertiary rounded-lg">
                        <svg className="w-4 h-4 text-teams-blue flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-dark-secondary text-sm truncate">{att.originalName || att.filename}</p>
                          <p className="text-teams-gray-dark text-xs">{(att.size / 1024).toFixed(2)} KB</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TicketDetail;
