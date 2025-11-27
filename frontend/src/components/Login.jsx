/**
 * AUTENTICACIÓN - Componente de Login
 * Maneja login con soporte para MFA
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, setToken } from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', password: '' });
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
      const response = await authAPI.login(formData.username, formData.password);

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
    <div className="min-h-screen bg-gradient-to-br from-teams-blue via-dark-bg to-dark-bg-tertiary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-teams-blue rounded-lg mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m0 0h6m-6 0h-6" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Ticket Manager</h1>
          <p className="text-teams-gray text-sm">Sistema de Gestión de Incidentes</p>
        </div>

        {/* Auth Box */}
        <div className="bg-dark-bg-secondary border border-dark-bg-tertiary rounded-2xl p-8 shadow-teams-lg">
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
              {/* Username Input */}
              <div className="form-group">
                <label className="label">Nombre de Usuario</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder="admin"
                  className="input"
                  autoComplete="username"
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
            <div className="mt-6 pt-6 border-t border-dark-bg-tertiary text-center">
              <p className="text-teams-gray-dark text-sm">
                ¿No tiene cuenta?{' '}
                <a href="/register" className="text-teams-blue hover:text-teams-blue-hover font-semibold transition-colors">
                  Regístrese aquí
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-teams-gray-dark text-xs">
          <p>Sistema seguro con autenticación de dos factores</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
