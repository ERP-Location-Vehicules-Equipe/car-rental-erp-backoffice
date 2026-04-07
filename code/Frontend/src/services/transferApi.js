import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
const TOKEN_KEY = 'token' // primary key
const LEGACY_TOKEN_KEY = 'auth_token' // fallback for previous manual storage

const api = axios.create({
  baseURL: API_BASE_URL,
})

const applyAuthHeader = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common.Authorization
  }
}

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(LEGACY_TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(LEGACY_TOKEN_KEY)
  }
  applyAuthHeader(token)
}

// Load token on startup if it exists
const savedToken = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY)
applyAuthHeader(savedToken)

export const getTransfers = () => api.get('/transferts/')

export const getTransferById = (id) => api.get(`/transferts/${id}`)

export const getTransfersByVehicle = (vehiculeId) =>
  api.get(`/transferts/vehicule/${vehiculeId}`)

export const createTransfer = (payload) => api.post('/transferts/', payload)

export const updateTransferStatus = (id, etat, notes = '') =>
  api.put(`/transferts/${id}/status`, { etat, notes })

export const cancelTransfer = (id) => api.put(`/transferts/${id}/cancel`)

export default {
  getTransfers,
  getTransferById,
  getTransfersByVehicle,
  createTransfer,
  updateTransferStatus,
  cancelTransfer,
  setAuthToken,
}
