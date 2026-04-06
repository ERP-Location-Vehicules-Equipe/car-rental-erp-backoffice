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

export const getEntretiens = async () => request('/entretiens/')

export const getVehicleEntretiens = async (vehicleId) =>
  request(`/vehicles/${vehicleId}/entretiens`)

export const getEntretienRecord = async (entretienId) =>
  request(`/entretiens/${entretienId}`)

export const createEntretienRecord = async (entretienData) =>
  request('/entretiens/', {
    method: 'POST',
    body: JSON.stringify(entretienData),
  })

export const updateEntretienRecord = async (entretienId, entretienData) =>
  request(`/entretiens/${entretienId}`, {
    method: 'PUT',
    body: JSON.stringify(entretienData),
  })

export const deleteEntretienRecord = async (entretienId) =>
  request(`/entretiens/${entretienId}`, {
    method: 'DELETE',
  })
