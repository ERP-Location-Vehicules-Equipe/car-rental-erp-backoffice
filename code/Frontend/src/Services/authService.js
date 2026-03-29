import api from '../api/api';
import { clearAgencesCache } from './agenceLookupService';

const authService = {
    // Roles metier utilises dans l'application.
    ROLE_EMPLOYE: 'employe',
    ROLE_ADMIN: 'admin',
    ROLE_SUPER_ADMIN: 'super_admin',

    // Connexion de l'utilisateur.
    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.access_token) {
            localStorage.setItem('access_token', response.data.access_token);
            localStorage.setItem('refresh_token', response.data.refresh_token);

            // Charger le profil juste apres login pour piloter les droits frontend.
            const profileResponse = await api.get('/utilisateurs/profile');
            localStorage.setItem('user', JSON.stringify(profileResponse.data));
        }
        return response.data;
    },

    // Deconnexion de l'utilisateur.
    logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        clearAgencesCache();
    },

    // Recuperer l'utilisateur courant depuis le storage.
    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            return JSON.parse(userStr);
        }
        return null;
    },

    // Verifier si l'utilisateur est authentifie.
    isAuthenticated: () => {
        return !!localStorage.getItem('access_token');
    },

    // Verifier le role admin strict.
    isAdmin: () => {
        const user = authService.getCurrentUser();
        return user?.role === authService.ROLE_ADMIN;
    },

    // Verifier le role super admin.
    isSuperAdmin: () => {
        const user = authService.getCurrentUser();
        return user?.role === authService.ROLE_SUPER_ADMIN;
    },

    // Verifier l'acces de gestion utilisateurs.
    canManageUsers: () => {
        const user = authService.getCurrentUser();
        return user?.role === authService.ROLE_ADMIN || user?.role === authService.ROLE_SUPER_ADMIN;
    },

    // Verifier l'acces de gestion agences.
    canManageAgences: () => {
        const user = authService.getCurrentUser();
        return user?.role === authService.ROLE_SUPER_ADMIN;
    },

    // Reinitialiser le mot de passe.
    resetPassword: async (email, newPassword) => {
        const response = await api.post('/auth/reset-password', {
            email,
            new_password: newPassword,
        });
        return response.data;
    },
};

export default authService;
