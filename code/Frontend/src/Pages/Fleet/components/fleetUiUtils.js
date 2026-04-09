import { getErrorMessage } from '../../../utils/errorHandler';

export const toIsoOrNull = (value) => {
    if (!value) {
        return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed.toISOString();
};

export const toLocalDateTimeInput = (value) => {
    if (!value) {
        return '';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return '';
    }
    const tzOffset = parsed.getTimezoneOffset() * 60000;
    const localDate = new Date(parsed.getTime() - tzOffset);
    return localDate.toISOString().slice(0, 16);
};

export const formatDateTime = (value) => {
    if (!value) {
        return '-';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleString();
};

export const extractApiMessage = (error, fallback) => {
    if (!error?.response) {
        if (typeof error?.message === 'string' && error.message.trim() !== '') {
            return error.message;
        }
        return fallback || 'Erreur reseau : service indisponible.';
    }

    const data = error?.response?.data;
    if (Array.isArray(data?.errors) && data.errors.length > 0) {
        const combined = data.errors.map((entry) => entry?.msg || entry?.message).filter(Boolean).join(', ');
        if (combined) {
            return combined;
        }
    }
    return getErrorMessage(error, fallback);
};
