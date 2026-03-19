import api from '../api/api';

const userService = {
    // Récupérer le profil courant
    getProfile: async () => {
        const response = await api.get('/utilisateurs/profile');
        return response.data;
    },

    // Récupérer la liste de tous les utilisateurs (accès admin)
    getAllUsers: async () => {
        const response = await api.get('/utilisateurs');
        return response.data;
    },

    // Récupérer un utilisateur spécifique par son ID (accès admin)
    getUserById: async (id) => {
        const response = await api.get(`/utilisateurs/${id}`);
        return response.data;
    },

    // Créer un nouvel utilisateur avec rôle explicite (accès admin)
    createUser: async (userData) => {
        const response = await api.post('/auth/create-user', userData);
        return response.data;
    },

    // Mettre à jour les informations d'un utilisateur (accès admin)
    updateUser: async (id, userData) => {
        const response = await api.put(`/utilisateurs/${id}`, userData);
        return response.data;
    },

    // Supprimer logicalement un utilisateur - soft delete (accès admin)
    deleteUser: async (id) => {
        const response = await api.delete(`/utilisateurs/${id}`);
        return response.data;
    },

    // Désactiver un utilisateur (accès admin)
    disableUser: async (id) => {
        const response = await api.patch(`/utilisateurs/${id}/disable`);
        return response.data;
    },

    // Activer un utilisateur (accès admin)
    enableUser: async (id) => {
        const response = await api.patch(`/utilisateurs/${id}/enable`);
        return response.data;
    }
};

export default userService;
