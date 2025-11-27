/**
 * API Service - Capa de comunicación con el backend
 * Maneja autenticación, tokens y MFA
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Crear instancia de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * AUTENTICACIÓN - Interceptor para agregar token a todas las requests
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const mfaToken = localStorage.getItem('mfaToken');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (mfaToken) {
      config.headers['X-MFA-Token'] = mfaToken;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * AUTENTICACIÓN - Interceptor para manejar respuestas
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si token expirado, limpiar localStorage
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      // Redirigir a login sería aquí
    }

    return Promise.reject(error);
  }
);

/**
 * AUTENTICACIÓN - Funciones de registro
 */
export const authAPI = {
  register: (username, email, password, confirmPassword) =>
    api.post('/auth/register', { username, email, password, confirmPassword }),

  login: (username, password) =>
    api.post('/auth/login', { username, password }),

  verifyLoginMFA: (userId, mfaCode) =>
    api.post('/auth/login-mfa', { userId, mfaCode }),

  getProfile: () =>
    api.get('/auth/profile'),

  refreshToken: (refreshToken) =>
    api.post('/auth/refresh', { refreshToken }),

  setupMFA: () =>
    api.post('/auth/setup-mfa'),

  verifyMFA: (mfaCode) =>
    api.post('/auth/verify-mfa', { mfaCode }),

  disableMFA: (password) =>
    api.post('/auth/disable-mfa', { password })
};

/**
 * INTEGRIDAD - Funciones de tickets
 */
export const ticketAPI = {
  createTicket: (title, description, category, priority, confidentiality) =>
    api.post('/tickets', {
      title,
      description,
      category,
      priority,
      confidentiality
    }),

  listTickets: (params = {}) =>
    api.get('/tickets', { params }),

  getTicket: (id) =>
    api.get(`/tickets/${id}`),

  updateTicket: (id, data) =>
    api.put(`/tickets/${id}`, data),

  escalateTicket: (id, reason) =>
    api.post(`/tickets/${id}/escalate`, { reason }),

  addComment: (id, text) =>
    api.post(`/tickets/${id}/comments`, { text }),

  getHistory: (id) =>
    api.get(`/tickets/${id}/history`)
};

/**
 * NO REPUDIO - Funciones de auditoría
 */
export const auditAPI = {
  listLogs: (params = {}) =>
    api.get('/audit-logs', { params }),

  getStats: (params = {}) =>
    api.get('/audit-logs/stats', { params }),

  getLog: (id) =>
    api.get(`/audit-logs/${id}`)
};

/**
 * Funciones de utilidad
 */
export const setToken = (token, refreshToken, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('refreshToken', refreshToken);
  localStorage.setItem('user', JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('mfaToken');
};

export const getStoredUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const getStoredToken = () => localStorage.getItem('token');

export default api;
