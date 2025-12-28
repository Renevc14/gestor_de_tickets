/**
 * INTEGRIDAD - Componente Dashboard
 * Muestra lista de tickets segun rol del usuario
 * Diseno inspirado en Jira Dark Mode
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketAPI, getStoredUser, clearAuth } from '../services/api';
import MFASetup from './MFASetup';

const Dashboard = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({});
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0 });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadTickets();
  }, [filters.status, filters.priority, filters.page]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { ...filters, page: filters.page, limit: filters.limit };
      const response = await ticketAPI.listTickets(params);
      setTickets(response.data.tickets);
      setPagination(response.data.pagination);

      // Calculate stats
      const allTickets = response.data.tickets;
      setStats({
        total: response.data.pagination.total || allTickets.length,
        open: allTickets.filter(t => t.status === 'abierto').length,
        inProgress: allTickets.filter(t => t.status === 'en_proceso').length,
        resolved: allTickets.filter(t => t.status === 'resuelto').length
      });
    } catch (err) {
      setError('Error cargando tickets');
      if (err.response?.status === 401) {
        clearAuth();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const handleMFASetupComplete = (success) => {
    setShowMFASetup(false);
    if (success) window.location.reload();
  };

  if (showMFASetup) {
    return <MFASetup onComplete={handleMFASetupComplete} />;
  }

  return (
    <div className="min-h-screen bg-jira-bg">
      {/* Header */}
      <header className="page-header sticky top-0 z-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-jira-blue to-jira-purple rounded-jira-lg flex items-center justify-center shadow-jira-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-jira-text">Ticket Manager</h1>
                <p className="text-xs text-jira-text-subtlest">Panel de Control</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="nav-item nav-item-active"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Dashboard
              </button>
              {['administrador', 'supervisor'].includes(user?.role) && (
                <button
                  onClick={() => navigate('/audit-logs')}
                  className="nav-item"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Auditoria
                </button>
              )}
              {user?.role === 'administrador' && (
                <button
                  onClick={() => navigate('/users')}
                  className="nav-item"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  Usuarios
                </button>
              )}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="user-avatar">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-jira-text">{user?.username}</p>
                  <p className="text-xs text-jira-text-subtlest capitalize">
                    <span className={`role-badge ${user?.role}`}>{user?.role?.replace('_', ' ')}</span>
                  </p>
                </div>
              </div>

              {!user?.mfaEnabled && (
                <button
                  onClick={() => setShowMFASetup(true)}
                  className="btn-sm btn bg-jira-orange-subtle text-jira-orange hover:bg-jira-orange hover:text-jira-text-inverse"
                  title="Configurar MFA"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="hidden sm:inline">MFA</span>
                </button>
              )}

              <button
                onClick={handleLogout}
                className="btn-danger btn-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-in-up">
          <div className="stat-card blue">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-jira-lg bg-jira-blue-subtle flex items-center justify-center">
                <svg className="w-5 h-5 text-jira-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="stat-value">{stats.total}</p>
                <p className="stat-label">Total</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-jira-lg bg-jira-blue-subtle flex items-center justify-center">
                <svg className="w-5 h-5 text-jira-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="stat-value text-jira-blue">{stats.open}</p>
                <p className="stat-label">Abiertos</p>
              </div>
            </div>
          </div>

          <div className="stat-card orange">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-jira-lg bg-jira-yellow-subtle flex items-center justify-center">
                <svg className="w-5 h-5 text-jira-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <p className="stat-value text-jira-yellow">{stats.inProgress}</p>
                <p className="stat-label">En Proceso</p>
              </div>
            </div>
          </div>

          <div className="stat-card green">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-jira-lg bg-jira-green-subtle flex items-center justify-center">
                <svg className="w-5 h-5 text-jira-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="stat-value text-jira-green">{stats.resolved}</p>
                <p className="stat-label">Resueltos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="card mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="card-body">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="filter-group">
                  <label className="filter-label">Estado</label>
                  <select
                    name="status"
                    value={filters.status}
                    onChange={handleFilterChange}
                    className="filter-select"
                  >
                    <option value="">Todos</option>
                    <option value="abierto">Abierto</option>
                    <option value="en_proceso">En Proceso</option>
                    <option value="resuelto">Resuelto</option>
                    <option value="cerrado">Cerrado</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label className="filter-label">Prioridad</label>
                  <select
                    name="priority"
                    value={filters.priority}
                    onChange={handleFilterChange}
                    className="filter-select"
                  >
                    <option value="">Todas</option>
                    <option value="critica">Critica</option>
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>

                {(filters.status || filters.priority) && (
                  <button
                    onClick={() => setFilters({ status: '', priority: '', page: 1, limit: 10 })}
                    className="btn-ghost btn-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Limpiar
                  </button>
                )}
              </div>

              {/* New Ticket Button */}
              <button
                onClick={() => navigate('/tickets/create')}
                className="btn-primary"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nuevo Ticket
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error mb-6 animate-scale-in">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Tickets Table */}
        {loading ? (
          <div className="card animate-fade-in">
            <div className="loading-container">
              <div className="loading-spinner" />
              <p className="loading-text">Cargando tickets...</p>
            </div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="empty-state-container animate-fade-in">
            <svg className="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="empty-state-title">No hay tickets</h3>
            <p className="empty-state-description">
              {filters.status || filters.priority
                ? 'No se encontraron tickets con los filtros seleccionados'
                : 'Cree su primer ticket para comenzar a gestionar incidentes'}
            </p>
            <button
              onClick={() => navigate('/tickets/create')}
              className="btn-primary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crear Primer Ticket
            </button>
          </div>
        ) : (
          <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Titulo</th>
                    <th>Estado</th>
                    <th>Prioridad</th>
                    <th>Categoria</th>
                    <th>Asignado</th>
                    <th>Creado</th>
                    <th className="text-center">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket, index) => (
                    <tr
                      key={ticket._id}
                      className="animate-fade-in-up cursor-pointer"
                      style={{ animationDelay: `${index * 0.05}s` }}
                      onClick={() => navigate(`/tickets/${ticket._id}`)}
                    >
                      <td>
                        <span className="ticket-number">{ticket.ticketNumber}</span>
                      </td>
                      <td>
                        <div className="max-w-xs">
                          <p className="font-medium text-jira-text truncate">{ticket.title}</p>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${ticket.status}`}>
                          {ticket.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span className={`priority-badge ${ticket.priority}`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`category-badge ${ticket.category}`}>
                          {ticket.category?.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        {ticket.assignedTo?.username ? (
                          <div className="flex items-center gap-2">
                            <div className="user-avatar sm">
                              {ticket.assignedTo.username.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-jira-text-subtle">{ticket.assignedTo.username}</span>
                          </div>
                        ) : (
                          <span className="text-jira-text-subtlest italic text-sm">Sin asignar</span>
                        )}
                      </td>
                      <td>
                        <span className="text-sm text-jira-text-subtle">
                          {new Date(ticket.createdAt).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </td>
                      <td className="text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tickets/${ticket._id}`);
                          }}
                          className="btn-primary btn-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-6 px-4">
                <p className="text-sm text-jira-text-subtle">
                  Mostrando {((pagination.page - 1) * filters.limit) + 1} - {Math.min(pagination.page * filters.limit, pagination.total)} de {pagination.total} tickets
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                    className="btn-secondary btn-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Anterior
                  </button>

                  <span className="px-4 py-2 text-sm text-jira-text">
                    {pagination.page} / {pagination.pages}
                  </span>

                  <button
                    onClick={() => setFilters(prev => ({ ...prev, page: Math.min(pagination.pages, prev.page + 1) }))}
                    disabled={pagination.page === pagination.pages}
                    className="btn-secondary btn-sm"
                  >
                    Siguiente
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
