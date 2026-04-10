import api from '../api/api';

const transferService = {
    getTransfers: async () => (await api.get('/transfer/transferts/')).data,
    getTransferById: async (id) => (await api.get(`/transfer/transferts/${id}`)).data,
    getTransfersByVehicle: async (vehiculeId) => (
        await api.get(`/transfer/transferts/vehicule/${vehiculeId}`)
    ).data,
    getTransferCandidates: async (params = {}) => (
        await api.get('/transfer/transferts/disponibilites', { params })
    ).data,
    createTransfer: async (payload) => (
        await api.post('/transfer/transferts/', payload)
    ).data,
    updateTransfer: async (id, payload) => (
        await api.put(`/transfer/transferts/${id}`, payload)
    ).data,
    updateTransferStatus: async (id, payload) => (
        await api.put(`/transfer/transferts/${id}/status`, payload)
    ).data,
    cancelTransfer: async (id) => (
        await api.put(`/transfer/transferts/${id}/cancel`)
    ).data,
    deleteTransfer: async (id) => (
        await api.delete(`/transfer/transferts/${id}`)
    ).data,
};

export default transferService;
