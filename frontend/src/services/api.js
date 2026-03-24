/**
 * API Service — Capa de comunicación con el backend
 * Monografía UCB: auth, tickets, users, categories, reports, audit
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

// ─── Interceptor: agregar token JWT ─────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Interceptor: manejar 401 ────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (name, email, password) =>
    api.post('/auth/register', { name, email, password }),

  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  verifyLoginMFA: (userId, mfaCode) =>
    api.post('/auth/login-mfa', { userId, mfaCode }),

  getProfile: () =>
    api.get('/auth/profile'),

  refreshToken: (refreshToken) =>
    api.post('/auth/refresh', { refreshToken }),

  changePassword: (currentPassword, newPassword) =>
    api.patch('/auth/change-password', { currentPassword, newPassword }),

  setupMFA: () => api.post('/auth/setup-mfa'),
  verifyMFA: (mfaCode) => api.post('/auth/verify-mfa', { mfaCode }),
  disableMFA: (password) => api.post('/auth/disable-mfa', { password })
};

// ─── Tickets ─────────────────────────────────────────────────────────────────
export const ticketAPI = {
  createTicket: (data) =>
    api.post('/tickets', data),

  listTickets: (params = {}) =>
    api.get('/tickets', { params }),

  getTicket: (id) =>
    api.get(`/tickets/${id}`),

  updateTicket: (id, data) =>
    api.patch(`/tickets/${id}`, data),

  assignTicket: (id, tech_id) =>
    api.patch(`/tickets/${id}/assign`, { tech_id }),

  changeStatus: (id, status) =>
    api.patch(`/tickets/${id}/status`, { status }),

  addComment: (id, content) =>
    api.post(`/tickets/${id}/comments`, { content }),

  getHistory: (id) =>
    api.get(`/tickets/${id}/history`),

  uploadAttachment: (ticketId, formData) =>
    api.post(`/tickets/${ticketId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  downloadAttachment: (ticketId, attachmentId) =>
    api.get(`/tickets/${ticketId}/attachments/${attachmentId}/download`, { responseType: 'blob' }),

  deleteAttachment: (ticketId, attachmentId) =>
    api.delete(`/tickets/${ticketId}/attachments/${attachmentId}`),

  deleteTicket: (id) =>
    api.delete(`/tickets/${id}`)
};

// ─── Users (solo ADMINISTRADOR) ──────────────────────────────────────────────
export const userAPI = {
  listUsers: (params = {}) =>
    api.get('/users', { params }),

  getUser: (id) =>
    api.get(`/users/${id}`),

  createUser: (data) =>
    api.post('/users', data),

  updateUser: (id, data) =>
    api.patch(`/users/${id}`, data),

  unlockUser: (id) =>
    api.post(`/users/${id}/unlock`),

  listTechnicians: () =>
    api.get('/users/technicians')
};

// ─── Categories ───────────────────────────────────────────────────────────────
export const categoryAPI = {
  listCategories: () =>
    api.get('/categories'),

  getCategory: (id) =>
    api.get(`/categories/${id}`),

  createCategory: (data) =>
    api.post('/categories', data),

  updateCategory: (id, data) =>
    api.patch(`/categories/${id}`, data),

  deleteCategory: (id) =>
    api.delete(`/categories/${id}`)
};

// ─── Reports (solo ADMINISTRADOR) ────────────────────────────────────────────
export const reportAPI = {
  getDashboard: () =>
    api.get('/reports/dashboard'),

  getByTech: () =>
    api.get('/reports/by-tech'),

  getByCategory: () =>
    api.get('/reports/by-category'),

  getResolutionTime: () =>
    api.get('/reports/resolution-time'),

  exportExcel: () =>
    api.get('/reports/export', { responseType: 'blob' })
};

// ─── Audit Logs (solo ADMINISTRADOR) ─────────────────────────────────────────
export const auditAPI = {
  listLogs: (params = {}) =>
    api.get('/audit-logs', { params }),

  getStats: (params = {}) =>
    api.get('/audit-logs/stats', { params }),

  getLog: (id) =>
    api.get(`/audit-logs/${id}`)
};

// ─── Utilidades ──────────────────────────────────────────────────────────────
export const setToken = (token, refreshToken, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('refreshToken', refreshToken);
  localStorage.setItem('user', JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

export const getStoredUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const getStoredToken = () => localStorage.getItem('token');

export default api;
