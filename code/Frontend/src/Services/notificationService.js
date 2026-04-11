import api from '../api/api';

const EVENT_TYPE_LABELS = {
    finance_charge_created: 'Charge creee',
    finance_charge_updated: 'Charge mise a jour',
    finance_charge_deleted: 'Charge supprimee',
    finance_compte_created: 'Compte cree',
    finance_compte_updated: 'Compte mis a jour',
    finance_compte_deleted: 'Compte supprime',
    finance_facture_created: 'Facture creee',
    finance_facture_updated: 'Facture mise a jour',
    finance_facture_deleted: 'Facture supprimee',
    finance_facture_restored: 'Facture restauree',
    finance_paiement_created: 'Paiement enregistre',
    finance_paiement_deleted: 'Paiement supprime',
    finance_compte_overdraft: 'Alerte compte agence',
    location_created: 'Location creee',
    location_updated: 'Location mise a jour',
    location_status_updated: 'Statut location modifie',
    location_returned: 'Vehicule retourne',
    location_prolonged: 'Location prolongee',
    location_extended: 'Location prolongee',
    transfer_created: 'Demande de transfert',
    transfer_updated: 'Transfert mis a jour',
    transfer_status_updated: 'Statut transfert modifie',
    transfer_cancelled: 'Transfert annule',
    transfer_deleted: 'Transfert supprime',
    assurance_created: 'Assurance creee',
    assurance_updated: 'Assurance mise a jour',
    assurance_deleted: 'Assurance supprimee',
    assurance_expiring: 'Assurance proche expiration',
    fleet_vehicle_created: 'Vehicule ajoute',
    fleet_vehicle_updated: 'Vehicule mis a jour',
    fleet_vehicle_status_updated: 'Statut vehicule modifie',
    fleet_vehicle_deleted: 'Vehicule supprime',
    fleet_entretien_created: 'Entretien ajoute',
    fleet_entretien_updated: 'Entretien mis a jour',
    fleet_entretien_deleted: 'Entretien supprime',
    fleet_categorie_created: 'Categorie creee',
    fleet_categorie_updated: 'Categorie mise a jour',
    fleet_categorie_deleted: 'Categorie supprimee',
    fleet_marque_created: 'Marque creee',
    fleet_marque_updated: 'Marque mise a jour',
    fleet_marque_deleted: 'Marque supprimee',
    fleet_modele_created: 'Modele cree',
    fleet_modele_updated: 'Modele mis a jour',
    fleet_modele_deleted: 'Modele supprime',
    gateway_post: 'Action creation',
    gateway_put: 'Action modification',
    gateway_patch: 'Action partielle',
    gateway_delete: 'Action suppression',
};

const formatEventTypeLabel = (eventType) => {
    const normalized = String(eventType || '').toLowerCase();
    if (EVENT_TYPE_LABELS[normalized]) {
        return EVENT_TYPE_LABELS[normalized];
    }
    return String(eventType || 'notification')
        .replaceAll('_', ' ')
        .trim()
        .replace(/^./, (value) => value.toUpperCase());
};

const METHOD_LABELS = {
    POST: 'Creation',
    PUT: 'Mise a jour',
    PATCH: 'Mise a jour',
    DELETE: 'Suppression',
    GET: 'Consultation',
};

const parseMethod = (value) => {
    const text = String(value || '').trim().toUpperCase();
    if (text.startsWith('POST ')) return 'POST';
    if (text.startsWith('PUT ')) return 'PUT';
    if (text.startsWith('PATCH ')) return 'PATCH';
    if (text.startsWith('DELETE ')) return 'DELETE';
    if (text.startsWith('GET ')) return 'GET';
    return null;
};

const extractActionPath = (...values) => {
    for (const raw of values) {
        const text = String(raw || '').trim();
        if (!text) continue;

        const method = parseMethod(text);
        if (method) {
            const path = text.slice(method.length).trim();
            if (path.startsWith('/')) {
                return path;
            }
        }

        const apiIndex = text.indexOf('/api/');
        if (apiIndex >= 0) {
            return text.slice(apiIndex).trim();
        }

        if (text.startsWith('/')) {
            return text;
        }
    }
    return null;
};

const resourceLabelFromPath = (path) => {
    const normalized = String(path || '').toLowerCase();
    if (normalized.includes('/transfer')) return 'transfert';
    if (normalized.includes('/location')) return 'location';
    if (normalized.includes('/fleet')) return 'gestion parc';
    if (normalized.includes('/finance')) return 'finance';
    if (normalized.includes('/agences')) return 'agence';
    if (normalized.includes('/utilisateurs') || normalized.includes('/users')) return 'utilisateur';
    return 'operation';
};

const normalizeLegacyGatewayText = (eventType, title, message, actionUrl) => {
    const normalizedEvent = String(eventType || '').toLowerCase();
    const method = parseMethod(title) || parseMethod(message) || (
        normalizedEvent.startsWith('gateway_')
            ? normalizedEvent.split('_')[1]?.toUpperCase()
            : null
    );
    const actionPath = extractActionPath(title, message, actionUrl);
    const looksTechnical = normalizedEvent.startsWith('gateway_')
        || (actionPath && method)
        || String(title || '').includes('/api/');

    if (!looksTechnical) {
        return { title, message };
    }

    const resource = resourceLabelFromPath(actionPath);
    const methodLabel = METHOD_LABELS[method] || 'Action';

    const titleOutput = String(actionPath || '').toLowerCase().includes('/cancel')
        ? `Annulation ${resource}`
        : `${methodLabel} ${resource}`;

    const messageOutput = actionPath
        ? `Action ${methodLabel.toLowerCase()} effectuee avec succes sur ${resource}. Endpoint: ${actionPath}`
        : `Action ${methodLabel.toLowerCase()} effectuee avec succes sur ${resource}.`;

    return {
        title: titleOutput,
        message: messageOutput,
    };
};

const normalizeNotification = (item) => {
    const channels = Array.isArray(item?.channels) ? item.channels : [];
    const eventType = item?.event_type || 'notification';
    const normalizedText = normalizeLegacyGatewayText(
        eventType,
        item?.title || 'Notification',
        item?.message || '',
        item?.action_url || null,
    );
    return {
        id: Number(item?.id),
        eventType,
        eventTypeLabel: formatEventTypeLabel(eventType),
        title: normalizedText.title,
        message: normalizedText.message,
        actionUrl: item?.action_url || null,
        scope: item?.scope || 'agence',
        agenceId: item?.agence_id ?? null,
        agenceName: item?.metadata?.agence_nom || item?.metadata?.agence_name || null,
        channels,
        metadata: item?.metadata || {},
        isRead: Boolean(item?.is_read),
        createdAt: item?.created_at || null,
    };
};

const notificationService = {
    getInbox: async ({ limit = 20, offset = 0, unreadOnly = false } = {}) => {
        const { data } = await api.get('/notifications/inbox', {
            params: {
                limit,
                offset,
                unread_only: unreadOnly,
            },
        });
        if (!Array.isArray(data)) {
            return [];
        }
        return data.map(normalizeNotification);
    },

    getUnreadCount: async () => {
        const { data } = await api.get('/notifications/unread-count');
        return Number(data?.unread_count || 0);
    },

    markRead: async (notificationId) => {
        await api.patch(`/notifications/${notificationId}/read`);
    },

    markAllRead: async () => {
        await api.patch('/notifications/read-all');
    },

    notify: async (payload) => (await api.post('/notifications/notify', payload)).data,
};

export default notificationService;
