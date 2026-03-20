/**
 * AdminPanel — Panel de Administracion con tabs
 * Tabs: Usuarios | Categorias | Auditoria
 */

import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { clearAuth } from '../../services/api';
import UserManagement from './UserManagement';
import CategoryManagement from './CategoryManagement';
import AuditLogs from '../AuditLogs';

const IconUsers = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const IconCategory = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

const IconAudit = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const TABS = [
  { id: 'users',      label: 'Usuarios',    Icon: IconUsers },
  { id: 'categories', label: 'Categorias',  Icon: IconCategory },
  { id: 'audit',      label: 'Auditoria',   Icon: IconAudit }
];

const AdminPanel = () => {
  const navigate = useNavigate();
  const { tab } = useParams();
  const [activeTab, setActiveTab] = useState(tab || 'users');

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    navigate(`/admin/${tabId}`, { replace: true });
  };

  const handleLogout = () => { clearAuth(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-dark-bg">
      <header className="bg-gradient-to-r from-teams-blue to-teams-blue-hover shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 rounded-lg transition-all duration-200 hover:bg-white/10"
                style={{ color: '#EAECEF' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold" style={{ color: '#EAECEF' }}>Panel de Administracion</h1>
                <p className="text-xs mt-0.5" style={{ color: '#848E9C' }}>Gestion de usuarios, categorias y auditoria</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="btn-danger px-3 py-1.5 text-xs"
            >
              Cerrar sesion
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-5 border-b" style={{ borderColor: 'rgba(43,49,57,0.8)' }}>
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-t-lg relative"
                style={activeTab === id
                  ? { color: '#F0B90B', borderBottom: '2px solid #F0B90B', marginBottom: '-1px' }
                  : { color: '#848E9C' }
                }
              >
                <Icon />
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'users'      && <UserManagement />}
        {activeTab === 'categories' && <CategoryManagement />}
        {activeTab === 'audit'      && <AuditLogs embedded />}
      </main>
    </div>
  );
};

export default AdminPanel;
