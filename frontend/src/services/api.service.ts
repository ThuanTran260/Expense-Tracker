import api from '../lib/api';

// ─── AUTH ────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),

  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }).then((r) => r.data),

  logout: () => api.post('/auth/logout').then((r) => r.data),

  getMe: () => api.get('/auth/me').then((r) => r.data),
};

// ─── SETTINGS ────────────────────────────────
export const settingsApi = {
  get: () => api.get('/settings').then((r) => r.data),

  update: (data: object) => api.put('/settings', data).then((r) => r.data),
};

// ─── CATEGORIES ──────────────────────────────
export const categoryApi = {
  getAll: () => api.get('/categories').then((r) => r.data),

  create: (data: { name: string; type: string; icon?: string }) =>
    api.post('/categories', data).then((r) => r.data),

  delete: (id: string) => api.delete(`/categories/${id}`),
};

// ─── TRANSACTIONS ────────────────────────────
export const transactionApi = {
  getAll: (params?: object) =>
    api.get('/transactions', { params }).then((r) => r.data),

  getById: (id: string) =>
    api.get(`/transactions/${id}`).then((r) => r.data),

  create: (data: object) =>
    api.post('/transactions', data).then((r) => r.data),

  update: (id: string, data: object) =>
    api.put(`/transactions/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/transactions/${id}`),

  exportCSV: (params?: object) =>
    api.get('/transactions/export', { params, responseType: 'blob' }).then((r) => r.data),
};

// ─── STATS ───────────────────────────────────
export const statsApi = {
  getSummary: (params?: object) =>
    api.get('/stats/summary', { params }).then((r) => r.data),

  getByCategory: (params?: object) =>
    api.get('/stats/by-category', { params }).then((r) => r.data),

  getTimeline: (params?: object) =>
    api.get('/stats/timeline', { params }).then((r) => r.data),
};

// ─── BUDGETS ─────────────────────────────────
export const budgetApi = {
  getAll: (params?: object) =>
    api.get('/budgets', { params }).then((r) => r.data),

  create: (data: object) =>
    api.post('/budgets', data).then((r) => r.data),

  update: (id: string, data: object) =>
    api.put(`/budgets/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/budgets/${id}`),
};
