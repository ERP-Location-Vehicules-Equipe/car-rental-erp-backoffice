import api from '../api/api';

const authService = {
    // Connexion de l'utilisateur
    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.access_token) {
            localStorage.setItem('access_token', response.data.access_token);
            localStorage.setItem('refresh_token', response.data.refresh_token);

            // Récupérer le profil immédiatement après la connexion
            const profileResponse = await api.get('/utilisateurs/profile');
            localStorage.setItem('user', JSON.stringify(profileResponse.data));
        }
        return response.data;
    },

    // Déconnexion de l'utilisateur
    logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
    },

    // Récupérer les informations de l'utilisateur courant depuis le localStorage
    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        if (userStr) return JSON.parse(userStr);
        return null;
    },

    // Vérifier si l'utilisateur est authentifié
    isAuthenticated: () => {
        return !!localStorage.getItem('access_token');
    },

    // Vérifier le rôle de l'utilisateur
    isAdmin: () => {
        const user = authService.getCurrentUser();
        return user && user.role === 'admin';
    }
};

export default authService;
