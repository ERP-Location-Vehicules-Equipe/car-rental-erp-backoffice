import agenceApi from '../api/agenceApi';

const agenceService = {
    getAllAgences: async () => {
        const response = await agenceApi.get('/agences');
        return response.data;
    },

    getDeletedAgences: async () => {
        const response = await agenceApi.get('/agences/deleted');
        return response.data;
    },

    getAgenceById: async (id) => {
        const response = await agenceApi.get(`/agences/${id}`);
        return response.data;
    },

    createAgence: async (agenceData) => {
        const response = await agenceApi.post('/agences', agenceData);
        return response.data;
    },

    updateAgence: async (id, agenceData) => {
        const response = await agenceApi.put(`/agences/${id}`, agenceData);
        return response.data;
    },

    deleteAgence: async (id) => {
        const response = await agenceApi.delete(`/agences/${id}`);
        return response.data;
    },

    restoreAgence: async (id) => {
        const response = await agenceApi.patch(`/agences/${id}/restore`);
        return response.data;
    },

    disableAgence: async (id) => {
        const response = await agenceApi.patch(`/agences/${id}/disable`);
        return response.data;
    },

    enableAgence: async (id) => {
        const response = await agenceApi.patch(`/agences/${id}/enable`);
        return response.data;
    },
};

export default agenceService;
