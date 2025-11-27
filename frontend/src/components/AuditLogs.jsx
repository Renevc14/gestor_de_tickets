/**
 * NO REPUDIO - Componente de Logs de Auditoría
 * Solo accessible para admin y supervisor
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auditAPI, getStoredUser, clearAuth } from '../services/api';

const AuditLogs = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({});
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    // Verificar autenticación y rol
    if (!user) {
      navigate('/login');
      return;
    }

    if (!['administrador', 'supervisor'].includes(user.role)) {
      navigate('/dashboard');
      return;
    }

    loadLogs();
    loadStats();
  }, [filters.action, filters.resource, filters.page]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await auditAPI.listLogs({
        ...filters,
        page: filters.page,
        limit: filters.limit
      });

      setLogs(response.data.logs);
      setPagination(response.data.pagination);
    } catch (err) {
      setError('Error cargando logs de auditoría');
      if (err.response?.status === 401) {
        clearAuth();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await auditAPI.getStats();
      setStats(response.data.stats);
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  const getActionColor = (action) => {
    const colors = {
      login_success: '#4caf50',
      login_failed: '#f44336',
      login_blocked: '#ff9800',
      ticket_created: '#2196f3',
      ticket_updated: '#9c27b0',
      permission_denied: '#f44336'
    };
    return colors[action] || '#666';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES');
  };

  const getActionBadgeClass = (action) => {
    const classes = {
      login_success: 'bg-teams-green text-green-100',
      login_failed: 'bg-teams-red text-red-100',
      login_blocked: 'bg-teams-orange text-orange-100',
      ticket_created: 'bg-blue-900 text-blue-100',
      ticket_updated: 'bg-purple-900 text-purple-100',
      permission_denied: 'bg-teams-red text-red-100'
    };
    return classes[action] || 'bg-gray-700 text-gray-100';
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
                <h1 className="text-3xl font-bold text-white">Logs de Auditoría</h1>
                <p className="text-blue-100 text-sm mt-1">Registro de eventos del sistema</p>
              </div>
            </div>
            <button
              onClick={() => setShowStats(!showStats)}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold transition-colors duration-200"
            >
              {showStats ? '▼' : '▶'} {showStats ? 'Ocultar' : 'Mostrar'} Estadísticas
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Statistics Section */}
        {showStats && stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-teams-gray-dark uppercase">Total de Eventos</h3>
                <svg className="w-5 h-5 text-teams-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalEvents}</p>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-teams-gray-dark uppercase">Intentos Fallidos</h3>
                <svg className="w-5 h-5 text-teams-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2m0-14a9 9 0 110 18 9 9 0 010-18z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-teams-red">{stats.failedAttempts}</p>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-teams-gray-dark uppercase">Tasa de Éxito</h3>
                <svg className="w-5 h-5 text-teams-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold text-teams-green">{stats.successRate}</p>
            </div>
          </div>
        )}

        {/* Filters Section */}
        <div className="card mb-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-teams-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtros
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-group">
              <label className="label">Acción</label>
              <select
                name="action"
                value={filters.action}
                onChange={handleFilterChange}
                className="input"
              >
                <option value="">Mostrar todas</option>
                <option value="login_success">Login Exitoso</option>
                <option value="login_failed">Login Fallido</option>
                <option value="ticket_created">Ticket Creado</option>
                <option value="ticket_updated">Ticket Actualizado</option>
                <option value="permission_denied">Permiso Denegado</option>
              </select>
            </div>

            <div className="form-group">
              <label className="label">Recurso</label>
              <select
                name="resource"
                value={filters.resource}
                onChange={handleFilterChange}
                className="input"
              >
                <option value="">Mostrar todos</option>
                <option value="user">Usuario</option>
                <option value="ticket">Ticket</option>
                <option value="system">Sistema</option>
              </select>
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

        {/* Logs Table */}
        {loading ? (
          <div className="card flex items-center justify-center py-12">
            <div className="text-center">
              <div className="spinner mx-auto mb-4"></div>
              <p className="text-dark-secondary">Cargando logs...</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="card border-2 border-dashed border-dark-bg-secondary py-12">
            <div className="text-center">
              <svg className="w-16 h-16 text-dark-bg-secondary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-xl font-semibold text-white mb-2">No hay logs</h3>
              <p className="text-dark-secondary">No se encontraron registros con los filtros especificados</p>
            </div>
          </div>
        ) : (
          <>
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-bg-tertiary">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-teams-gray-dark uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-teams-gray-dark uppercase tracking-wider">Usuario</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-teams-gray-dark uppercase tracking-wider">Acción</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-teams-gray-dark uppercase tracking-wider">Recurso</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-teams-gray-dark uppercase tracking-wider">IP</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-teams-gray-dark uppercase tracking-wider">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-bg-tertiary">
                  {logs.map(log => (
                    <tr key={log._id} className={`table-row-hover ${log.success ? '' : 'bg-red-900 bg-opacity-10'}`}>
                      <td className="px-6 py-4 text-sm text-dark-secondary">{formatDate(log.timestamp)}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-teams-blue">{log.user?.username || 'Sistema'}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`badge ${getActionBadgeClass(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-dark-secondary capitalize">{log.resource}</td>
                      <td className="px-6 py-4 text-sm text-teams-gray-dark font-mono text-xs">{log.ipAddress}</td>
                      <td className="px-6 py-4 text-sm">
                        {log.success ? (
                          <span className="inline-flex items-center gap-1 text-teams-green font-semibold">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Éxito
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-teams-red font-semibold">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            Fallo
                          </span>
                        )}
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

export default AuditLogs;
