import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import notificationService from '../../Services/notificationService';
import { getErrorMessage } from '../../utils/errorHandler';

const formatDateTime = (value) => {
    if (!value) {
        return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleString();
};

const NotificationsManagement = () => {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [items, setItems] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [search, setSearch] = useState('');
    const [showUnreadOnly, setShowUnreadOnly] = useState(false);
    const [markAllBusy, setMarkAllBusy] = useState(false);
    const [rowBusyId, setRowBusyId] = useState(null);

    const loadInbox = async ({ silent = false } = {}) => {
        if (!silent) {
            setLoading(true);
        }

        setError('');
        try {
            const [count, inbox] = await Promise.all([
                notificationService.getUnreadCount(),
                notificationService.getInbox({ limit: 100, offset: 0, unreadOnly: false }),
            ]);
            setUnreadCount(count);
            setItems(inbox);
        } catch (requestError) {
            setError(getErrorMessage(requestError, 'Impossible de charger les notifications.'));
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        loadInbox();
        const interval = window.setInterval(() => {
            loadInbox({ silent: true });
        }, 12000);

        return () => {
            window.clearInterval(interval);
        };
    }, []);

    const filteredItems = useMemo(() => {
        const query = search.trim().toLowerCase();

        return items.filter((item) => {
            if (showUnreadOnly && item.isRead) {
                return false;
            }
            if (!query) {
                return true;
            }

            return [
                item.title,
                item.message,
                item.eventType,
                item.eventTypeLabel,
                item.agenceName,
                item.metadata?.vehicle_label,
                item.metadata?.vehicule_label,
                item.metadata?.location_id,
                item.metadata?.transfer_id,
            ].some((value) => String(value || '').toLowerCase().includes(query));
        });
    }, [items, search, showUnreadOnly]);

    const handleMarkRead = async (item) => {
        if (rowBusyId === item.id) {
            return;
        }
        if (item.isRead) {
            if (item.actionUrl) {
                navigate(item.actionUrl);
            }
            return;
        }

        setError('');
        setRowBusyId(item.id);
        try {
            await notificationService.markRead(item.id);
            setItems((prev) => prev.map((entry) => (
                entry.id === item.id ? { ...entry, isRead: true } : entry
            )));
            setUnreadCount((prev) => Math.max(0, prev - 1));

            if (item.actionUrl) {
                navigate(item.actionUrl);
            }
        } catch (requestError) {
            setError(getErrorMessage(requestError, 'Impossible de marquer la notification comme lue.'));
        } finally {
            setRowBusyId(null);
        }
    };

    const handleMarkAllRead = async () => {
        if (markAllBusy) {
            return;
        }
        setError('');
        setNotice('');
        setMarkAllBusy(true);
        try {
            await notificationService.markAllRead();
            setItems((prev) => prev.map((entry) => ({ ...entry, isRead: true })));
            setUnreadCount(0);
            setNotice('Toutes les notifications sont marquees comme lues.');
        } catch (requestError) {
            setError(getErrorMessage(requestError, 'Impossible de marquer toutes les notifications comme lues.'));
        } finally {
            setMarkAllBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h2 className="text-2xl font-bold text-slate-900">Notifications</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Centre automatique des notifications (popup + historique). Les elements sont scopes selon votre role et votre agence.
                </p>
            </div>

            {error && (
                <div className="bg-red-50 p-4 rounded-md border border-red-200">
                    <p className="text-sm font-medium text-red-700">{error}</p>
                </div>
            )}
            {notice && (
                <div className="bg-emerald-50 p-4 rounded-md border border-emerald-200">
                    <p className="text-sm font-medium text-emerald-700">{notice}</p>
                </div>
            )}

            <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <p className="text-sm text-slate-600">Non lues: <span className="font-bold text-slate-900">{unreadCount}</span></p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="w-full sm:w-72 px-3 py-2 border border-slate-300 rounded-md text-sm"
                            placeholder="Rechercher par titre, message, vehicule..."
                        />

                        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                            <input
                                type="checkbox"
                                checked={showUnreadOnly}
                                onChange={(event) => setShowUnreadOnly(event.target.checked)}
                                className="h-4 w-4"
                            />
                            Uniquement non lues
                        </label>

                        <button
                            type="button"
                            onClick={() => loadInbox()}
                            className="px-3 py-2 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Rafraichir
                        </button>

                        <button
                            type="button"
                            onClick={handleMarkAllRead}
                            disabled={markAllBusy}
                            className="px-3 py-2 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
                        >
                            {markAllBusy ? 'Traitement...' : 'Tout marquer lu'}
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Etat</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Titre</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Message</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {!loading && filteredItems.map((item) => (
                                <tr key={item.id} className={item.isRead ? '' : 'bg-blue-50/60'}>
                                    <td className="px-4 py-3 text-sm text-slate-700">{item.isRead ? 'Lue' : 'Nouvelle'}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{item.title}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700">{item.message}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700">{item.eventTypeLabel}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700">{formatDateTime(item.createdAt)}</td>
                                    <td className="px-4 py-3 text-sm">
                                        <button
                                            type="button"
                                            onClick={() => handleMarkRead(item)}
                                            disabled={rowBusyId === item.id}
                                            className="text-blue-700 hover:text-blue-900 font-semibold"
                                        >
                                            {rowBusyId === item.id ? '...' : (item.actionUrl ? 'Voir details' : 'Marquer lu')}
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {!loading && filteredItems.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                                        Aucune notification trouvee.
                                    </td>
                                </tr>
                            )}

                            {loading && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                                        Chargement des notifications...
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default NotificationsManagement;
