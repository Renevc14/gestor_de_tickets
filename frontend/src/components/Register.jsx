/**
 * AUTENTICACIÓN - Componente de Registro
 * Valida política de contraseñas en tiempo real
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

    // INTEGRIDAD - Validar contraseña en tiempo real
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validaciones básicas
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Todos los campos son requeridos');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (!isPasswordValid) {
      setError('La contraseña no cumple con los requisitos');
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

      // Registro exitoso
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Error en el registro');
    } finally {
      setLoading(false);
    }
  };

  const Requirement = ({ met, text }) => (
    <div className={`flex items-center gap-2 text-sm py-1 ${met ? 'text-teams-green' : 'text-teams-red'}`}>
      <span className="font-bold">{met ? '✓' : '✗'}</span>
      <span>{text}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-teams-blue via-dark-bg to-dark-bg-tertiary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-teams-blue rounded-lg mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Ticket Manager</h1>
          <p className="text-teams-gray text-sm">Crear nueva cuenta</p>
        </div>

        {/* Register Box */}
        <div className="bg-dark-bg-secondary border border-dark-bg-tertiary rounded-2xl p-8 shadow-teams-lg">
          <h2 className="text-2xl font-bold text-white mb-1">Registrarse</h2>
          <p className="text-teams-gray-dark text-sm mb-6">Cree su cuenta de seguridad</p>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-error mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="form-group">
              <label className="label">Nombre de Usuario</label>
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
              <p className="text-xs text-teams-gray-dark mt-1">Mínimo 3 caracteres</p>
            </div>

            {/* Email Input */}
            <div className="form-group">
              <label className="label">Correo Electrónico</label>
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

            {/* Password Input */}
            <div className="form-group">
              <label className="label">Contraseña</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Crear contraseña segura"
                className="input"
                autoComplete="new-password"
              />

              {/* INTEGRIDAD - Mostrar requisitos de contraseña */}
              <div className="bg-dark-bg-tertiary border border-dark-bg-secondary rounded-lg p-4 mt-3">
                <p className="text-xs font-semibold text-dark-primary mb-3">Requisitos de contraseña:</p>
                <div className="space-y-2">
                  <Requirement met={passwordRequirements.minLength} text="Mínimo 12 caracteres" />
                  <Requirement met={passwordRequirements.hasUppercase} text="Al menos una mayúscula (A-Z)" />
                  <Requirement met={passwordRequirements.hasLowercase} text="Al menos una minúscula (a-z)" />
                  <Requirement met={passwordRequirements.hasNumbers} text="Al menos un número (0-9)" />
                  <Requirement met={passwordRequirements.hasSpecialChars} text="Carácter especial (!@#$%^&*)" />
                </div>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="form-group">
              <label className="label">Confirmar Contraseña</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Repita la contraseña"
                className="input"
                autoComplete="new-password"
              />
              {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-teams-red mt-2">Las contraseñas no coinciden</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isPasswordValid || formData.password !== formData.confirmPassword}
              className="w-full btn-primary mt-6 flex items-center justify-center disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registrando...
                </>
              ) : (
                'Crear Cuenta'
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 pt-6 border-t border-dark-bg-tertiary text-center">
            <p className="text-teams-gray-dark text-sm">
              ¿Ya tiene cuenta?{' '}
              <a href="/login" className="text-teams-blue hover:text-teams-blue-hover font-semibold transition-colors">
                Inicie sesión aquí
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-teams-gray-dark text-xs">
          <p>Sus datos están protegidos con encriptación de extremo a extremo</p>
        </div>
      </div>
    </div>
  );
};

export default Register;
