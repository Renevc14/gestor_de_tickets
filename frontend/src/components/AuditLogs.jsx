/**
 * NO REPUDIO - Componente de Logs de Auditoria
 * Solo accessible para admin y supervisor
 * Diseno inspirado en Jira Dark Mode
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
  const [showStats, setShowStats] = useState(true);

  useEffect(() => {
    // Verificar autenticacion y rol
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
      setError('Error cargando logs de auditoria');
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
      console.error('Error cargando estadisticas:', err);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES');
  };

  // Configuracion de acciones
  const actionConfig = {
    login_success: { color: 'text-jira-green', bg: 'bg-jira-green/10', icon: '✓', label: 'Login Exitoso' },
    login_failed: { color: 'text-jira-red', bg: 'bg-jira-red/10', icon: '✗', label: 'Login Fallido' },
    login_blocked: { color: 'text-jira-orange', bg: 'bg-jira-orange/10', icon: '⚠', label: 'Login Bloqueado' },
    ticket_created: { color: 'text-jira-blue', bg: 'bg-jira-blue/10', icon: '+', label: 'Ticket Creado' },
    ticket_updated: { color: 'text-jira-purple', bg: 'bg-jira-purple/10', icon: '✎', label: 'Ticket Actualizado' },
    permission_denied: { color: 'text-jira-red', bg: 'bg-jira-red/10', icon: '🚫', label: 'Permiso Denegado' },
    mfa_enabled: { color: 'text-jira-green', bg: 'bg-jira-green/10', icon: '🔐', label: 'MFA Habilitado' },
    mfa_disabled: { color: 'text-jira-orange', bg: 'bg-jira-orange/10', icon: '🔓', label: 'MFA Deshabilitado' }
  };

  const getActionConfig = (action) => {
    return actionConfig[action] || { color: 'text-jira-text-subtle', bg: 'bg-jira-bg-hover', icon: '•', label: action };
  };

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
                <h1 className="text-xl font-semibold text-jira-text flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-jira-orange to-jira-red flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </span>
                  Logs de Auditoria
                </h1>
                <p className="text-jira-text-subtle text-sm mt-0.5">Registro inmutable de eventos del sistema</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowStats(!showStats)}
                className={`btn-ghost ${showStats ? 'text-jira-blue bg-jira-blue-subtle' : ''}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Estadisticas
              </button>
              <button
                onClick={loadLogs}
                className="btn-secondary"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualizar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Statistics Section */}
        {showStats && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 animate-fade-in">
            <div className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-jira-text-subtlest uppercase tracking-wide mb-1">Total Eventos</p>
                    <p className="text-2xl font-bold text-jira-text">{stats.totalEvents?.toLocaleString()}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-jira-blue-subtle flex items-center justify-center">
                    <svg className="w-5 h-5 text-jira-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-jira-text-subtlest uppercase tracking-wide mb-1">Eventos Exitosos</p>
                    <p className="text-2xl font-bold text-jira-green">{stats.successfulEvents?.toLocaleString() || '-'}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-jira-green/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-jira-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-jira-text-subtlest uppercase tracking-wide mb-1">Intentos Fallidos</p>
                    <p className="text-2xl font-bold text-jira-red">{stats.failedAttempts?.toLocaleString()}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-jira-red/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-jira-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-jira-text-subtlest uppercase tracking-wide mb-1">Tasa de Exito</p>
                    <p className="text-2xl font-bold text-jira-teal">{stats.successRate}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-jira-teal/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-jira-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters Section */}
        <div className="card mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-jira-text-subtle uppercase tracking-wide flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filtros
              </h3>
              {(filters.action || filters.resource) && (
                <button
                  onClick={() => setFilters(prev => ({ ...prev, action: '', resource: '', page: 1 }))}
                  className="text-xs text-jira-blue hover:text-jira-blue-hover"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Accion</label>
                <select
                  name="action"
                  value={filters.action}
                  onChange={handleFilterChange}
                  className="input"
                >
                  <option value="">Todas las acciones</option>
                  <option value="login_success">Login Exitoso</option>
                  <option value="login_failed">Login Fallido</option>
                  <option value="login_blocked">Login Bloqueado</option>
                  <option value="ticket_created">Ticket Creado</option>
                  <option value="ticket_updated">Ticket Actualizado</option>
                  <option value="permission_denied">Permiso Denegado</option>
                  <option value="mfa_enabled">MFA Habilitado</option>
                  <option value="mfa_disabled">MFA Deshabilitado</option>
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
                  <option value="">Todos los recursos</option>
                  <option value="user">Usuario</option>
                  <option value="ticket">Ticket</option>
                  <option value="system">Sistema</option>
                  <option value="auth">Autenticacion</option>
                </select>
              </div>
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

        {/* Logs Table */}
        {loading ? (
          <div className="card animate-fade-in">
            <div className="card-body">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-jira-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-jira-text-subtle">Cargando logs de auditoria...</p>
                </div>
              </div>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="card animate-fade-in">
            <div className="card-body">
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-jira-bg-hover flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-jira-text-subtlest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-jira-text mb-2">No hay logs</h3>
                <p className="text-jira-text-subtle text-sm">No se encontraron registros con los filtros especificados</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="card animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-jira-border">
                      <th className="px-4 py-3 text-left text-xs font-medium text-jira-text-subtle uppercase tracking-wider">Timestamp</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-jira-text-subtle uppercase tracking-wider">Usuario</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-jira-text-subtle uppercase tracking-wider">Accion</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-jira-text-subtle uppercase tracking-wider">Recurso</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-jira-text-subtle uppercase tracking-wider">IP</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-jira-text-subtle uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-jira-border">
                    {logs.map((log, idx) => {
                      const config = getActionConfig(log.action);
                      return (
                        <tr
                          key={log._id}
                          className={`hover:bg-jira-bg-hover transition-colors ${!log.success ? 'bg-jira-red/5' : ''}`}
                          style={{ animationDelay: `${idx * 0.02}s` }}
                        >
                          <td className="px-4 py-3">
                            <div className="text-sm text-jira-text">{formatDate(log.timestamp)}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-jira-blue to-jira-purple flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-white">
                                  {log.user?.username?.charAt(0).toUpperCase() || 'S'}
                                </span>
                              </div>
                              <span className="text-sm font-medium text-jira-text">{log.user?.username || 'Sistema'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.color}`}>
                              <span>{config.icon}</span>
                              {config.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-jira-text-subtle capitalize">{log.resource}</span>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-xs font-mono text-jira-text-subtlest bg-jira-bg px-2 py-0.5 rounded">
                              {log.ipAddress}
                            </code>
                          </td>
                          <td className="px-4 py-3">
                            {log.success ? (
                              <span className="inline-flex items-center gap-1 text-jira-green text-sm font-medium">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Exito
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-jira-red text-sm font-medium">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                Fallo
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="mt-6 flex items-center justify-between animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <p className="text-sm text-jira-text-subtle">
                  Mostrando <span className="font-medium text-jira-text">{((pagination.page - 1) * filters.limit) + 1}</span> a{' '}
                  <span className="font-medium text-jira-text">{Math.min(pagination.page * filters.limit, pagination.total)}</span> de{' '}
                  <span className="font-medium text-jira-text">{pagination.total}</span> registros
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, page: 1 }))}
                    disabled={pagination.page === 1}
                    className="btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                    className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Anterior
                  </button>

                  <div className="flex items-center gap-1 px-3">
                    {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                      let pageNum;
                      if (pagination.pages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.pages - 2) {
                        pageNum = pagination.pages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }

                      return (
                        <button
                          key={i}
                          onClick={() => setFilters(prev => ({ ...prev, page: pageNum }))}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                            pagination.page === pageNum
                              ? 'bg-jira-blue text-white'
                              : 'text-jira-text-subtle hover:bg-jira-bg-hover'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setFilters(prev => ({ ...prev, page: Math.min(pagination.pages, prev.page + 1) }))}
                    disabled={pagination.page === pagination.pages}
                    className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Siguiente
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, page: pagination.pages }))}
                    disabled={pagination.page === pagination.pages}
                    className="btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Security Notice */}
        <div className="mt-8 p-4 rounded-lg bg-jira-bg-card border border-jira-border animate-fade-in" style={{ animationDelay: '0.25s' }}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-jira-orange/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-jira-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-jira-text mb-1">Registro de Auditoria Inmutable</h4>
              <p className="text-xs text-jira-text-subtle">
                Los logs de auditoria son inmutables y no pueden ser modificados ni eliminados.
                Cada evento incluye timestamp, usuario, IP y hash de integridad para cumplir con requisitos de no repudio (OWASP A09).
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AuditLogs;
