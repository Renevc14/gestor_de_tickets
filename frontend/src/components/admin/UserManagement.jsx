/**
 * UserManagement — Gestión de usuarios (solo ADMINISTRADOR)
 * Crear, editar rol/estado, desbloquear cuentas
 */

import React, { useState, useEffect } from 'react';
import { userAPI } from '../../services/api';

const ROLE_STYLE = {
  ADMINISTRADOR: { background: 'rgba(207,48,74,0.1)',   color: '#CF304A', borderColor: 'rgba(207,48,74,0.3)' },
  TECNICO:       { background: 'rgba(124,58,237,0.1)',  color: '#A78BFA', borderColor: 'rgba(124,58,237,0.3)' },
  SOLICITANTE:   { background: 'rgba(99,102,241,0.1)',  color: '#818CF8', borderColor: 'rgba(99,102,241,0.3)' }
};

const STATUS_STYLE = {
  ACTIVO:  { background: 'rgba(3,166,109,0.1)',   color: '#03A66D', borderColor: 'rgba(3,166,109,0.3)' },
  INACTIVO:{ background: 'rgba(132,142,156,0.1)', color: '#848E9C', borderColor: 'rgba(132,142,156,0.3)' }
};

// ─── Modal Crear Usuario ────────────────────────────────────────────────────
const CreateUserModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'SOLICITANTE' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await userAPI.createUser(form);
      onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Error creando usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Crear Usuario</h3>
          <button onClick={onClose} className="text-dark-secondary hover:text-white">✕</button>
        </div>

        {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="label">Nombre *</label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required className="input" placeholder="Nombre completo" />
          </div>
          <div className="form-group">
            <label className="label">Email *</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required className="input" placeholder="usuario@empresa.com" />
          </div>
          <div className="form-group">
            <label className="label">Contraseña *</label>
            <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required className="input" placeholder="Mínimo 12 caracteres" />
          </div>
          <div className="form-group">
            <label className="label">Rol *</label>
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className="input">
              <option value="SOLICITANTE">Solicitante</option>
              <option value="TECNICO">Técnico</option>
              <option value="ADMINISTRADOR">Administrador</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="flex-1 btn-primary disabled:opacity-50">
              {loading ? 'Creando...' : 'Crear Usuario'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Modal Editar Usuario ───────────────────────────────────────────────────
const EditUserModal = ({ user, onClose, onUpdated }) => {
  const [form, setForm] = useState({ name: user.name, role: user.role, status: user.status });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await userAPI.updateUser(user.id, form);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Error actualizando usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Editar Usuario</h3>
          <button onClick={onClose} className="text-dark-secondary hover:text-white">✕</button>
        </div>

        <p className="text-dark-secondary text-sm mb-4">{user.email}</p>

        {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="label">Nombre</label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input" />
          </div>
          <div className="form-group">
            <label className="label">Rol</label>
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className="input">
              <option value="SOLICITANTE">Solicitante</option>
              <option value="TECNICO">Técnico</option>
              <option value="ADMINISTRADOR">Administrador</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">Estado</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="input">
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="flex-1 btn-primary disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Componente principal ────────────────────────────────────────────────────
const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [filters, setFilters] = useState({ role: '', status: '' });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadUsers(); }, [filters]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.listUsers(filters);
      setUsers(response.data.users);
    } catch {
      setError('Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (userId) => {
    try {
      await userAPI.unlockUser(userId);
      loadUsers();
    } catch {
      setError('Error desbloqueando usuario');
    }
  };

  return (
    <div className="space-y-6">
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={loadUsers} />}
      {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} onUpdated={loadUsers} />}

      {/* Controles */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Gestión de Usuarios</h2>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Usuario
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="form-group">
            <label className="label">Rol</label>
            <select value={filters.role} onChange={e => setFilters(p => ({ ...p, role: e.target.value }))} className="input">
              <option value="">Todos</option>
              <option value="SOLICITANTE">Solicitante</option>
              <option value="TECNICO">Técnico</option>
              <option value="ADMINISTRADOR">Administrador</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">Estado</label>
            <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))} className="input">
              <option value="">Todos</option>
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => setFilters({ role: '', status: '' })} className="btn-secondary w-full">Limpiar</button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error"><span>{error}</span></div>}

      {loading ? (
        <div className="card text-center py-8"><div className="spinner mx-auto mb-2"></div><p className="text-dark-secondary">Cargando usuarios...</p></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-bg-tertiary">
                {['Nombre', 'Email', 'Rol', 'Estado', 'MFA', 'Último Login', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-teams-gray-dark uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-bg-tertiary">
              {users.map(u => (
                <tr key={u.id} className="table-row-hover">
                  <td className="px-4 py-3 text-sm font-medium text-white">{u.name}</td>
                  <td className="px-4 py-3 text-sm text-dark-secondary">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="badge" style={ROLE_STYLE[u.role] || { background: 'rgba(132,142,156,0.1)', color: '#848E9C', borderColor: 'rgba(132,142,156,0.3)' }}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge" style={STATUS_STYLE[u.status] || { background: 'rgba(132,142,156,0.1)', color: '#848E9C', borderColor: 'rgba(132,142,156,0.3)' }}>{u.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {u.mfa_enabled
                      ? <span className="badge" style={{ background:'rgba(3,166,109,0.1)', color:'#03A66D', borderColor:'rgba(3,166,109,0.3)' }}>Activo</span>
                      : <span className="badge" style={{ background:'rgba(132,142,156,0.1)', color:'#848E9C', borderColor:'rgba(132,142,156,0.25)' }}>No</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-sm text-dark-secondary">
                    {u.last_login ? new Date(u.last_login).toLocaleDateString('es-ES') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setEditUser(u)} className="px-2 py-1 bg-teams-blue hover:bg-teams-blue-hover text-white rounded text-xs font-semibold transition-colors">
                        Editar
                      </button>
                      {u.lock_until && new Date(u.lock_until) > new Date() && (
                        <button onClick={() => handleUnlock(u.id)} className="px-2 py-1 bg-yellow-700 hover:bg-yellow-600 text-white rounded text-xs font-semibold transition-colors">
                          Desbloquear
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="text-center text-dark-secondary py-8">No se encontraron usuarios</p>
          )}
        </div>
      )}
    </div>
  );
};

export default UserManagement;
