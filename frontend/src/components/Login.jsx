/**
 * AUTENTICACIÓN - Componente de Login
 * Maneja login con soporte para MFA
 */

import React, { useState } from 'react';
import TicketFlowLogo from './Logo';
import { useNavigate } from 'react-router-dom';
import { authAPI, setToken } from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [mfaData, setMfaData] = useState({ userId: '', mfaCode: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMFA, setShowMFA] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMFAChange = (e) => {
    const { name, value } = e.target;
    setMfaData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(formData.email, formData.password);

      if (response.data.mfaRequired) {
        // AUTENTICACIÓN - Mostrar pantalla MFA
        setMfaData({ userId: response.data.userId, mfaCode: '' });
        setShowMFA(true);
      } else {
        // AUTENTICACIÓN - Login exitoso sin MFA
        setToken(response.data.token, response.data.refreshToken, response.data.user);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error en el login');
    } finally {
      setLoading(false);
    }
  };

  const handleMFASubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // AUTENTICACIÓN - Verificar código MFA
      const response = await authAPI.verifyLoginMFA(mfaData.userId, mfaData.mfaCode);
      setToken(response.data.token, response.data.refreshToken, response.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Código MFA inválido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4"
         style={{ backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.12), transparent)' }}>
      <div className="w-full max-w-[400px]">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <TicketFlowLogo size={48} className="mb-5" />
          <h1 className="text-2xl font-bold text-white tracking-tight">TicketFlow</h1>
          <p className="text-zinc-500 text-sm mt-1">Sistema de Gestión de Incidentes</p>
        </div>

        {/* Auth Box */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-teams-lg">
          <h2 className="text-2xl font-bold text-white mb-1">
            {showMFA ? 'Verificación de Seguridad' : 'Iniciar Sesión'}
          </h2>
          <p className="text-teams-gray-dark text-sm mb-6">
            {showMFA ? 'Ingrese el código de autenticación' : 'Acceda a su cuenta'}
          </p>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-error mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {!showMFA ? (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Input */}
              <div className="form-group">
                <label className="label">Correo Electrónico</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="admin@ticketflow.com"
                  className="input"
                  autoComplete="email"
                />
              </div>

              {/* Password Input */}
              <div className="form-group">
                <label className="label">Contraseña</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  className="input"
                  autoComplete="current-password"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary mt-6 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Cargando...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMFASubmit} className="space-y-4">
              {/* MFA Code Input */}
              <div className="form-group">
                <label className="label">Código de 6 dígitos</label>
                <input
                  type="text"
                  name="mfaCode"
                  value={mfaData.mfaCode}
                  onChange={handleMFAChange}
                  maxLength="6"
                  required
                  placeholder="000000"
                  className="input text-center tracking-widest text-2xl font-mono"
                  autoComplete="one-time-code"
                />
              </div>

              {/* MFA Warning */}
              <div className="bg-teams-orange bg-opacity-10 border-l-4 border-teams-orange text-teams-orange text-xs p-3 rounded">
                <p className="font-semibold mb-1">Verificación de dos factores</p>
                <p>Use su aplicación autenticadora (Google Authenticator, Authy, etc.)</p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-6">
                <button type="submit" disabled={loading} className="flex-1 btn-primary">
                  {loading ? 'Verificando...' : 'Verificar'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowMFA(false)}
                  className="flex-1 btn-secondary"
                >
                  Atrás
                </button>
              </div>
            </form>
          )}

          {/* Register Link */}
          {!showMFA && (
            <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
              <p className="text-zinc-500 text-sm">
                ¿No tiene cuenta?{' '}
                <a href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                  Regístrese aquí
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-zinc-600 text-xs">
          <p>Autenticación segura · JWT + MFA · TicketFlow 2025</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
