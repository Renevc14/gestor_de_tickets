/**
 * CONTROL DE ACCESO - Componente de Administración de Usuarios
 * Solo accesible por Administradores
 * Permite listar usuarios, cambiar roles y activar/desactivar cuentas
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI, getStoredUser, clearAuth } from '../services/api';

const UserManagement = () => {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    isActive: ''
  });
  const [editingUser, setEditingUser] = useState(null);
  const [newRole, setNewRole] = useState('');

  const roles = [
    { value: 'cliente', label: 'Cliente' },
    { value: 'agente_n1', label: 'Agente N1' },
    { value: 'agente_n2', label: 'Agente N2' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'administrador', label: 'Administrador' }
  ];

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (currentUser.role !== 'administrador') {
      navigate('/dashboard');
      return;
    }
    loadUsers();
  }, [filters]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (filters.role) params.role = filters.role;
      if (filters.isActive !== '') params.isActive = filters.isActive;

      const response = await userAPI.listUsers(params);
      setUsers(response.data.users);
    } catch (err) {
      setError(err.response?.data?.message || 'Error cargando usuarios');
      if (err.response?.status === 401) {
        clearAuth();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId) => {
    if (!newRole) return;

    try {
      setError('');
      setSuccess('');
      const response = await userAPI.updateRole(userId, newRole);
      setSuccess(response.data.message);
      setEditingUser(null);
      setNewRole('');
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Error actualizando rol');
    }
  };

  const handleStatusChange = async (userId, currentStatus) => {
    try {
      setError('');
      setSuccess('');
      const response = await userAPI.updateStatus(userId, !currentStatus);
      setSuccess(response.data.message);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Error actualizando estado');
    }
  };

  const getRoleBadgeClass = (role) => {
    const classes = {
      cliente: 'bg-gray-600 text-gray-200',
      agente_n1: 'bg-blue-600 text-blue-100',
      agente_n2: 'bg-indigo-600 text-indigo-100',
      supervisor: 'bg-purple-600 text-purple-100',
      administrador: 'bg-red-600 text-red-100'
    };
    return classes[role] || 'bg-gray-600 text-gray-200';
  };

  const getRoleLabel = (role) => {
    const found = roles.find(r => r.value === role);
    return found ? found.label : role;
  };

  return (
    <div className="min-h-screen bg-jira-bg">
      {/* Header */}
      <header className="page-header sticky top-0 z-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-jira-lg flex items-center justify-center shadow-jira-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-jira-text">Administración de Usuarios</h1>
                <p className="text-xs text-jira-text-subtlest">Gestión de roles y accesos</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-secondary"
              >
                Volver al Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Mensajes */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-jira text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-jira text-green-400">
            {success}
          </div>
        )}

        {/* Filtros */}
        <div className="card mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm text-jira-text-subtle mb-1">Filtrar por Rol</label>
              <select
                value={filters.role}
                onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                className="input-field w-48"
              >
                <option value="">Todos los roles</option>
                {roles.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-jira-text-subtle mb-1">Estado</label>
              <select
                value={filters.isActive}
                onChange={(e) => setFilters(prev => ({ ...prev, isActive: e.target.value }))}
                className="input-field w-48"
              >
                <option value="">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabla de usuarios */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-jira-text-subtle">
              <div className="animate-spin w-8 h-8 border-2 border-jira-blue border-t-transparent rounded-full mx-auto mb-4"></div>
              Cargando usuarios...
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-jira-text-subtle">
              No se encontraron usuarios
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-jira-raised border-b border-jira-border">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-jira-text-subtle">Usuario</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-jira-text-subtle">Email</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-jira-text-subtle">Rol</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-jira-text-subtle">MFA</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-jira-text-subtle">Estado</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-jira-text-subtle">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-jira-border">
                {users.map(user => (
                  <tr key={user._id} className="hover:bg-jira-hover transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-jira-blue rounded-full flex items-center justify-center text-white font-medium text-sm">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-jira-text font-medium">{user.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-jira-text-subtle">{user.email}</td>
                    <td className="px-4 py-3">
                      {editingUser === user._id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="input-field text-sm py-1"
                          >
                            <option value="">Seleccionar...</option>
                            {roles.map(role => (
                              <option key={role.value} value={role.value}>{role.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleRoleChange(user._id)}
                            className="text-green-400 hover:text-green-300"
                            title="Guardar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => { setEditingUser(null); setNewRole(''); }}
                            className="text-red-400 hover:text-red-300"
                            title="Cancelar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.mfaEnabled ? (
                        <span className="inline-flex items-center text-green-400 text-sm">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          Activo
                        </span>
                      ) : (
                        <span className="text-jira-text-subtlest text-sm">No configurado</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.isActive
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user._id !== currentUser.id && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setEditingUser(user._id); setNewRole(user.role); }}
                            className="text-jira-blue hover:text-blue-400 text-sm"
                            title="Cambiar rol"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleStatusChange(user._id, user.isActive)}
                            className={`text-sm ${user.isActive ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}
                            title={user.isActive ? 'Desactivar' : 'Activar'}
                          >
                            {user.isActive ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Leyenda de roles */}
        <div className="card mt-6">
          <h3 className="text-sm font-medium text-jira-text mb-3">Leyenda de Roles</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass('cliente')}`}>
                Cliente
              </span>
              <p className="text-jira-text-subtlest mt-1">Solo sus tickets</p>
            </div>
            <div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass('agente_n1')}`}>
                Agente N1
              </span>
              <p className="text-jira-text-subtlest mt-1">Soporte nivel 1</p>
            </div>
            <div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass('agente_n2')}`}>
                Agente N2
              </span>
              <p className="text-jira-text-subtlest mt-1">Soporte especializado</p>
            </div>
            <div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass('supervisor')}`}>
                Supervisor
              </span>
              <p className="text-jira-text-subtlest mt-1">Ve todos los tickets</p>
            </div>
            <div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass('administrador')}`}>
                Administrador
              </span>
              <p className="text-jira-text-subtlest mt-1">Acceso total</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserManagement;
