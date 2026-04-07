import agenceService from './agenceService';

let agencesCache = null;
let agencesRequest = null;

export const getAgencesCached = async (forceRefresh = false) => {
    if (!forceRefresh && Array.isArray(agencesCache)) {
        return agencesCache;
    }

    if (!forceRefresh && agencesRequest) {
        return agencesRequest;
    }

    agencesRequest = agenceService.getAllAgences()
        .then((agences) => {
            agencesCache = Array.isArray(agences) ? agences : [];
            return agencesCache;
        })
        .finally(() => {
            agencesRequest = null;
        });

    return agencesRequest;
};

export const getAgencesCachedSafe = async (forceRefresh = false) => {
    try {
        const agences = await getAgencesCached(forceRefresh);
        return {
            agences: Array.isArray(agences) ? agences : [],
            available: true,
        };
    } catch {
        return {
            agences: [],
            available: false,
        };
    }
};

export const clearAgencesCache = () => {
    agencesCache = null;
};

export const getAgenceNameById = (agences, agenceId) => {
    const match = (agences || []).find((agence) => Number(agence.id) === Number(agenceId));
    return match?.nom || 'Agence inconnue';
};
