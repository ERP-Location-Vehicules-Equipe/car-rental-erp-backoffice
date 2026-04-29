import api from '../api/api';

const financeService = {
    // Factures
    getFactures: async () => (await api.get('/finance/factures/')).data,
    getFactureById: async (id) => (await api.get(`/finance/factures/${id}`)).data,
    createFacture: async (payload) => (await api.post('/finance/factures/', payload)).data,
    updateFacture: async (id, payload) => (await api.put(`/finance/factures/${id}`, payload)).data,
    deleteFacture: async (id) => (await api.delete(`/finance/factures/${id}`)).data,
    downloadFacturePdf: async (id) => (
        await api.get(`/finance/factures/${id}/pdf`, { responseType: 'blob' })
    ).data,
    getDeletedFactures: async () => (await api.get('/finance/factures/deleted')).data,
    restoreFacture: async (id) => (await api.patch(`/finance/factures/${id}/restore`)).data,

    // Paiements
    getPaiements: async () => (await api.get('/finance/paiements/')).data,
    getPaiementById: async (id) => (await api.get(`/finance/paiements/${id}`)).data,
    getPaiementsByFacture: async (factureId) => (
        await api.get(`/finance/paiements/facture/${factureId}`)
    ).data,
    createPaiement: async (payload) => (await api.post('/finance/paiements/', payload)).data,
    deletePaiement: async (id) => (await api.delete(`/finance/paiements/${id}`)).data,

    // Comptes
    getComptes: async () => (await api.get('/finance/comptes/')).data,
    getCompteById: async (id) => (await api.get(`/finance/comptes/${id}`)).data,
    createCompte: async (payload) => (await api.post('/finance/comptes/', payload)).data,
    updateCompte: async (id, payload) => (await api.put(`/finance/comptes/${id}`, payload)).data,
    deleteCompte: async (id) => (await api.delete(`/finance/comptes/${id}`)).data,

    // Charges
    getCharges: async () => (await api.get('/finance/charges/')).data,
    getChargeById: async (id) => (await api.get(`/finance/charges/${id}`)).data,
    getChargesByVehicule: async (vehiculeId) => (
        await api.get(`/finance/charges/vehicule/${vehiculeId}`)
    ).data,
    createCharge: async (payload) => (await api.post('/finance/charges/', payload)).data,
    updateCharge: async (id, payload) => (await api.put(`/finance/charges/${id}`, payload)).data,
    deleteCharge: async (id) => (await api.delete(`/finance/charges/${id}`)).data,

    // Reportings
    getRapport: async () => (await api.get('/finance/rapport/')).data,
    getDashboardStats: async () => (await api.get('/finance/dashboard/stats')).data,
};

export default financeService;
