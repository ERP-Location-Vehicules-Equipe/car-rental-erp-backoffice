import api from "../api/api";

const fleetService = {
    // Categories
    getCategories: async () => (await api.get("/fleet/categories/")).data,
    createCategory: async (payload) => (await api.post("/fleet/categories/", payload)).data,
    updateCategory: async (id, payload) => (await api.put(`/fleet/categories/${id}`, payload)).data,
    deleteCategory: async (id) => (await api.delete(`/fleet/categories/${id}`)).data,

    // Marques
    getMarques: async () => (await api.get("/fleet/marques/")).data,
    createMarque: async (payload) => (await api.post("/fleet/marques/", payload)).data,
    updateMarque: async (id, payload) => (await api.put(`/fleet/marques/${id}`, payload)).data,
    deleteMarque: async (id) => (await api.delete(`/fleet/marques/${id}`)).data,

    // Modeles
    getModeles: async () => (await api.get("/fleet/modeles/")).data,
    createModele: async (payload) => (await api.post("/fleet/modeles/", payload)).data,
    updateModele: async (id, payload) => (await api.put(`/fleet/modeles/${id}`, payload)).data,
    deleteModele: async (id) => (await api.delete(`/fleet/modeles/${id}`)).data,

    // Vehicles
    getVehicles: async () => (await api.get("/fleet/vehicles/")).data,
    getVehicleById: async (id) => (await api.get(`/fleet/vehicles/${id}`)).data,
    createVehicle: async (payload) => (await api.post("/fleet/vehicles/", payload)).data,
    updateVehicle: async (id, payload) => (await api.put(`/fleet/vehicles/${id}`, payload)).data,
    updateVehicleStatus: async (id, statut) => (
        await api.patch(`/fleet/vehicles/${id}/status`, { statut })
    ).data,
    deleteVehicle: async (id) => (await api.delete(`/fleet/vehicles/${id}`)).data,

    // Entretiens
    getEntretiens: async () => (await api.get("/fleet/entretiens/")).data,
    getEntretienById: async (id) => (await api.get(`/fleet/entretiens/${id}`)).data,
    getVehicleEntretiens: async (vehicleId) => (
        await api.get(`/fleet/vehicles/${vehicleId}/entretiens`)
    ).data,
    createEntretien: async (payload) => (await api.post("/fleet/entretiens/", payload)).data,
    updateEntretien: async (id, payload) => (await api.put(`/fleet/entretiens/${id}`, payload)).data,
    deleteEntretien: async (id) => (await api.delete(`/fleet/entretiens/${id}`)).data,

    // Assurances
    getAssurances: async () => (await api.get("/fleet/assurances/")).data,
    getAssuranceById: async (id) => (await api.get(`/fleet/assurances/${id}`)).data,
    getVehicleAssurances: async (vehicleId) => (
        await api.get(`/fleet/vehicles/${vehicleId}/assurances`)
    ).data,
    createAssurance: async (payload) => (await api.post("/fleet/assurances/", payload)).data,
    updateAssurance: async (id, payload) => (await api.put(`/fleet/assurances/${id}`, payload)).data,
    deleteAssurance: async (id) => (await api.delete(`/fleet/assurances/${id}`)).data,
    scanAssuranceReminders: async () => (await api.post("/fleet/assurances/reminders/scan")).data,
};

export default fleetService;
