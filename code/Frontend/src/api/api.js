import axios from 'axios';

const API_GATEWAY_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8001/api';

const api = axios.create({
    baseURL: API_GATEWAY_BASE_URL,
});

const inFlightRequests = new Map();
const recentResolvedRequests = new Map();
const DUPLICATE_REQUEST_WINDOW_MS = 1200;

const safeSerialize = (value) => {
    if (value == null) {
        return '';
    }
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
};

const buildMutationKey = (config) => {
    const method = String(config?.method || 'get').toLowerCase();
    const url = String(config?.url || '');
    const params = safeSerialize(config?.params);
    const data = safeSerialize(config?.data);
    return `${method}|${url}|${params}|${data}`;
};

const originalRequest = api.request.bind(api);
api.request = (configOrUrl, config) => {
    const requestConfig = typeof configOrUrl === 'string'
        ? { ...(config || {}), url: configOrUrl }
        : { ...(configOrUrl || {}) };

    const key = buildMutationKey(requestConfig);

    const inFlight = inFlightRequests.get(key);
    if (inFlight) {
        return inFlight;
    }

    const recent = recentResolvedRequests.get(key);
    if (recent && (Date.now() - recent.timestamp) <= DUPLICATE_REQUEST_WINDOW_MS) {
        return Promise.resolve(recent.response);
    }

    const pendingPromise = originalRequest(requestConfig)
        .then((response) => {
            recentResolvedRequests.set(key, {
                response,
                timestamp: Date.now(),
            });
            return response;
        })
        .finally(() => {
            inFlightRequests.delete(key);
        });

    inFlightRequests.set(key, pendingPromise);
    return pendingPromise;
};

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
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

export default api;
