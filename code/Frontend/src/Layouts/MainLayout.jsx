import React, { useEffect, useMemo, useRef, useState } from 'react';
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

    const [notificationItems, setNotificationItems] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [notificationToast, setNotificationToast] = useState(null);

    const topNotificationIdRef = useRef(null);

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
        { name: 'Notifications', path: '/notifications' },
        { name: 'Profil', path: '/profile' },
    ];

    if (canManageUsers) {
        menuItems.splice(2, 0, { name: 'Utilisateurs', path: '/users' });
    }

    const refreshNotifications = async ({ allowToast } = { allowToast: false }) => {
        try {
            const [count, inbox] = await Promise.all([
                notificationService.getUnreadCount(),
                notificationService.getInbox({ limit: 10, offset: 0, unreadOnly: false }),
            ]);

            setUnreadCount(count);
            setNotificationItems(inbox);

            if (inbox.length > 0) {
                const latest = inbox[0];
                if (
                    allowToast
                    && !latest.isRead
                    && topNotificationIdRef.current !== null
                    && Number(latest.id) !== Number(topNotificationIdRef.current)
                ) {
                    setNotificationToast(latest);
                }
                topNotificationIdRef.current = Number(latest.id);
            }
        } catch {
            // Silent fail to keep main UI stable even if notification service is down.
        }
    };

    useEffect(() => {
        refreshNotifications({ allowToast: false });

        const interval = window.setInterval(() => {
            refreshNotifications({ allowToast: true });
        }, 12000);

        return () => {
            window.clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        const closeOnOutsideClick = (event) => {
            if (!isNotificationOpen) {
                return;
            }

            const panel = document.getElementById('notification-panel');
            const button = document.getElementById('notification-button');
            const target = event.target;

            if (panel?.contains(target) || button?.contains(target)) {
                return;
            }
            setIsNotificationOpen(false);
        };

        document.addEventListener('mousedown', closeOnOutsideClick);
        return () => {
            document.removeEventListener('mousedown', closeOnOutsideClick);
        };
    }, [isNotificationOpen]);

    const visibleUnreadBadge = useMemo(() => {
        if (unreadCount <= 0) {
            return '';
        }
        return unreadCount > 99 ? '99+' : String(unreadCount);
    }, [unreadCount]);

    const openNotification = async (item) => {
        try {
            if (!item.isRead) {
                await notificationService.markRead(item.id);
                setNotificationItems((prev) => prev.map((entry) => (
                    entry.id === item.id ? { ...entry, isRead: true } : entry
                )));
                setUnreadCount((prev) => Math.max(0, prev - 1));
            }
        } catch {
            // Ignore read marking failures to avoid blocking navigation.
        }

        setIsNotificationOpen(false);

        if (item.actionUrl) {
            navigate(item.actionUrl);
        } else {
            navigate('/notifications');
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationService.markAllRead();
            setNotificationItems((prev) => prev.map((entry) => ({ ...entry, isRead: true })));
            setUnreadCount(0);
        } catch {
            // Keep UI stable if API fails.
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <nav className="bg-white shadow border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <img
                                    className="h-8 w-auto object-contain"
                                    src="/src/images/logo.png"
                                    alt="Logo ERP"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://ui-avatars.com/api/?name=ERP&background=0284c7&color=fff&rounded=true';
                                    }}
                                />
                                <span className="ml-3 font-bold text-xl text-slate-800 tracking-tight">ERP Auto</span>
                            </div>
                            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                                {menuItems.map((item) => {
                                    const isActive = location.pathname.startsWith(item.path);
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            className={`${isActive
                                                ? 'border-blue-600 text-slate-900'
                                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                                            } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-150`}
                                        >
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 relative">
                            <button
                                id="notification-button"
                                type="button"
                                onClick={() => setIsNotificationOpen((prev) => !prev)}
                                className="relative inline-flex items-center justify-center px-3 py-2 border border-slate-200 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
                            >
                                Notifications
                                {visibleUnreadBadge && (
                                    <span className="ml-2 inline-flex min-w-[1.25rem] h-5 px-1.5 items-center justify-center rounded-full text-[11px] font-bold text-white bg-red-600">
                                        {visibleUnreadBadge}
                                    </span>
                                )}
                            </button>

                            {isNotificationOpen && (
                                <div
                                    id="notification-panel"
                                    className="absolute right-0 top-14 z-40 w-[26rem] max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-lg shadow-xl"
                                >
                                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                        <p className="text-sm font-semibold text-slate-900">Notifications recentes</p>
                                        <button
                                            type="button"
                                            onClick={handleMarkAllRead}
                                            className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                                        >
                                            Tout marquer lu
                                        </button>
                                    </div>

                                    <div className="max-h-96 overflow-y-auto">
                                        {notificationItems.length === 0 && (
                                            <p className="px-4 py-6 text-sm text-slate-500">Aucune notification pour le moment.</p>
                                        )}

                                        {notificationItems.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => openNotification(item)}
                                                className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${item.isRead ? 'bg-white' : 'bg-blue-50/70'}`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                                    {!item.isRead && (
                                                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600" />
                                                    )}
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
                                                setIsNotificationOpen(false);
                                                navigate('/notifications');
                                            }}
                                            className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                                        >
                                            Ouvrir le centre des notifications
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors duration-150"
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

            {notificationToast && (
                <div className="fixed right-5 bottom-5 z-50 w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border border-blue-200 bg-white shadow-2xl p-4">
                    <p className="text-[11px] uppercase tracking-wide font-semibold text-blue-700">Nouvelle notification</p>
                    <h3 className="mt-1 text-sm font-bold text-slate-900">{notificationToast.title}</h3>
                    <p className="mt-1 text-sm text-slate-700">{notificationToast.message}</p>
                    <div className="mt-3 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => openNotification(notificationToast)}
                            className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700"
                        >
                            Voir
                        </button>
                        <button
                            type="button"
                            onClick={() => setNotificationToast(null)}
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