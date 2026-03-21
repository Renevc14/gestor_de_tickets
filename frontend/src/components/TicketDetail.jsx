/**
 * INTEGRIDAD - Componente Detalle de Ticket
 * Monografía UCB: 6 estados, category FK con color, historial inmutable
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ticketAPI, userAPI, getStoredUser, clearAuth } from '../services/api';

const STATUS_STYLE = {
  NUEVO:      { background: 'rgba(240,185,11,0.1)', color: '#F0B90B', borderColor: 'rgba(240,185,11,0.3)' },
  ASIGNADO:   { background: 'rgba(30,136,229,0.1)', color: '#1E88E5', borderColor: 'rgba(30,136,229,0.3)' },
  EN_PROCESO: { background: 'rgba(249,115,22,0.1)', color: '#F97316', borderColor: 'rgba(249,115,22,0.3)' },
  RESUELTO:   { background: 'rgba(3,166,109,0.1)',  color: '#03A66D', borderColor: 'rgba(3,166,109,0.3)' },
  CERRADO:    { background: 'rgba(132,142,156,0.1)',color: '#848E9C', borderColor: 'rgba(132,142,156,0.25)' },
  REABIERTO:  { background: 'rgba(207,48,74,0.1)',  color: '#CF304A', borderColor: 'rgba(207,48,74,0.3)' },
};

const PRIORITY_STYLE = {
  CRITICA: { background: 'rgba(207,48,74,0.1)',  color: '#CF304A', borderColor: 'rgba(207,48,74,0.3)' },
  ALTA:    { background: 'rgba(249,115,22,0.1)', color: '#F97316', borderColor: 'rgba(249,115,22,0.3)' },
  MEDIA:   { background: 'rgba(240,185,11,0.1)', color: '#F0B90B', borderColor: 'rgba(240,185,11,0.3)' },
  BAJA:    { background: 'rgba(3,166,109,0.1)',  color: '#03A66D', borderColor: 'rgba(3,166,109,0.3)' },
};
const getStatusStyle   = (v) => STATUS_STYLE[v]   || { background: 'rgba(132,142,156,0.1)', color: '#848E9C', borderColor: 'rgba(132,142,156,0.2)' };
const getPriorityStyle = (v) => PRIORITY_STYLE[v] || { background: 'rgba(132,142,156,0.1)', color: '#848E9C', borderColor: 'rgba(132,142,156,0.2)' };

// Estados destino permitidos para cada rol
const NEXT_STATUSES = {
  TECNICO: {
    ASIGNADO:   ['EN_PROCESO'],
    EN_PROCESO: ['RESUELTO'],
    REABIERTO:  ['EN_PROCESO']
  },
  ADMINISTRADOR: {
    NUEVO:      ['ASIGNADO'],
    ASIGNADO:   ['EN_PROCESO'],
    EN_PROCESO: ['RESUELTO'],
    RESUELTO:   ['CERRADO', 'REABIERTO'],
    REABIERTO:  ['ASIGNADO', 'EN_PROCESO']
  },
  SOLICITANTE: {
    RESUELTO: ['REABIERTO']
  }
};

// ─── Helper: iniciales de nombre ─────────────────────────────────────────────
const initials = (name) =>
  name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

// Colores de avatar deterministas según id de usuario
const AVATAR_COLORS = ['#7C3AED','#1E88E5','#03A66D','#F97316','#CF304A','#F0B90B','#0891B2','#DB2777'];
const avatarColor = (id) => AVATAR_COLORS[id % AVATAR_COLORS.length];

// ─── Assignee Picker (estilo Jira) ────────────────────────────────────────────
const AssigneePicker = ({ assignee, technicians, onAssign, readonly }) => {
  const [open, setOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const ref = useRef(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = async (techId) => {
    setOpen(false);
    setAssigning(true);
    try { await onAssign(techId); } finally { setAssigning(false); }
  };

  // Vista solo lectura (no admin)
  if (readonly) {
    return assignee ? (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: avatarColor(assignee.id) }}>
          {initials(assignee.name)}
        </div>
        <span className="text-sm text-white">{assignee.name}</span>
      </div>
    ) : (
      <span className="text-sm italic" style={{ color: '#848E9C' }}>Sin asignar</span>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={assigning}
        className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg transition-all duration-150 group"
        style={{ background: open ? 'rgba(43,49,57,0.8)' : 'transparent' }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'rgba(43,49,57,0.5)'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        {assigning ? (
          <div className="spinner flex-shrink-0" style={{ width: 20, height: 20 }} />
        ) : assignee ? (
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: avatarColor(assignee.id) }}>
            {initials(assignee.name)}
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full border border-dashed flex items-center justify-center flex-shrink-0"
            style={{ borderColor: '#363C45' }}>
            <svg className="w-3.5 h-3.5" style={{ color: '#848E9C' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        )}
        <span className="text-sm flex-1" style={{ color: assignee ? '#EAECEF' : '#848E9C' }}>
          {assigning ? 'Asignando...' : assignee ? assignee.name : 'Sin asignar'}
        </span>
        <svg className="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-150"
          style={{ color: '#848E9C', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 rounded-xl border overflow-hidden z-30 animate-fade-up"
          style={{ background: '#1E2329', borderColor: '#2B3139', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>

          {/* Opción: quitar asignación */}
          <button
            onClick={() => handleSelect(null)}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm transition-colors"
            style={{ color: '#848E9C' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(43,49,57,0.6)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div className="w-7 h-7 rounded-full border border-dashed flex items-center justify-center flex-shrink-0"
              style={{ borderColor: '#363C45' }}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            Sin asignar
          </button>

          <div style={{ height: 1, background: '#2B3139' }} />

          {technicians.length === 0 ? (
            <p className="px-3 py-3 text-xs text-center" style={{ color: '#848E9C' }}>No hay tecnicos disponibles</p>
          ) : technicians.map(tech => (
            <button
              key={tech.id}
              onClick={() => handleSelect(tech.id)}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm transition-colors"
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(43,49,57,0.6)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: avatarColor(tech.id) }}>
                {initials(tech.name)}
              </div>
              <span className="flex-1 text-left" style={{ color: '#EAECEF' }}>{tech.name}</span>
              {assignee?.id === tech.id && (
                <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#F0B90B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getStoredUser();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [technicians, setTechnicians] = useState([]);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const commentsEndRef = useRef(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadTicket();
    // Solo el admin puede asignar — cargar lista de técnicos una sola vez
    if (user.role === 'ADMINISTRADOR') {
      userAPI.listUsers({ role: 'TECNICO', status: 'ACTIVO' })
        .then(res => setTechnicians(res.data.users || []))
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await ticketAPI.getTicket(id);
      setTicket(res.data.ticket);
    } catch (err) {
      if (err.response?.status === 401) { clearAuth(); navigate('/login'); }
      else if (err.response?.status === 403) {
        setError('No tiene acceso a este ticket');
        setTimeout(() => navigate('/dashboard'), 2000);
      } else if (err.response?.status === 404) {
        setError('Ticket no encontrado');
      } else {
        setError(err.response?.data?.message || 'Error cargando ticket');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (techId) => {
    try {
      const res = await ticketAPI.assignTicket(id, techId);
      setTicket(prev => ({
        ...prev,
        assignee: res.data.ticket.assignee,
        status:   res.data.ticket.status,
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al asignar ticket');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await ticketAPI.addComment(id, comment);
      // Agregar el comentario devuelto por el backend directamente al estado local
      setTicket(prev => ({
        ...prev,
        comments: [...(prev.comments || []), res.data.comment]
      }));
      setComment('');
      // Scroll automático al nuevo comentario
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) {
      setError('Error al agregar comentario');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleChangeStatus = async (newStatus) => {
    setChangingStatus(true);
    try {
      const res = await ticketAPI.changeStatus(id, newStatus);
      // Actualizar solo el estado del ticket sin recargar toda la vista
      setTicket(prev => ({ ...prev, status: res.data.ticket.status }));
      // Recargar historial silenciosamente (sin spinner de carga)
      const updated = await ticketAPI.getTicket(id);
      setTicket(updated.data.ticket);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cambiar estado');
    } finally {
      setChangingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-dark-secondary">Cargando ticket...</p>
        </div>
      </div>
    );
  }

  if (!ticket && error) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="alert alert-error max-w-md">{error}</div>
      </div>
    );
  }

  if (!ticket) return null;

  const nextStatuses = NEXT_STATUSES[user?.role]?.[ticket.status] || [];
  const slaDate = ticket.sla_deadline ? new Date(ticket.sla_deadline) : null;
  const slaExpired = slaDate && slaDate < new Date() && !['RESUELTO', 'CERRADO'].includes(ticket.status);

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="bg-gradient-to-r from-teams-blue to-teams-blue-hover shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-dark-bg-secondary rounded-lg transition-colors">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Ticket #{ticket.id}</h1>
              <p className="text-teams-gray-dark text-sm mt-0.5 truncate max-w-xl">{ticket.title}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="alert alert-error mb-6 flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-200 hover:text-white">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información del ticket */}
            <div className="card">
              <h2 className="text-xl font-bold text-white mb-6">Información del Ticket</h2>

              <div className="mb-4">
                <p className="text-xs font-semibold text-teams-gray-dark uppercase tracking-wider mb-1">Descripción</p>
                <p className="text-dark-secondary bg-dark-bg-tertiary p-4 rounded-lg leading-relaxed">{ticket.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-teams-gray-dark uppercase tracking-wider mb-2">Estado</p>
                  <span className="badge" style={getStatusStyle(ticket.status)}>
                    {ticket.status}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-semibold text-teams-gray-dark uppercase tracking-wider mb-2">Prioridad</p>
                  <span className="badge" style={getPriorityStyle(ticket.priority)}>
                    {ticket.priority}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-semibold text-teams-gray-dark uppercase tracking-wider mb-2">Categoría</p>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ticket.category?.color }}></span>
                    <span className="text-dark-secondary">{ticket.category?.name}</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-teams-gray-dark uppercase tracking-wider mb-2">Solicitante</p>
                  <p className="text-dark-secondary">{ticket.creator?.name}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-teams-gray-dark uppercase tracking-wider mb-2">Tecnico Asignado</p>
                  <AssigneePicker
                    assignee={ticket.assignee}
                    technicians={technicians}
                    onAssign={handleAssign}
                    readonly={user?.role !== 'ADMINISTRADOR'}
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold text-teams-gray-dark uppercase tracking-wider mb-2">Creado</p>
                  <p className="text-dark-secondary">{new Date(ticket.created_at).toLocaleString('es-ES')}</p>
                </div>

                <div className="col-span-2">
                  <p className="text-xs font-semibold text-teams-gray-dark uppercase tracking-wider mb-2">SLA Deadline</p>
                  {slaDate ? (
                    <p className={slaExpired ? 'text-red-400 font-semibold' : 'text-dark-secondary'}>
                      {slaDate.toLocaleString('es-ES')}
                      {slaExpired && ' — VENCIDO'}
                    </p>
                  ) : (
                    <p className="text-teams-gray-dark italic">Sin SLA</p>
                  )}
                </div>
              </div>

              {/* Cambiar estado */}
              {nextStatuses.length > 0 && (
                <div className="mt-6 pt-6 border-t border-dark-bg-tertiary">
                  <p className="text-sm font-semibold text-teams-gray-dark uppercase tracking-wider mb-3">Cambiar Estado</p>
                  <div className="flex flex-wrap gap-2">
                    {nextStatuses.map(s => (
                      <button
                        key={s}
                        onClick={() => handleChangeStatus(s)}
                        disabled={changingStatus}
                        className="btn-ghost-gold disabled:opacity-50"
                        style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                      >
                        {changingStatus ? '...' : `${s}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Historial inmutable */}
            <div className="card">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-teams-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Historial de Cambios
              </h2>

              {!ticket.history || ticket.history.length === 0 ? (
                <p className="text-dark-secondary italic text-center py-6">Sin cambios registrados</p>
              ) : (
                <div className="space-y-3">
                  {ticket.history.map((entry) => (
                    <div key={entry.id} className="bg-dark-bg-tertiary p-4 rounded-lg border border-dark-bg-secondary">
                      <div className="flex items-center justify-between mb-2">
                        <span className="badge" style={{ background:'rgba(240,185,11,0.1)', color:'#F0B90B', borderColor:'rgba(240,185,11,0.3)' }}>{entry.field_changed}</span>
                        <span className="text-xs text-teams-gray-dark">{new Date(entry.timestamp).toLocaleString('es-ES')}</span>
                      </div>
                      <p className="text-sm text-dark-secondary">
                        <strong className="text-white">{entry.user?.name}</strong> cambió <strong>{entry.field_changed}</strong>
                      </p>
                      <div className="mt-2 font-mono text-xs text-teams-gray-dark space-y-1">
                        <p>De: <code className="bg-dark-bg px-2 py-0.5 rounded text-red-300">{entry.old_value || '—'}</code></p>
                        <p>A: <code className="bg-dark-bg px-2 py-0.5 rounded text-green-300">{entry.new_value || '—'}</code></p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Comentarios */}
            <div className="card">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-teams-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Comentarios
              </h2>

              <div className="space-y-3 mb-4 max-h-72 overflow-y-auto">
                {!ticket.comments || ticket.comments.length === 0 ? (
                  <p className="text-dark-secondary italic text-center py-4 text-sm">Sin comentarios</p>
                ) : (
                  <>
                    {ticket.comments.map((c) => (
                      <div key={c.id} className="bg-dark-bg-tertiary p-3 rounded-lg animate-fade-up">
                        <div className="flex items-center justify-between mb-1">
                          <strong className="text-white text-sm">{c.user?.name}</strong>
                          <span className="text-xs text-teams-gray-dark">{new Date(c.timestamp).toLocaleString('es-ES')}</span>
                        </div>
                        <p className="text-dark-secondary text-sm">{c.content}</p>
                      </div>
                    ))}
                    <div ref={commentsEndRef} />
                  </>
                )}
              </div>

              <form onSubmit={handleAddComment} className="space-y-2 pt-4 border-t border-dark-bg-tertiary">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Escribir comentario..."
                  rows="3"
                  className="input text-sm"
                />
                <button type="submit" disabled={submittingComment || !comment.trim()} className="w-full btn-primary disabled:opacity-50">
                  {submittingComment ? 'Publicando...' : 'Publicar Comentario'}
                </button>
              </form>
            </div>

            {/* Adjuntos */}
            <div className="card">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-teams-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                Adjuntos
              </h2>

              {!ticket.attachments || ticket.attachments.length === 0 ? (
                <p className="text-dark-secondary italic text-center py-4 text-sm">Sin archivos adjuntos</p>
              ) : (
                <div className="space-y-2">
                  {ticket.attachments.map((att) => (
                    <div key={att.id} className="flex items-center gap-2 p-2 bg-dark-bg-tertiary rounded-lg">
                      <svg className="w-4 h-4 text-teams-blue flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-dark-secondary text-sm truncate">{att.filename}</p>
                        <p className="text-teams-gray-dark text-xs">{(att.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TicketDetail;
