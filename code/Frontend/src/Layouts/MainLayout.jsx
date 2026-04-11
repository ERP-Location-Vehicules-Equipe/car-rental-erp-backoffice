import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

import authService from '../Services/authService';
import notificationService from '../Services/notificationService';

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

const MainLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const canManageUsers = authService.canManageUsers();

    const [unreadCount, setUnreadCount] = useState(0);
    const [latestNotification, setLatestNotification] = useState(null);
    const [recentNotifications, setRecentNotifications] = useState([]);
    const [isBellOpen, setIsBellOpen] = useState(false);

    const lastSeenNotificationIdRef = useRef(null);
    const bellWrapperRef = useRef(null);

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    const menuItems = [
        { name: 'Tableau de bord', path: '/dashboard' },
        { name: 'Agences', path: '/agences' },
        { name: 'Gestion Parc', path: '/fleet' },
        { name: 'Transfers', path: '/transferts' },
        { name: 'Locations', path: '/locations' },
        { name: 'Finance', path: '/finance' },
        { name: 'Profil', path: '/profile' },
    ];

    if (canManageUsers) {
        menuItems.splice(2, 0, { name: 'Utilisateurs', path: '/users' });
    }

    const refreshNotifications = useCallback(async ({ allowPopup } = { allowPopup: false }) => {
        try {
            const [count, inbox] = await Promise.all([
                notificationService.getUnreadCount(),
                notificationService.getInbox({ limit: 8, offset: 0, unreadOnly: false }),
            ]);

            setUnreadCount(count);
            setRecentNotifications(Array.isArray(inbox) ? inbox : []);

            if (!Array.isArray(inbox) || inbox.length === 0) {
                return;
            }

            const newest = inbox[0];
            const newestId = Number(newest.id);

            if (
                allowPopup
                && !newest.isRead
                && lastSeenNotificationIdRef.current !== null
                && newestId !== Number(lastSeenNotificationIdRef.current)
                && !location.pathname.startsWith('/notifications')
            ) {
                setLatestNotification(newest);
            }

            lastSeenNotificationIdRef.current = newestId;
        } catch {
            // Keep UI stable if notification service is unavailable.
        }
    }, [location.pathname]);

    useEffect(() => {
        const t = window.setTimeout(() => {
            void refreshNotifications({ allowPopup: false });
        }, 0);

        const interval = window.setInterval(() => {
            void refreshNotifications({ allowPopup: true });
        }, 12000);

        return () => {
            window.clearTimeout(t);
            window.clearInterval(interval);
        };
    }, [refreshNotifications]);

    useEffect(() => {
        const onDocumentClick = (event) => {
            if (!bellWrapperRef.current) {
                return;
            }
            if (!bellWrapperRef.current.contains(event.target)) {
                setIsBellOpen(false);
            }
        };

        document.addEventListener('mousedown', onDocumentClick);
        return () => {
            document.removeEventListener('mousedown', onDocumentClick);
        };
    }, []);

    const unreadBadgeLabel = useMemo(() => {
        if (unreadCount <= 0) {
            return '';
        }
        return unreadCount > 99 ? '99+' : String(unreadCount);
    }, [unreadCount]);

    const markReadAndNavigate = async (notification, fallbackToMessages = true) => {
        try {
            if (!notification.isRead) {
                await notificationService.markRead(notification.id);
                setUnreadCount((prev) => Math.max(0, prev - 1));
                setRecentNotifications((prev) => prev.map((item) => (
                    item.id === notification.id ? { ...item, isRead: true } : item
                )));
            }
        } catch {
            // Do not block navigation.
        }

        setLatestNotification(null);

        if (notification.actionUrl) {
            navigate(notification.actionUrl);
            return;
        }

        if (fallbackToMessages) {
            navigate('/notifications');
        }
    };

    const markAllBellNotificationsRead = async () => {
        try {
            await notificationService.markAllRead();
            setUnreadCount(0);
            setRecentNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
        } catch {
            // Keep UI responsive if API fails.
        }
    };

    return (
        <div className="erp-theme min-h-screen flex flex-col">
            <nav className="erp-nav-glass sticky top-0 z-30 mx-3 mt-3 rounded-2xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <img
                                    className="h-9 w-auto object-contain"
                                    src="/src/images/logo.png"
                                    alt="Logo ERP"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://ui-avatars.com/api/?name=ERP&background=0f4ca6&color=fff&rounded=true';
                                    }}
                                />
                                <span className="ml-3 erp-title-font font-bold text-xl text-slate-800 tracking-tight">ERP Auto</span>
                            </div>
                            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                                {menuItems.map((item) => {
                                    const isActive = location.pathname.startsWith(item.path);
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            className={`${isActive
                                                ? 'border-blue-700 text-slate-900'
                                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                                                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-semibold transition-colors duration-150`}
                                        >
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative" ref={bellWrapperRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsBellOpen((prev) => !prev)}
                                    className="relative inline-flex items-center justify-center w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                    title="Notifications"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                                        <path d="M9 17a3 3 0 0 0 6 0" />
                                    </svg>
                                    {unreadBadgeLabel && (
                                        <span className="absolute -top-1 -right-1 inline-flex min-w-[1.2rem] h-5 px-1 items-center justify-center rounded-full text-[10px] font-bold text-white bg-blue-700">
                                            {unreadBadgeLabel}
                                        </span>
                                    )}
                                </button>

                                {isBellOpen && (
                                    <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-1.5rem)] rounded-xl border border-slate-200 bg-white shadow-xl z-50">
                                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                            <p className="text-sm font-bold text-slate-900">Notifications</p>
                                            <button
                                                type="button"
                                                onClick={markAllBellNotificationsRead}
                                                className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                                            >
                                                Tout marquer lu
                                            </button>
                                        </div>

                                        <div className="max-h-80 overflow-y-auto">
                                            {recentNotifications.length === 0 && (
                                                <p className="px-4 py-6 text-sm text-slate-500">Aucun message pour le moment.</p>
                                            )}

                                            {recentNotifications.map((item) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setIsBellOpen(false);
                                                        markReadAndNavigate(item, true);
                                                    }}
                                                    className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 ${item.isRead ? 'bg-white' : 'bg-blue-50/50'}`}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                                        {!item.isRead && <span className="inline-block w-2 h-2 rounded-full bg-blue-600" />}
                                                    </div>
                                                    <p className="mt-1 text-xs text-slate-600 line-clamp-2">{item.message}</p>
                                                    <p className="mt-1 text-[11px] text-slate-400">{formatDateTime(item.createdAt)}</p>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="px-4 py-2 border-t border-slate-100">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsBellOpen(false);
                                                    navigate('/notifications');
                                                }}
                                                className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                                            >
                                                Voir tous les messages
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors duration-150"
                            >
                                Deconnexion
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="flex-1 w-full mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-7xl">
                <Outlet />
            </main>

            <button
                type="button"
                onClick={() => navigate('/notifications')}
                className="erp-fab"
            >
                Messages
                {unreadBadgeLabel && <span className="erp-fab-badge">{unreadBadgeLabel}</span>}
            </button>

            {latestNotification && (
                <div className="erp-toast-enter fixed right-5 bottom-20 z-50 w-[23rem] max-w-[calc(100vw-2rem)] rounded-xl border border-blue-200 bg-white shadow-2xl p-4">
                    <p className="text-[11px] uppercase tracking-wide font-semibold text-blue-700">Nouvelle notification</p>
                    <h3 className="mt-1 text-sm font-bold text-slate-900">{latestNotification.title}</h3>
                    <p className="mt-1 text-sm text-slate-700">{latestNotification.message}</p>
                    <p className="mt-2 text-[11px] text-slate-400">{formatDateTime(latestNotification.createdAt)}</p>

                    <div className="mt-3 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => markReadAndNavigate(latestNotification, true)}
                            className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700"
                        >
                            Voir le message
                        </button>

                        {latestNotification.actionUrl && (
                            <button
                                type="button"
                                onClick={() => markReadAndNavigate(latestNotification, false)}
                                className="px-3 py-1.5 rounded-md text-xs font-semibold text-blue-700 border border-blue-200 hover:bg-blue-50"
                            >
                                Aller a l'action
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setLatestNotification(null)}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-800"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MainLayout;
