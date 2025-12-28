/**
 * AUTENTICACION - Componente de Registro
 * Valida politica de contrasenas en tiempo real
 * Diseno inspirado en Jira Dark Mode
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumbers: false,
    hasSpecialChars: false
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'password') {
      setPasswordRequirements({
        minLength: value.length >= 12,
        hasUppercase: /[A-Z]/.test(value),
        hasLowercase: /[a-z]/.test(value),
        hasNumbers: /\d/.test(value),
        hasSpecialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)
      });
    }
  };

  const isPasswordValid = Object.values(passwordRequirements).every(req => req === true);
  const passwordsMatch = formData.password === formData.confirmPassword;
  const completedRequirements = Object.values(passwordRequirements).filter(Boolean).length;
  const progressPercent = (completedRequirements / 5) * 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Todos los campos son requeridos');
      setLoading(false);
      return;
    }

    if (!passwordsMatch) {
      setError('Las contrasenas no coinciden');
      setLoading(false);
      return;
    }

    if (!isPasswordValid) {
      setError('La contrasena no cumple con los requisitos');
      setLoading(false);
      return;
    }

    try {
      await authAPI.register(
        formData.username,
        formData.email,
        formData.password,
        formData.confirmPassword
      );
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Error en el registro');
    } finally {
      setLoading(false);
    }
  };

  const Requirement = ({ met, text }) => (
    <div className={`flex items-center gap-3 py-1.5 transition-all duration-300 ${met ? 'opacity-100' : 'opacity-60'}`}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${
        met ? 'bg-jira-green text-jira-text-inverse' : 'bg-jira-bg-elevated text-jira-text-subtlest'
      }`}>
        {met ? (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      <span className={`text-sm ${met ? 'text-jira-green' : 'text-jira-text-subtle'}`}>{text}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-jira-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-jira-purple/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-jira-blue/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Header */}
        <div className="text-center mb-8 animate-fade-in-down">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-jira-purple to-jira-blue rounded-2xl mb-4 shadow-jira-lg animate-float">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-jira-text mb-2">
            Crear <span className="text-gradient">Cuenta</span>
          </h1>
          <p className="text-jira-text-subtle text-sm">Registrese para acceder al sistema</p>
        </div>

        {/* Register Card */}
        <div className="card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="card-body">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-jira-text mb-1">Registro</h2>
              <p className="text-jira-text-subtle text-sm">Complete el formulario para crear su cuenta</p>
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

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div className="form-group">
                <label className="label">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-jira-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Nombre de Usuario
                  </span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder="ej: juan_perez"
                  className="input"
                  minLength="3"
                  autoComplete="username"
                />
                <p className="form-hint">Minimo 3 caracteres, sin espacios</p>
              </div>

              {/* Email */}
              <div className="form-group">
                <label className="label">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-jira-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Correo Electronico
                  </span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="email@ejemplo.com"
                  className="input"
                  autoComplete="email"
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
                  placeholder="Crear contrasena segura"
                  className={`input ${formData.password ? (isPasswordValid ? 'input-success' : 'input-error') : ''}`}
                  autoComplete="new-password"
                />

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-3 animate-fade-in">
                    {/* Progress Bar */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1 progress">
                        <div
                          className={`progress-bar transition-all duration-500 ${
                            progressPercent <= 40 ? 'bg-jira-red' :
                            progressPercent <= 80 ? 'bg-jira-yellow' :
                            'bg-jira-green'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        progressPercent <= 40 ? 'text-jira-red' :
                        progressPercent <= 80 ? 'text-jira-yellow' :
                        'text-jira-green'
                      }`}>
                        {progressPercent <= 40 ? 'Debil' : progressPercent <= 80 ? 'Media' : 'Fuerte'}
                      </span>
                    </div>

                    {/* Requirements */}
                    <div className="bg-jira-bg-elevated border border-jira-border rounded-jira-lg p-4">
                      <p className="text-xs font-semibold text-jira-text mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-jira-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Requisitos de seguridad
                      </p>
                      <div className="space-y-1">
                        <Requirement met={passwordRequirements.minLength} text="Minimo 12 caracteres" />
                        <Requirement met={passwordRequirements.hasUppercase} text="Al menos una mayuscula (A-Z)" />
                        <Requirement met={passwordRequirements.hasLowercase} text="Al menos una minuscula (a-z)" />
                        <Requirement met={passwordRequirements.hasNumbers} text="Al menos un numero (0-9)" />
                        <Requirement met={passwordRequirements.hasSpecialChars} text="Caracter especial (!@#$%^&*)" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="form-group">
                <label className="label">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-jira-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Confirmar Contrasena
                  </span>
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Repita la contrasena"
                  className={`input ${formData.confirmPassword ? (passwordsMatch ? 'input-success' : 'input-error') : ''}`}
                  autoComplete="new-password"
                />
                {formData.confirmPassword && !passwordsMatch && (
                  <p className="form-error animate-fade-in">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Las contrasenas no coinciden
                  </p>
                )}
                {formData.confirmPassword && passwordsMatch && (
                  <p className="mt-1.5 text-sm text-jira-green flex items-center gap-1 animate-fade-in">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Las contrasenas coinciden
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !isPasswordValid || !passwordsMatch}
                className="btn-primary w-full py-3 text-base"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creando cuenta...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Crear Cuenta
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </span>
                )}
              </button>
            </form>

            {/* Login Link */}
            <div className="mt-6 pt-6 border-t border-jira-border text-center">
              <p className="text-jira-text-subtle text-sm">
                Ya tiene cuenta?{' '}
                <a href="/login" className="link font-semibold">
                  Inicie sesion aqui
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-jira-text-subtlest text-xs animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Sus datos estan protegidos con encriptacion AES-256</span>
          </div>
          <p className="opacity-60">Ticket Manager v1.0 - Seguridad OWASP</p>
        </div>
      </div>
    </div>
  );
};

export default Register;
