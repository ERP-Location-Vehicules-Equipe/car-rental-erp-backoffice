import api from '../api/api';

const normalizeNotification = (item) => {
    const channels = Array.isArray(item?.channels) ? item.channels : [];
    return {
        id: Number(item?.id),
        eventType: item?.event_type || 'notification',
        title: item?.title || 'Notification',
        message: item?.message || '',
        actionUrl: item?.action_url || null,
        scope: item?.scope || 'agence',
        agenceId: item?.agence_id ?? null,
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