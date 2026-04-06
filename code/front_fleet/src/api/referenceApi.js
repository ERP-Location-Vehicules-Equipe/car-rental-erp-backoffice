const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const request = async (path, options = {}) => {
  const headers = { ...(options.headers || {}) }

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    ...options,
  })

  if (response.status === 204) {
    return null
  }

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(
      data?.detail || data?.message || `Request failed with status ${response.status}`,
    )
  }

  return data
}

export const getCategories = async () => request('/categories/')
export const getMarques = async () => request('/marques/')
export const getModeles = async () => request('/modeles/')

export const createCategory = async (categoryData) =>
  request('/categories/', {
    method: 'POST',
    body: JSON.stringify(categoryData),
  })

export const updateCategory = async (categoryId, categoryData) =>
  request(`/categories/${categoryId}`, {
    method: 'PUT',
    body: JSON.stringify(categoryData),
  })

export const deleteCategory = async (categoryId) =>
  request(`/categories/${categoryId}`, {
    method: 'DELETE',
  })

export const createMarque = async (marqueData) =>
  request('/marques/', {
    method: 'POST',
    body: JSON.stringify(marqueData),
  })

export const updateMarque = async (marqueId, marqueData) =>
  request(`/marques/${marqueId}`, {
    method: 'PUT',
    body: JSON.stringify(marqueData),
  })

export const deleteMarque = async (marqueId) =>
  request(`/marques/${marqueId}`, {
    method: 'DELETE',
  })

export const createModele = async (modeleData) =>
  request('/modeles/', {
    method: 'POST',
    body: JSON.stringify(modeleData),
  })

export const updateModele = async (modeleId, modeleData) =>
  request(`/modeles/${modeleId}`, {
    method: 'PUT',
    body: JSON.stringify(modeleData),
  })

export const deleteModele = async (modeleId) =>
  request(`/modeles/${modeleId}`, {
    method: 'DELETE',
  })
