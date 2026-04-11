import api from '../api/api';

const locationService = {
    getLocations: async () => (await api.get('/location/locations/')).data,
    getLocationStats: async () => (await api.get('/location/locations/stats')).data,
    getLocationById: async (id) => (await api.get(`/location/locations/${id}`)).data,
    createLocation: async (payload) => (await api.post('/location/locations/', payload)).data,
    updateLocation: async (id, payload) => (await api.put(`/location/locations/${id}`, payload)).data,
    deleteLocation: async (id) => (await api.delete(`/location/locations/${id}`)).data,
    updateLocationStatus: async (id, etat) => (
        await api.put(`/location/locations/${id}/status`, { etat })
    ).data,
    processReturn: async (id, date_retour_reelle) => (
        await api.put(`/location/locations/${id}/retour`, { date_retour_reelle })
    ).data,
    extendLocation: async (id, date_fin_prevue) => (
        await api.put(`/location/locations/${id}/prolonger`, { date_fin_prevue })
    ).data,
    downloadContractPdf: async (id) => (
        await api.get(`/location/locations/${id}/contrat-pdf`, { responseType: 'blob' })
    ).data,
};

export default locationService;
