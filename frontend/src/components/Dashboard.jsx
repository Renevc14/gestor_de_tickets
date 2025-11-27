/**
 * INTEGRIDAD - Componente Dashboard
 * Muestra lista de tickets según rol del usuario
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

  useEffect(() => {
    // Verificar autenticación
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

      const params = {
        ...filters,
        page: filters.page,
        limit: filters.limit
      };

      const response = await ticketAPI.listTickets(params);
      setTickets(response.data.tickets);
      setPagination(response.data.pagination);
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
    if (success) {
      // Refresh user data if needed
      window.location.reload();
    }
  };

  const getPriorityBadge = (priority) => {
    const classes = {
      critica: 'bg-red-900 text-red-100',
      alta: 'bg-orange-900 text-orange-100',
      media: 'bg-yellow-900 text-yellow-100',
      baja: 'bg-green-900 text-green-100'
    };
    return classes[priority] || 'bg-gray-700 text-gray-100';
  };

  const getStatusBadge = (status) => {
    const classes = {
      abierto: 'bg-blue-900 text-blue-100',
      en_proceso: 'bg-purple-900 text-purple-100',
      escalado: 'bg-red-900 text-red-100',
      resuelto: 'bg-green-900 text-green-100',
      cerrado: 'bg-gray-700 text-gray-100'
    };
    return classes[status] || 'bg-gray-700 text-gray-100';
  };

  // Show MFA Setup modal if user doesn't have MFA enabled yet
  if (showMFASetup) {
    return <MFASetup onComplete={handleMFASetupComplete} />;
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="bg-gradient-to-r from-teams-blue to-teams-blue-hover shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Gestión de Tickets</h1>
              <p className="text-blue-100 text-sm mt-1">Panel de control centralizado</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-blue-100 text-sm">Bienvenido</p>
                <p className="text-white font-semibold">{user?.username}</p>
                <p className="text-blue-100 text-xs mt-1 capitalize">Rol: {user?.role?.replace('_', ' ')}</p>
                {!user?.mfaEnabled && (
                  <button
                    onClick={() => setShowMFASetup(true)}
                    className="mt-2 px-3 py-1 bg-teams-orange hover:bg-orange-700 text-white rounded text-xs font-semibold transition-colors duration-200 flex items-center gap-1 mx-auto"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Configurar MFA
                  </button>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors duration-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters Section */}
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-teams-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filtros
            </h2>
            <button
              onClick={() => navigate('/tickets/create')}
              className="btn-primary flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Ticket
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div className="form-group">
              <label className="label">Estado</label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="input"
              >
                <option value="">Mostrar todos</option>
                <option value="abierto">Abierto</option>
                <option value="en_proceso">En Proceso</option>
                <option value="escalado">Escalado</option>
                <option value="resuelto">Resuelto</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="form-group">
              <label className="label">Prioridad</label>
              <select
                name="priority"
                value={filters.priority}
                onChange={handleFilterChange}
                className="input"
              >
                <option value="">Mostrar todos</option>
                <option value="critica">Crítica</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ status: '', priority: '', page: 1, limit: 10 })}
                className="btn-secondary w-full"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

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

        {/* Tickets Table */}
        {loading ? (
          <div className="card flex items-center justify-center py-12">
            <div className="text-center">
              <div className="spinner mx-auto mb-4"></div>
              <p className="text-dark-secondary">Cargando tickets...</p>
            </div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="card border-2 border-dashed border-dark-bg-secondary py-12">
            <div className="text-center">
              <svg className="w-16 h-16 text-dark-bg-secondary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-xl font-semibold text-white mb-2">No hay tickets</h3>
              <p className="text-dark-secondary mb-6">Cree un nuevo ticket para comenzar</p>
              <button
                onClick={() => navigate('/tickets/create')}
                className="btn-primary"
              >
                Crear Primer Ticket
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-bg-tertiary">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-teams-gray-dark uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-teams-gray-dark uppercase tracking-wider">Título</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-teams-gray-dark uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-teams-gray-dark uppercase tracking-wider">Prioridad</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-teams-gray-dark uppercase tracking-wider">Categoría</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-teams-gray-dark uppercase tracking-wider">Asignado</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-teams-gray-dark uppercase tracking-wider">Creado</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-teams-gray-dark uppercase tracking-wider">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-bg-tertiary">
                  {tickets.map(ticket => (
                    <tr key={ticket._id} className="table-row-hover">
                      <td className="px-6 py-4 text-sm font-semibold text-teams-blue">{ticket.ticketNumber}</td>
                      <td className="px-6 py-4 text-sm text-dark-secondary max-w-xs truncate">{ticket.title}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`badge ${getStatusBadge(ticket.status)}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`badge ${getPriorityBadge(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-dark-secondary">{ticket.category}</td>
                      <td className="px-6 py-4 text-sm text-dark-secondary">
                        {ticket.assignedTo?.username || <span className="text-teams-gray-dark italic">Sin asignar</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-dark-secondary">
                        {new Date(ticket.createdAt).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => navigate(`/tickets/${ticket._id}`)}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-teams-blue hover:bg-teams-blue-hover text-white rounded-lg font-semibold text-sm transition-colors duration-200"
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
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page === 1}
                  className="btn-secondary disabled:opacity-50"
                >
                  ← Anterior
                </button>

                <div className="text-dark-secondary text-sm">
                  Página <span className="font-semibold text-white">{pagination.page}</span> de{' '}
                  <span className="font-semibold text-white">{pagination.pages}</span>
                </div>

                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: Math.min(pagination.pages, prev.page + 1) }))}
                  disabled={pagination.page === pagination.pages}
                  className="btn-secondary disabled:opacity-50"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
