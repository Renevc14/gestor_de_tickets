/**
 * AUTENTICACION - Componente de Login
 * Maneja login con soporte para MFA
 * Diseno inspirado en Jira Dark Mode
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
    // Solo permitir numeros y maximo 6 digitos
    if (/^\d*$/.test(value) && value.length <= 6) {
      setMfaData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(formData.username, formData.password);

      if (response.data.mfaRequired) {
        setMfaData({ userId: response.data.userId, mfaCode: '' });
        setShowMFA(true);
      } else {
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
      const response = await authAPI.verifyLoginMFA(mfaData.userId, mfaData.mfaCode);
      setToken(response.data.token, response.data.refreshToken, response.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Codigo MFA invalido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-jira-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-jira-blue/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-jira-purple/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Header */}
        <div className="text-center mb-8 animate-fade-in-down">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-jira-blue to-jira-purple rounded-2xl mb-4 shadow-jira-lg animate-float">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-jira-text mb-2">
            <span className="text-gradient">Ticket</span> Manager
          </h1>
          <p className="text-jira-text-subtle text-sm">Sistema de Gestion de Incidentes</p>
        </div>

        {/* Auth Card */}
        <div className="card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="card-body">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-jira-text mb-1">
                {showMFA ? 'Verificacion de Seguridad' : 'Iniciar Sesion'}
              </h2>
              <p className="text-jira-text-subtle text-sm">
                {showMFA ? 'Ingrese el codigo de su aplicacion autenticadora' : 'Acceda a su cuenta para continuar'}
              </p>
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

            {!showMFA ? (
              <form onSubmit={handleLogin} className="space-y-5">
                {/* Username */}
                <div className="form-group">
                  <label className="label">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-jira-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Usuario
                    </span>
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    placeholder="Ingrese su usuario"
                    className="input"
                    autoComplete="username"
                  />
                </div>

                {/* Password */}
                <div className="form-group">
                  <label className="label">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-jira-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Contrasena
                    </span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Ingrese su contrasena"
                    className="input"
                    autoComplete="current-password"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 text-base"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Iniciando sesion...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Iniciar Sesion
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </span>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleMFASubmit} className="space-y-5">
                {/* MFA Icon */}
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 rounded-full bg-jira-blue-subtle flex items-center justify-center animate-bounce-in">
                    <svg className="w-10 h-10 text-jira-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>

                {/* MFA Code Input */}
                <div className="form-group">
                  <label className="label text-center block">Codigo de 6 digitos</label>
                  <input
                    type="text"
                    name="mfaCode"
                    value={mfaData.mfaCode}
                    onChange={handleMFAChange}
                    maxLength="6"
                    required
                    placeholder="000000"
                    className="input text-center text-3xl tracking-[0.5em] font-mono py-4"
                    autoComplete="one-time-code"
                    autoFocus
                  />
                </div>

                {/* MFA Info */}
                <div className="alert alert-warning">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm">
                    <p className="font-semibold">Autenticacion de dos factores</p>
                    <p className="opacity-80">Abra Google Authenticator o Authy para obtener el codigo</p>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMFA(false);
                      setError('');
                    }}
                    className="btn-secondary flex-1 py-3"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={loading || mfaData.mfaCode.length !== 6}
                    className="btn-primary flex-1 py-3"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Verificando...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Verificar
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Register Link */}
            {!showMFA && (
              <div className="mt-6 pt-6 border-t border-jira-border text-center">
                <p className="text-jira-text-subtle text-sm">
                  No tiene cuenta?{' '}
                  <a href="/register" className="link font-semibold">
                    Registrese aqui
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-jira-text-subtlest text-xs animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Sistema protegido con autenticacion de dos factores</span>
          </div>
          <p className="opacity-60">Ticket Manager v1.0 - Seguridad OWASP</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
