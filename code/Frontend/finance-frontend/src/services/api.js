import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8001/api',
  headers: { 'Content-Type': 'application/json' },
})

// ================= AUTH INTERCEPTOR =================
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      console.log("User:", payload)

      config.headers.Authorization = `Bearer ${token}`
    } catch (e) {
      console.log("Token invalid")
    }
  }

  return config
})

// ================= FACTURES =================
export const factureAPI = {
  getAll: (skip = 0, limit = 100) =>
    api.get(`/factures?skip=${skip}&limit=${limit}`),

  getById: (id) => api.get(`/factures/${id}`),

  create: (data) => api.post('/factures', data),

  update: (id, data) => api.put(`/factures/${id}`, data),

  delete: (id) => api.delete(`/factures/${id}`),

  // 🔥 factures supprimées
  getDeleted: () => api.get('/factures/deleted'),

  // 🔥 restore
  restore: (id) => api.patch(`/factures/${id}/restore`)
}

// ================= PAIEMENTS =================
export const paiementAPI = {
  getAll: () => api.get('/paiements'),

  getById: (id) => api.get(`/paiements/${id}`),

  getByFacture: (id) => api.get(`/paiements/facture/${id}`),

  create: (data) => api.post('/paiements', data),

  delete: (id) => api.delete(`/paiements/${id}`),
}

// ================= COMPTES =================
export const compteAPI = {
  getAll: () => api.get('/comptes'),

  getById: (id) => api.get(`/comptes/${id}`),

  create: (data) => api.post('/comptes', data),

  update: (id, data) => api.put(`/comptes/${id}`, data),

  delete: (id) => api.delete(`/comptes/${id}`),
}

// ================= CHARGES =================
export const chargeAPI = {
  getAll: () => api.get('/charges'),

  getById: (id) => api.get(`/charges/${id}`),

  create: (data) => api.post('/charges', data),

  update: (id, data) => api.put(`/charges/${id}`, data),

  delete: (id) => api.delete(`/charges/${id}`),
}

// ================= DASHBOARD =================
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
}

export default api