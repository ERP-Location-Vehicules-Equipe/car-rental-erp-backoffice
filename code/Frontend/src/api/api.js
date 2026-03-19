import axios from 'axios';

// Configuration de base de l'API (à adapter selon l'environnement)
const api = axios.create({
    baseURL: 'http://localhost:8000/api', // L'URL de base selon la documentation
});

// Intercepteur pour ajouter le token JWT à chaque requête
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Intercepteur pour gérer les erreurs, notamment le 401 (Non autorisé)
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            // Si on reçoit un 401, le token est expiré ou invalide
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            // Redirection vers la page de connexion
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
