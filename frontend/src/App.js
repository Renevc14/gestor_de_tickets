/**
 * App.js — Rutas principales
 * Monografía UCB: 3 roles — SOLICITANTE, TECNICO, ADMINISTRADOR
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { getStoredUser } from './services/api';

// Componentes existentes
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import CreateTicket from './components/CreateTicket';
import TicketDetail from './components/TicketDetail';
import AuditLogs from './components/AuditLogs';
import MFASetup from './components/MFASetup';

// Panel de administración (nuevos)
import AdminPanel from './components/admin/AdminPanel';

/**
 * Wrapper para MFASetup: redirige al dashboard al completar
 */
const MFASetupWrapper = () => {
  const navigate = useNavigate();
  return <MFASetup onComplete={() => navigate('/dashboard')} />;
};

/**
 * Ruta protegida — requiere autenticación
 */
const ProtectedRoute = ({ children }) => {
  const user = getStoredUser();
  return user ? children : <Navigate to="/login" replace />;
};

/**
 * Ruta solo para ADMINISTRADOR
 */
const AdminRoute = ({ children }) => {
  const user = getStoredUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMINISTRADOR') return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Rutas protegidas (todos los roles) */}
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/tickets/create" element={
          <ProtectedRoute><CreateTicket /></ProtectedRoute>
        } />
        <Route path="/tickets/:id" element={
          <ProtectedRoute><TicketDetail /></ProtectedRoute>
        } />

        {/* MFA Setup — todos los usuarios autenticados */}
        <Route path="/mfa-setup" element={
          <ProtectedRoute><MFASetupWrapper /></ProtectedRoute>
        } />

        {/* Rutas ADMINISTRADOR */}
        <Route path="/audit-logs" element={
          <AdminRoute><AuditLogs /></AdminRoute>
        } />
        <Route path="/admin" element={
          <AdminRoute><AdminPanel /></AdminRoute>
        } />
        <Route path="/admin/:tab" element={
          <AdminRoute><AdminPanel /></AdminRoute>
        } />

        {/* Ruta por defecto */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
