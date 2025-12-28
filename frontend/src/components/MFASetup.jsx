/**
 * AUTENTICACION - Componente de Configuracion MFA
 * Muestra QR code y permite verificacion con Google Authenticator
 * Diseno inspirado en Jira Dark Mode
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
      // AUTENTICACION - Verificar codigo TOTP
      await authAPI.verifyMFA(mfaCode);
      setStep(3); // Paso completado
      if (onComplete) {
        onComplete(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Codigo MFA invalido');
    } finally {
      setLoading(false);
    }
  };

  const handleMFAChange = (e) => {
    const value = e.target.value;
    // Solo permitir numeros
    if (/^\d*$/.test(value) && value.length <= 6) {
      setMfaCode(value);
    }
  };

  return (
    <div className="min-h-screen bg-jira-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-jira-purple/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-jira-blue/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-jira-green/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Header */}
        <div className="text-center mb-8 animate-fade-in-down">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-jira-green to-jira-teal rounded-2xl mb-4 shadow-jira-lg animate-float">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-jira-text mb-2">
            <span className="text-gradient">Proteccion</span> de Cuenta
          </h1>
          <p className="text-jira-text-subtle text-sm">Autenticacion de dos factores (2FA)</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-all duration-300 ${
                  step >= s
                    ? 'bg-jira-green text-white'
                    : 'bg-jira-bg-hover text-jira-text-subtle border border-jira-border'
                }`}>
                  {step > s ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : s}
                </div>
                {s < 3 && (
                  <div className={`w-12 h-0.5 transition-colors duration-300 ${
                    step > s ? 'bg-jira-green' : 'bg-jira-border'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between mt-2 px-2 text-xs text-jira-text-subtlest">
            <span>Generar</span>
            <span>Verificar</span>
            <span>Listo</span>
          </div>
        </div>

        {/* MFA Card */}
        <div className="card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="card-body">
            {/* Error Alert */}
            {error && (
              <div className="alert alert-error mb-6 animate-scale-in">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Step 1: QR Code */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-jira-text mb-1">Escanear Codigo QR</h2>
                  <p className="text-jira-text-subtle text-sm">Use su aplicacion de autenticacion</p>
                </div>

                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-10 h-10 border-4 border-jira-green border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : qrCode ? (
                  <div className="flex justify-center">
                    <div className="p-4 bg-white rounded-xl shadow-jira-lg">
                      <img src={qrCode} alt="QR Code MFA" className="w-48 h-48" />
                    </div>
                  </div>
                ) : null}

                <div className="text-center">
                  <p className="text-sm text-jira-text-subtle">
                    Escanee con <span className="text-jira-text font-medium">Google Authenticator</span>,{' '}
                    <span className="text-jira-text font-medium">Authy</span>, o cualquier app TOTP
                  </p>
                </div>

                {/* Manual Key Section */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowManualKey(!showManualKey)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm text-jira-blue hover:text-jira-blue-hover transition-colors"
                  >
                    <svg className={`w-4 h-4 transition-transform duration-200 ${showManualKey ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {showManualKey ? 'Ocultar clave manual' : 'No puedo escanear, mostrar clave'}
                  </button>

                  {showManualKey && (
                    <div className="mt-3 p-4 rounded-lg bg-jira-bg border border-jira-border animate-fade-in">
                      <p className="text-xs text-jira-text-subtlest mb-2">Ingrese esta clave manualmente en su app:</p>
                      <div className="relative">
                        <code className="block text-center py-3 px-4 bg-jira-bg-hover rounded-lg text-jira-blue font-mono text-sm break-all select-all">
                          {manualKey}
                        </code>
                      </div>
                      <div className="mt-3 flex items-start gap-2 text-xs text-jira-orange">
                        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>Guarde esta clave en un lugar seguro. La necesitara si pierde acceso a su dispositivo.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => setStep(2)}
                  disabled={!qrCode || loading}
                  className="btn-primary w-full py-3"
                >
                  <span className="flex items-center justify-center gap-2">
                    Continuar
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                </button>
              </div>
            )}

            {/* Step 2: Verify Code */}
            {step === 2 && (
              <form onSubmit={handleVerifyMFA} className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-jira-blue-subtle flex items-center justify-center mx-auto mb-4 animate-bounce-in">
                    <svg className="w-8 h-8 text-jira-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-jira-text mb-1">Verificar Codigo</h2>
                  <p className="text-jira-text-subtle text-sm">Ingrese el codigo de 6 digitos de su app</p>
                </div>

                <div className="form-group">
                  <input
                    type="text"
                    value={mfaCode}
                    onChange={handleMFAChange}
                    maxLength="6"
                    placeholder="000000"
                    required
                    className="input text-center text-3xl tracking-[0.5em] font-mono py-4"
                    autoComplete="one-time-code"
                    autoFocus
                  />
                </div>

                {/* Info Box */}
                <div className="p-4 rounded-lg bg-jira-blue-subtle border border-jira-blue/20">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-jira-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm text-jira-blue font-medium mb-1">Consejo de seguridad</p>
                      <p className="text-xs text-jira-blue/80">
                        Guarde los codigos de recuperacion en un lugar seguro. Los necesitara si pierde acceso a su dispositivo.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn-secondary flex-1 py-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Atras
                  </button>
                  <button
                    type="submit"
                    disabled={loading || mfaCode.length !== 6}
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

            {/* Step 3: Success */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center py-4">
                  <div className="w-20 h-20 rounded-full bg-jira-green/10 flex items-center justify-center mx-auto mb-4 animate-bounce-in">
                    <svg className="w-10 h-10 text-jira-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-jira-text mb-2">Configuracion Exitosa</h2>
                  <p className="text-jira-text-subtle">La autenticacion de dos factores esta activa</p>
                </div>

                <div className="p-4 rounded-lg bg-jira-green/10 border border-jira-green/20">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-jira-green flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <div>
                      <p className="text-sm text-jira-green font-medium mb-1">Su cuenta esta protegida</p>
                      <p className="text-xs text-jira-green/80">
                        A partir de ahora, necesitara el codigo de su aplicacion autenticadora cada vez que inicie sesion.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Security Tips */}
                <div className="p-4 rounded-lg bg-jira-bg border border-jira-border">
                  <h4 className="text-sm font-medium text-jira-text mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-jira-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Recomendaciones de seguridad
                  </h4>
                  <ul className="text-xs text-jira-text-subtle space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-jira-blue" />
                      Mantenga su aplicacion autenticadora actualizada
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-jira-blue" />
                      No comparta su clave secreta con nadie
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-jira-blue" />
                      Guarde los codigos de recuperacion en un lugar seguro
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => {
                    if (onComplete) onComplete(true);
                  }}
                  className="btn-primary w-full py-3"
                >
                  <span className="flex items-center justify-center gap-2">
                    Continuar al Dashboard
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                </button>
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
            <span>Su seguridad es nuestra prioridad</span>
          </div>
          <p className="opacity-60">Autenticacion TOTP compatible con RFC 6238</p>
        </div>
      </div>
    </div>
  );
};

export default MFASetup;
