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

export const getVehicles = async () => request('/vehicles/')

export const createVehicle = async (vehicleData) =>
  request('/vehicles/', {
    method: 'POST',
    body: JSON.stringify(vehicleData),
  })

export const updateVehicle = async (vehicleId, vehicleData) =>
  request(`/vehicles/${vehicleId}`, {
    method: 'PUT',
    body: JSON.stringify(vehicleData),
  })

export const deleteVehicle = async (vehicleId) =>
  request(`/vehicles/${vehicleId}`, {
    method: 'DELETE',
  })
