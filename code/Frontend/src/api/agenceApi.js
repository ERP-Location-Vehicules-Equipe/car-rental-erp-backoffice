import axios from 'axios';

const AGENCE_API_BASE_URL = import.meta.env.VITE_AGENCE_API_URL || 'http://localhost:8002/api';

const agenceApi = axios.create({
    baseURL: AGENCE_API_BASE_URL,
});

agenceApi.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

agenceApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');

            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default agenceApi;
