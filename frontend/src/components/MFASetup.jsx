/**
 * AUTENTICACIÓN - Componente de Configuración MFA
 * Muestra QR code y permite verificación con Google Authenticator
 */

import React, { useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const MFASetup = ({ onComplete }) => {
  const [step, setStep] = useState(1); // Paso 1: generar QR, Paso 2: verificar
  const [qrCode, setQrCode] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showManualKey, setShowManualKey] = useState(false);

  useEffect(() => {
    handleGenerateQR();
  }, []);

  const handleGenerateQR = async () => {
    try {
      setLoading(true);
      const response = await authAPI.setupMFA();
      setQrCode(response.data.qrCode);
      setManualKey(response.data.manualEntryKey);
    } catch (err) {
      setError('Error generando QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMFA = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // AUTENTICACIÓN - Verificar código TOTP
      await authAPI.verifyMFA(mfaCode);
      setStep(3); // Paso completado
      if (onComplete) {
        onComplete(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Código MFA inválido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teams-blue via-dark-bg to-dark-bg-tertiary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-teams-blue rounded-lg mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Protección de Cuenta</h1>
          <p className="text-teams-gray text-sm">Autenticación de dos factores</p>
        </div>

        {/* MFA Box */}
        <div className="bg-dark-bg-secondary border border-dark-bg-tertiary rounded-2xl p-8 shadow-teams-lg">
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

          {/* Step 1: QR Code */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Paso 1: Generar Código</h2>
                <p className="text-teams-gray-dark text-sm">Escanee el código QR con su aplicación</p>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="spinner"></div>
                </div>
              ) : qrCode ? (
                <div className="bg-white p-4 rounded-lg flex justify-center">
                  <img src={qrCode} alt="QR Code MFA" className="w-48 h-48" />
                </div>
              ) : null}

              <p className="text-sm text-teams-gray-dark text-center">
                Escanee este código con <strong>Google Authenticator</strong>, <strong>Authy</strong>, o cualquier aplicación TOTP
              </p>

              {/* Manual Key Section */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowManualKey(!showManualKey)}
                  className="w-full btn-secondary"
                >
                  {showManualKey ? '▼' : '▶'} {showManualKey ? 'Ocultar' : 'Mostrar'} clave manual
                </button>

                {showManualKey && (
                  <div className="bg-dark-bg-tertiary border border-dark-bg-secondary rounded-lg p-4 mt-3">
                    <p className="text-xs text-teams-gray-dark mb-2">Si no puede escanear, ingrese esta clave manualmente:</p>
                    <code className="bg-dark-bg px-3 py-2 rounded text-teams-blue font-mono text-sm block text-center break-all">
                      {manualKey}
                    </code>
                    <p className="text-xs text-teams-orange mt-3">
                      ⚠️ Guarde esta clave en un lugar seguro (contraseña, caja fuerte)
                    </p>
                  </div>
                )}
              </div>

              {/* Next Button */}
              <button
                onClick={() => setStep(2)}
                disabled={!qrCode || loading}
                className="w-full btn-primary"
              >
                Siguiente →
              </button>
            </div>
          )}

          {/* Step 2: Verify Code */}
          {step === 2 && (
            <form onSubmit={handleVerifyMFA} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Paso 2: Verificar Código</h2>
                <p className="text-teams-gray-dark text-sm">Ingrese el código de 6 dígitos</p>
              </div>

              <div className="form-group">
                <label className="label">Código de autenticación</label>
                <input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.slice(0, 6))}
                  maxLength="6"
                  placeholder="000000"
                  required
                  className="input text-center tracking-widest text-2xl font-mono"
                  autoComplete="one-time-code"
                />
                <p className="text-xs text-teams-gray-dark mt-2 text-center">Código del aplicativo en su teléfono</p>
              </div>

              {/* Info Box */}
              <div className="bg-teams-blue bg-opacity-10 border-l-4 border-teams-blue text-teams-blue text-xs p-3 rounded">
                <p className="font-semibold mb-1">Consejo de seguridad</p>
                <p>Guarde los códigos de recuperación en un lugar seguro. Los necesitará si pierde acceso al dispositivo.</p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading || mfaCode.length !== 6}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {loading ? 'Verificando...' : 'Verificar'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 btn-secondary"
                >
                  Atrás
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-teams-green bg-opacity-20 rounded-full mb-4">
                  <svg className="w-8 h-8 text-teams-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">¡Éxito!</h3>
                <p className="text-teams-gray-dark">Autenticación de dos factores habilitada</p>
              </div>

              <div className="bg-teams-green bg-opacity-10 border-l-4 border-teams-green text-teams-green text-sm p-4 rounded">
                <p className="font-semibold mb-1">Su cuenta está protegida</p>
                <p>Ahora usará autenticación de dos factores para todas sus sesiones futuras.</p>
              </div>

              <button
                onClick={() => {
                  if (onComplete) onComplete(true);
                }}
                className="w-full btn-primary"
              >
                Continuar
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-teams-gray-dark text-xs">
          <p>Su seguridad es nuestra prioridad</p>
        </div>
      </div>
    </div>
  );
};

export default MFASetup;
