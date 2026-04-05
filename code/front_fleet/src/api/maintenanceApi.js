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

export const getVehicleMaintenances = async (vehicleId) =>
  request(`/vehicles/${vehicleId}/maintenances`)

export const getMaintenanceRecord = async (maintenanceId) =>
  request(`/maintenances/${maintenanceId}`)

export const createMaintenanceRecord = async (vehicleId, maintenanceData) =>
  request(`/vehicles/${vehicleId}/maintenances`, {
    method: 'POST',
    body: JSON.stringify(maintenanceData),
  })

export const updateMaintenanceRecord = async (maintenanceId, maintenanceData) =>
  request(`/maintenances/${maintenanceId}`, {
    method: 'PUT',
    body: JSON.stringify(maintenanceData),
  })

export const deleteMaintenanceRecord = async (maintenanceId) =>
  request(`/maintenances/${maintenanceId}`, {
    method: 'DELETE',
  })
