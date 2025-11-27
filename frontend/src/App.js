/**
 * Aplicación Principal - Rutas y Configuración
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getStoredUser } from './services/api';

// Componentes
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import CreateTicket from './components/CreateTicket';
import TicketDetail from './components/TicketDetail';
import AuditLogs from './components/AuditLogs';

/**
 * Componente de Ruta Protegida
 * Verifica autenticación antes de permitir acceso
 */
const ProtectedRoute = ({ children }) => {
  const user = getStoredUser();
  return user ? children : <Navigate to="/login" replace />;
};

/**
 * Componente de Ruta Admin/Supervisor
 */
const AdminRoute = ({ children }) => {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!['administrador', 'supervisor'].includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Rutas protegidas */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tickets/create"
          element={
            <ProtectedRoute>
              <CreateTicket />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tickets/:id"
          element={
            <ProtectedRoute>
              <TicketDetail />
            </ProtectedRoute>
          }
        />

        {/* Rutas de admin/supervisor */}
        <Route
          path="/audit-logs"
          element={
            <AdminRoute>
              <AuditLogs />
            </AdminRoute>
          }
        />

        {/* Ruta por defecto */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
