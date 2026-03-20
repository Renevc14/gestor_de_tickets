/**
 * AUTENTICACIÓN - Componente de Registro
 * Valida política de contraseñas en tiempo real
 */

import React, { useState } from 'react';
import TicketFlowLogo from './Logo';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
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
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
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
      await authAPI.register(formData.name, formData.email, formData.password);

      // Registro exitoso
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Error en el registro');
    } finally {
      setLoading(false);
    }
  };

  const Requirement = ({ met, text }) => (
    <div className="flex items-center gap-2 text-xs py-0.5 transition-colors duration-200"
         style={{ color: met ? '#03A66D' : '#848E9C' }}>
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {met
          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
        }
      </svg>
      <span>{text}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4"
         style={{ backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.12), transparent)' }}>
      <div className="w-full max-w-[400px]">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <TicketFlowLogo size={48} className="mb-5" />
          <h1 className="text-2xl font-bold text-white tracking-tight">TicketFlow</h1>
          <p className="text-zinc-500 text-sm mt-1">Crear nueva cuenta</p>
        </div>

        {/* Register Box */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-teams-lg">
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
            {/* Name Input */}
            <div className="form-group">
              <label className="label">Nombre Completo</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="ej: Juan Pérez"
                className="input"
                autoComplete="name"
              />
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
          <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
            <p className="text-zinc-500 text-sm">
              ¿Ya tiene cuenta?{' '}
              <a href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                Inicie sesión aquí
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-zinc-600 text-xs">
          <p>Sus datos están protegidos · bcrypt + JWT · TicketFlow 2025</p>
        </div>
      </div>
    </div>
  );
};

export default Register;
