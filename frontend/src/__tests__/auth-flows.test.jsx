/**
 * AUTH FLOWS TEST SUITE — Frontend
 *
 * Cubre en un solo archivo:
 *   1. Login: renderizado, manejo de errores, loading state, login exitoso, flujo MFA completo
 *   2. Register: validación de requisitos en tiempo real, contraseñas no coinciden, registro exitoso
 *   3. Utilidades de sesión: setToken, clearAuth, getStoredUser, getStoredToken
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Mock del Logo para evitar errores de renderizado de SVG
jest.mock('../components/Logo', () => () => <div data-testid="logo" />);

// IMPORTANTE: jest.mock se hoista, así que las funciones mock se definen DENTRO del factory
// usando jest.fn() directamente — no se pueden referenciar variables externas aquí.
jest.mock('../services/api', () => ({
  authAPI: {
    login: jest.fn(),
    verifyLoginMFA: jest.fn(),
    register: jest.fn()
  },
  setToken: jest.fn(),
  clearAuth: jest.fn(),
  getStoredUser: jest.fn(),
  getStoredToken: jest.fn()
}));

// Importar los mocks ya configurados (estos son los jest.fn() del factory de arriba)
import { authAPI, setToken } from '../services/api';
import Login from '../components/Login';
import Register from '../components/Register';

// ─── Reset entre tests ────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  mockNavigate.mockClear();
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 1: Login component
// ═══════════════════════════════════════════════════════════════════════════════

describe('Login — flujo completo', () => {
  test('renderiza los elementos básicos del formulario', () => {
    render(<Login />);
    expect(screen.getByPlaceholderText('admin@ticketflow.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  test('botón está habilitado antes de hacer submit', () => {
    render(<Login />);
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).not.toBeDisabled();
  });

  test('muestra mensaje de error cuando la API rechaza con mensaje específico', async () => {
    authAPI.login.mockRejectedValueOnce({
      response: { data: { message: 'Email o contraseña incorrectos' } }
    });
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText('admin@ticketflow.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(screen.getByText('Email o contraseña incorrectos')).toBeInTheDocument();
    });
  });

  test('muestra error genérico cuando la API rechaza sin mensaje de respuesta', async () => {
    authAPI.login.mockRejectedValueOnce(new Error('Network Error'));
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText('admin@ticketflow.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(screen.getByText('Error en el login')).toBeInTheDocument();
    });
  });

  test('login exitoso: llama setToken y navega a /dashboard', async () => {
    authAPI.login.mockResolvedValueOnce({
      data: {
        token: 'jwt-token-abc',
        refreshToken: 'refresh-token-xyz',
        user: { id: 1, name: 'Admin', email: 'admin@test.com', role: 'ADMINISTRADOR' }
      }
    });
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText('admin@ticketflow.com'), { target: { value: 'admin@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'Admin@Test2024!' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(setToken).toHaveBeenCalledWith(
        'jwt-token-abc',
        'refresh-token-xyz',
        expect.objectContaining({ id: 1, role: 'ADMINISTRADOR' })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('botón muestra "Cargando..." y está deshabilitado durante el request', async () => {
    let resolveLogin;
    authAPI.login.mockReturnValueOnce(new Promise(resolve => { resolveLogin = resolve; }));

    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText('admin@ticketflow.com'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /cargando/i });
      expect(btn).toBeDisabled();
    });

    // Resolver para no dejar handles abiertos
    act(() => { resolveLogin({ data: { token: 't', refreshToken: 'r', user: {} } }); });
  });

  // ─── Flujo MFA ────────────────────────────────────────────────────────────

  test('cuando API responde mfaRequired=true, muestra formulario de código MFA', async () => {
    authAPI.login.mockResolvedValueOnce({
      data: { mfaRequired: true, userId: 42 }
    });
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText('admin@ticketflow.com'), { target: { value: 'mfa@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'Admin@Test2024!' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(screen.getByText('Verificación de Seguridad')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /iniciar sesión/i })).not.toBeInTheDocument();
  });

  test('formulario MFA: submit llama verifyLoginMFA con userId y código, luego navega', async () => {
    authAPI.login.mockResolvedValueOnce({ data: { mfaRequired: true, userId: 42 } });
    authAPI.verifyLoginMFA.mockResolvedValueOnce({
      data: { token: 'mfa-token', refreshToken: 'r', user: { id: 42 } }
    });

    render(<Login />);
    fireEvent.change(screen.getByPlaceholderText('admin@ticketflow.com'), { target: { value: 'mfa@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'Admin@Test2024!' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => expect(screen.getByPlaceholderText('000000')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /verificar/i }));

    await waitFor(() => {
      expect(authAPI.verifyLoginMFA).toHaveBeenCalledWith(42, '123456');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('botón "Atrás" en formulario MFA vuelve al form de login sin llamar API', async () => {
    authAPI.login.mockResolvedValueOnce({ data: { mfaRequired: true, userId: 42 } });
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText('admin@ticketflow.com'), { target: { value: 'mfa@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'Admin@Test2024!' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /atrás/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /atrás/i }));

    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(authAPI.verifyLoginMFA).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 2: Register component — validación en tiempo real
// ═══════════════════════════════════════════════════════════════════════════════

describe('Register — validación en tiempo real y flujo completo', () => {
  test('renderiza todos los campos del formulario', () => {
    render(<Register />);
    expect(screen.getByPlaceholderText('ej: Juan Pérez')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('email@ejemplo.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Crear contraseña segura')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Repita la contraseña')).toBeInTheDocument();
  });

  test('muestra todos los indicadores de requisitos de contraseña', () => {
    render(<Register />);
    expect(screen.getByText('Mínimo 12 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Al menos una mayúscula (A-Z)')).toBeInTheDocument();
    expect(screen.getByText('Al menos una minúscula (a-z)')).toBeInTheDocument();
    expect(screen.getByText('Al menos un número (0-9)')).toBeInTheDocument();
    expect(screen.getByText('Carácter especial (!@#$%^&*)')).toBeInTheDocument();
  });

  test('botón "Crear Cuenta" está deshabilitado cuando la contraseña no cumple requisitos', () => {
    render(<Register />);
    expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeDisabled();
  });

  test('al escribir contraseña parcialmente válida, el botón sigue deshabilitado', () => {
    render(<Register />);
    const passwordInput = screen.getByPlaceholderText('Crear contraseña segura');
    // "Admin@1" tiene upper, lower, number, special pero < 12 chars
    fireEvent.change(passwordInput, { target: { value: 'Admin@1' } });
    expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeDisabled();
  });

  test('al escribir contraseña válida + confirm igual, el botón se habilita', () => {
    render(<Register />);
    fireEvent.change(screen.getByPlaceholderText('Crear contraseña segura'), { target: { value: 'Admin@Test2024!' } });
    fireEvent.change(screen.getByPlaceholderText('Repita la contraseña'), { target: { value: 'Admin@Test2024!' } });
    expect(screen.getByRole('button', { name: /crear cuenta/i })).not.toBeDisabled();
  });

  test('muestra "Las contraseñas no coinciden" cuando confirmPassword es diferente', () => {
    render(<Register />);
    fireEvent.change(screen.getByPlaceholderText('Crear contraseña segura'), { target: { value: 'Admin@Test2024!' } });
    fireEvent.change(screen.getByPlaceholderText('Repita la contraseña'), { target: { value: 'Admin@Test2024X!' } });
    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeDisabled();
  });

  test('registro exitoso: llama authAPI.register y navega a /login', async () => {
    authAPI.register.mockResolvedValueOnce({ data: { success: true } });
    render(<Register />);

    fireEvent.change(screen.getByPlaceholderText('ej: Juan Pérez'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('email@ejemplo.com'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('Crear contraseña segura'), { target: { value: 'Admin@Test2024!' } });
    fireEvent.change(screen.getByPlaceholderText('Repita la contraseña'), { target: { value: 'Admin@Test2024!' } });
    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(authAPI.register).toHaveBeenCalledWith('Test User', 'test@test.com', 'Admin@Test2024!');
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  test('muestra error del API cuando el registro falla (ej: email duplicado)', async () => {
    authAPI.register.mockRejectedValueOnce({
      response: { data: { message: 'El email ya está registrado' } }
    });
    render(<Register />);

    fireEvent.change(screen.getByPlaceholderText('ej: Juan Pérez'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('email@ejemplo.com'), { target: { value: 'existing@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('Crear contraseña segura'), { target: { value: 'Admin@Test2024!' } });
    fireEvent.change(screen.getByPlaceholderText('Repita la contraseña'), { target: { value: 'Admin@Test2024!' } });
    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(screen.getByText('El email ya está registrado')).toBeInTheDocument();
    });
  });

  test('muestra "Todos los campos son requeridos" al hacer submit con formulario vacío', async () => {
    render(<Register />);
    const form = screen.getByPlaceholderText('ej: Juan Pérez').closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Todos los campos son requeridos')).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 3: Utilidades de sesión — testean las implementaciones reales con localStorage
// ═══════════════════════════════════════════════════════════════════════════════

describe('Utilidades de sesión — setToken, clearAuth, getStoredUser, getStoredToken', () => {
  // Obtener las implementaciones REALES (no mocked) de api.js
  const {
    setToken: realSetToken,
    clearAuth: realClearAuth,
    getStoredUser: realGetStoredUser,
    getStoredToken: realGetStoredToken
  } = jest.requireActual('../services/api');

  beforeEach(() => {
    localStorage.clear();
  });

  test('setToken guarda token, refreshToken y user serializado en localStorage', () => {
    realSetToken('tok-abc', 'refresh-xyz', { id: 1, name: 'Admin', role: 'ADMINISTRADOR' });
    expect(localStorage.getItem('token')).toBe('tok-abc');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-xyz');
    const stored = JSON.parse(localStorage.getItem('user'));
    expect(stored.id).toBe(1);
    expect(stored.role).toBe('ADMINISTRADOR');
  });

  test('clearAuth elimina las 3 claves de localStorage', () => {
    localStorage.setItem('token', 'tok');
    localStorage.setItem('refreshToken', 'ref');
    localStorage.setItem('user', JSON.stringify({ id: 1 }));
    realClearAuth();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  test('getStoredUser retorna null cuando no hay usuario guardado', () => {
    expect(realGetStoredUser()).toBeNull();
  });

  test('getStoredUser retorna objeto parseado cuando hay usuario guardado', () => {
    const user = { id: 5, name: 'Juan', role: 'SOLICITANTE' };
    localStorage.setItem('user', JSON.stringify(user));
    expect(realGetStoredUser()).toEqual(user);
  });

  test('getStoredToken retorna null cuando no hay token', () => {
    expect(realGetStoredToken()).toBeNull();
  });

  test('getStoredToken retorna el string del token almacenado', () => {
    localStorage.setItem('token', 'my-jwt-token');
    expect(realGetStoredToken()).toBe('my-jwt-token');
  });
});
