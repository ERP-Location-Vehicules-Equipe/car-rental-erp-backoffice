import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../../Services/authService';
import fleetService from '../../Services/fleetService';
import financeService from '../../Services/financeService';
import locationService from '../../Services/locationService';
import notificationService from '../../Services/notificationService';
import transferService from '../../Services/transferService';
import userService from '../../Services/userService';
import { getAgencesCachedSafe } from '../../Services/agenceLookupService';

const getRoleBadge = (role) => {
    if (role === authService.ROLE_SUPER_ADMIN) {
        return {
            label: 'SUPER ADMIN',
            className: 'bg-amber-100 text-amber-800 border border-amber-200',
        };
    }
    if (role === authService.ROLE_ADMIN) {
        return {
            label: 'ADMIN',
            className: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
        };
    }
    return {
        label: 'EMPLOYE',
        className: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    };
};

const toArray = (value) => (Array.isArray(value) ? value : []);

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const formatInteger = (value) => {
    return new Intl.NumberFormat('fr-MA', {
        maximumFractionDigits: 0,
    }).format(toNumber(value));
};

const formatMoney = (value) => {
    return new Intl.NumberFormat('fr-MA', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(toNumber(value));
};

const formatDateTime = (value) => {
    if (!value) {
        return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '-';
    }
    return date.toLocaleString();
};

const prettifyMonth = (monthValue) => {
    if (!monthValue || typeof monthValue !== 'string') {
        return '-';
    }
    const [year, month] = monthValue.split('-');
    if (!year || !month) {
        return monthValue;
    }
    const date = new Date(Number(year), Number(month) - 1, 1);
    if (Number.isNaN(date.getTime())) {
        return monthValue;
    }
    return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
};

const KpiCard = ({ title, value, hint, tone = 'slate' }) => {
    const toneStyles = {
        blue: 'text-blue-700',
        emerald: 'text-emerald-700',
        rose: 'text-rose-700',
        amber: 'text-amber-700',
        indigo: 'text-indigo-700',
        slate: 'text-slate-900',
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">{title}</p>
            <p className={`mt-2 text-2xl font-bold ${toneStyles[tone] || toneStyles.slate}`}>{value}</p>
            <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
    );
};

const ProgressRows = ({ rows }) => {
    const maxValue = rows.reduce((max, row) => Math.max(max, toNumber(row.value)), 0) || 1;

    return (
        <div className="space-y-3">
            {rows.map((row) => {
                const width = `${Math.max(4, (toNumber(row.value) / maxValue) * 100)}%`;
                return (
                    <div key={row.label} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">{row.label}</span>
                            <span className="text-slate-500">{formatInteger(row.value)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className={`h-full ${row.colorClass}`} style={{ width }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const MonthlyFinanceBars = ({ rows }) => {
    const safeRows = toArray(rows).slice(0, 6);
    const maxValue = safeRows.reduce((max, row) => {
        return Math.max(max, toNumber(row.revenue), toNumber(row.charges), toNumber(row.paiements));
    }, 0) || 1;

    if (safeRows.length === 0) {
        return <p className="text-sm text-slate-500">Aucune donnee mensuelle disponible.</p>;
    }

    return (
        <div className="space-y-3">
            {safeRows.map((row) => (
                <div key={row.month} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">{prettifyMonth(row.month)}</span>
                        <span className="text-slate-500">Profit: {formatMoney(row.profit)}</span>
                    </div>
                    <div className="space-y-1">
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-blue-600" style={{ width: `${Math.max(4, (toNumber(row.revenue) / maxValue) * 100)}%` }} />
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-rose-500" style={{ width: `${Math.max(4, (toNumber(row.charges) / maxValue) * 100)}%` }} />
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-emerald-600" style={{ width: `${Math.max(4, (toNumber(row.paiements) / maxValue) * 100)}%` }} />
                        </div>
                    </div>
                </div>
            ))}
            <div className="pt-1 flex flex-wrap gap-3 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-600" /> Revenu</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Charges</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-600" /> Paiements</span>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const user = authService.getCurrentUser();
    const canManageUsers = authService.canManageUsers();
    const canManageAgences = authService.canManageAgences();
    const roleBadge = getRoleBadge(user?.role);
    const userAgenceId = user?.agence_id;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [warnings, setWarnings] = useState([]);

    const [agences, setAgences] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [locations, setLocations] = useState([]);
    const [locationStats, setLocationStats] = useState(null);
    const [transfers, setTransfers] = useState([]);
    const [financeStats, setFinanceStats] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [usersCount, setUsersCount] = useState(null);

    const loadDashboard = useCallback(async (silent = false) => {
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        setError('');
        setWarnings([]);

        const requests = [
            getAgencesCachedSafe(),
            fleetService.getVehicles(),
            locationService.getLocations(),
            locationService.getLocationStats(),
            transferService.getTransfers(),
            financeService.getDashboardStats(),
            notificationService.getUnreadCount(),
            canManageUsers ? userService.getAllUsers() : Promise.resolve(null),
        ];

        const [
            agencesResult,
            vehiclesResult,
            locationsResult,
            locationStatsResult,
            transfersResult,
            financeResult,
            unreadResult,
            usersResult,
        ] = await Promise.allSettled(requests);

        const nextWarnings = [];

        const agencesPayload = agencesResult.status === 'fulfilled' ? agencesResult.value : { agences: [], available: false };
        const agencesList = toArray(agencesPayload?.agences);
        setAgences(agencesList);
        if (!agencesPayload?.available) {
            nextWarnings.push("Service Agence indisponible. Les noms peuvent etre limites.");
        }

        if (vehiclesResult.status === 'fulfilled') {
            setVehicles(toArray(vehiclesResult.value));
        } else {
            setVehicles([]);
            nextWarnings.push('Service Fleet indisponible temporairement.');
        }

        if (locationsResult.status === 'fulfilled') {
            setLocations(toArray(locationsResult.value));
        } else {
            setLocations([]);
            nextWarnings.push('Service Location indisponible temporairement.');
        }

        if (locationStatsResult.status === 'fulfilled') {
            setLocationStats(locationStatsResult.value || null);
        } else {
            setLocationStats(null);
        }

        if (transfersResult.status === 'fulfilled') {
            setTransfers(toArray(transfersResult.value));
        } else {
            setTransfers([]);
            nextWarnings.push('Service Transfer indisponible temporairement.');
        }

        if (financeResult.status === 'fulfilled') {
            setFinanceStats(financeResult.value || null);
        } else {
            setFinanceStats(null);
            nextWarnings.push('Service Finance indisponible temporairement.');
        }

        if (unreadResult.status === 'fulfilled') {
            setUnreadCount(toNumber(unreadResult.value));
        } else {
            setUnreadCount(0);
        }

        if (canManageUsers && usersResult.status === 'fulfilled') {
            const users = toArray(usersResult.value);
            setUsersCount(users.length);
        } else {
            setUsersCount(null);
        }

        setWarnings(nextWarnings);

        const failedCount = [
            vehiclesResult,
            locationsResult,
            transfersResult,
            financeResult,
        ].filter((result) => result.status === 'rejected').length;

        if (failedCount >= 4) {
            setError('Plusieurs services sont indisponibles. Reessayez dans quelques secondes.');
        }

        setLoading(false);
        setRefreshing(false);
    }, [canManageUsers]);

    useEffect(() => {
        const t = window.setTimeout(() => {
            void loadDashboard();
        }, 0);
        return () => window.clearTimeout(t);
    }, [loadDashboard]);

    const agenceById = useMemo(() => {
        return agences.reduce((acc, agence) => {
            acc[Number(agence.id)] = agence.nom;
            return acc;
        }, {});
    }, [agences]);

    const agenceName = useMemo(() => {
        if (!userAgenceId) {
            return '-';
        }
        return agenceById[Number(userAgenceId)] || "Pas d'agence";
    }, [agenceById, userAgenceId]);

    const fleetStats = useMemo(() => {
        const total = vehicles.length;
        const available = vehicles.filter((item) => String(item?.statut || '').toLowerCase() === 'disponible').length;
        const maintenance = vehicles.filter((item) => {
            const status = String(item?.statut || '').toLowerCase();
            return status.includes('maintenance') || status.includes('entretien');
        }).length;
        const unavailable = vehicles.filter((item) => {
            const status = String(item?.statut || '').toLowerCase();
            return status && status !== 'disponible' && !status.includes('maintenance') && !status.includes('entretien');
        }).length;
        return { total, available, maintenance, unavailable };
    }, [vehicles]);

    const computedLocationStats = useMemo(() => {
        const fromApi = locationStats || {};
        const total = toNumber(fromApi.total, locations.length);
        const enCours = toNumber(
            fromApi.en_cours,
            locations.filter((item) => String(item?.etat || '').toLowerCase() === 'en_cours').length,
        );
        const terminees = toNumber(
            fromApi.terminees,
            locations.filter((item) => String(item?.etat || '').toLowerCase() === 'terminee').length,
        );
        const annulees = toNumber(
            fromApi.annulees,
            locations.filter((item) => String(item?.etat || '').toLowerCase() === 'annulee').length,
        );
        const revenue = toNumber(fromApi.revenue);
        return { total, enCours, terminees, annulees, revenue };
    }, [locationStats, locations]);

    const transferStats = useMemo(() => {
        const pending = transfers.filter((item) => String(item?.etat || '').toUpperCase() === 'PENDING').length;
        const inTransit = transfers.filter((item) => String(item?.etat || '').toUpperCase() === 'IN_TRANSIT').length;
        const completed = transfers.filter((item) => String(item?.etat || '').toUpperCase() === 'COMPLETED').length;
        const cancelled = transfers.filter((item) => String(item?.etat || '').toUpperCase() === 'CANCELLED').length;
        return { total: transfers.length, pending, inTransit, completed, cancelled };
    }, [transfers]);

    const financeOverview = useMemo(() => {
        return {
            revenuTotal: toNumber(financeStats?.revenu_total),
            chargesTotal: toNumber(financeStats?.charges_total),
            benefice: toNumber(financeStats?.benefice),
            totalPaiements: toNumber(financeStats?.total_paiements),
            nbFactures: toNumber(financeStats?.nb_factures),
            scope: financeStats?.scope || (user?.role === authService.ROLE_SUPER_ADMIN ? 'global' : 'agence'),
            monthly: toArray(financeStats?.monthly_overview).slice(0, 6),
        };
    }, [financeStats, user?.role]);

    const scopeLabel = useMemo(() => {
        if (financeOverview.scope === 'global') {
            return 'Vue globale multi-agences';
        }
        return agenceName !== '-' ? `Vue agence: ${agenceName}` : 'Vue agence';
    }, [agenceName, financeOverview.scope]);

    const quickActions = useMemo(() => {
        const actions = [
            { to: '/locations', label: 'Nouvelle location', hint: 'Demarrer une nouvelle reservation' },
            { to: '/transferts', label: 'Gerer transferts', hint: 'Suivre les demandes inter-agences' },
            { to: '/fleet', label: 'Gestion parc', hint: 'Vehicules, categories et entretiens' },
            { to: '/finance', label: 'Vue finance', hint: 'Factures, paiements, charges' },
            { to: '/notifications', label: 'Boite notifications', hint: 'Historique complet des messages' },
            { to: '/profile', label: 'Mon profil', hint: 'Modifier vos informations personnelles' },
        ];
        if (canManageUsers) {
            actions.push({ to: '/users', label: 'Utilisateurs', hint: 'Gestion des roles et acces' });
        }
        if (canManageAgences) {
            actions.push({ to: '/agences', label: 'Agences', hint: 'Pilotage des agences ERP' });
        }
        return actions;
    }, [canManageAgences, canManageUsers]);

    const locationRows = useMemo(() => ([
        { label: 'En cours', value: computedLocationStats.enCours, colorClass: 'bg-blue-600' },
        { label: 'Terminees', value: computedLocationStats.terminees, colorClass: 'bg-emerald-600' },
        { label: 'Annulees', value: computedLocationStats.annulees, colorClass: 'bg-rose-500' },
    ]), [computedLocationStats.annulees, computedLocationStats.enCours, computedLocationStats.terminees]);

    const transferRows = useMemo(() => ([
        { label: 'Pending', value: transferStats.pending, colorClass: 'bg-amber-500' },
        { label: 'In transit', value: transferStats.inTransit, colorClass: 'bg-blue-600' },
        { label: 'Completed', value: transferStats.completed, colorClass: 'bg-emerald-600' },
        { label: 'Cancelled', value: transferStats.cancelled, colorClass: 'bg-rose-500' },
    ]), [transferStats.cancelled, transferStats.completed, transferStats.inTransit, transferStats.pending]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-2xl font-bold text-slate-900">Tableau de bord operationnel</h2>
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${roleBadge.className}`}>
                                {roleBadge.label}
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                            Bonjour {user?.nom || 'Utilisateur'}, voici une vue centralisee des services ERP.
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                            {scopeLabel} | Agence session: {agenceName} | Email: {user?.email || '-'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => loadDashboard(true)}
                        className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
                        disabled={refreshing}
                    >
                        {refreshing ? 'Actualisation...' : 'Rafraichir'}
                    </button>
                </div>
            </section>

            {error && (
                <div className="bg-red-50 p-4 rounded-md border border-red-200">
                    <p className="text-sm font-medium text-red-700">{error}</p>
                </div>
            )}

            {warnings.length > 0 && (
                <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
                    {warnings.map((warning) => (
                        <p key={warning} className="text-sm font-medium text-amber-700">{warning}</p>
                    ))}
                </div>
            )}

            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <KpiCard title="Vehicules total" value={formatInteger(fleetStats.total)} hint="Parc roulant global" tone="slate" />
                <KpiCard title="Vehicules disponibles" value={formatInteger(fleetStats.available)} hint="Prets pour location" tone="emerald" />
                <KpiCard title="Locations en cours" value={formatInteger(computedLocationStats.enCours)} hint={`Total locations: ${formatInteger(computedLocationStats.total)}`} tone="blue" />
                <KpiCard title="Transfers pending" value={formatInteger(transferStats.pending)} hint={`In transit: ${formatInteger(transferStats.inTransit)}`} tone="amber" />
                <KpiCard title="Revenu location" value={formatMoney(computedLocationStats.revenue)} hint="Synthese location-service" tone="indigo" />
                <KpiCard title="Benefice finance" value={formatMoney(financeOverview.benefice)} hint={`Charges: ${formatMoney(financeOverview.chargesTotal)}`} tone="emerald" />
                <KpiCard title="Factures" value={formatInteger(financeOverview.nbFactures)} hint={`Paiements recus: ${formatMoney(financeOverview.totalPaiements)}`} tone="slate" />
                <KpiCard title="Notifications non lues" value={formatInteger(unreadCount)} hint="Messages a traiter" tone={unreadCount > 0 ? 'rose' : 'blue'} />
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-lg font-bold text-slate-900">Pilotage operations</h3>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-800">
                            {scopeLabel}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border border-slate-200 rounded-lg p-4">
                            <p className="text-sm font-semibold text-slate-900 mb-3">Pipeline locations</p>
                            <ProgressRows rows={locationRows} />
                        </div>
                        <div className="border border-slate-200 rounded-lg p-4">
                            <p className="text-sm font-semibold text-slate-900 mb-3">Pipeline transfers</p>
                            <ProgressRows rows={transferRows} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="border border-slate-200 rounded-lg p-3">
                            <p className="text-xs uppercase font-semibold text-slate-500">Parc indisponible</p>
                            <p className="text-xl font-bold text-rose-700 mt-1">{formatInteger(fleetStats.unavailable)}</p>
                        </div>
                        <div className="border border-slate-200 rounded-lg p-3">
                            <p className="text-xs uppercase font-semibold text-slate-500">En maintenance</p>
                            <p className="text-xl font-bold text-amber-700 mt-1">{formatInteger(fleetStats.maintenance)}</p>
                        </div>
                        <div className="border border-slate-200 rounded-lg p-3">
                            <p className="text-xs uppercase font-semibold text-slate-500">Transfers traites</p>
                            <p className="text-xl font-bold text-emerald-700 mt-1">{formatInteger(transferStats.completed)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
                    <h3 className="text-lg font-bold text-slate-900">Finance express</h3>
                    <div className="grid grid-cols-1 gap-2">
                        <div className="border border-slate-200 rounded-lg p-3">
                            <p className="text-xs font-semibold uppercase text-slate-500">Revenu total</p>
                            <p className="text-xl font-bold text-blue-700 mt-1">{formatMoney(financeOverview.revenuTotal)}</p>
                        </div>
                        <div className="border border-slate-200 rounded-lg p-3">
                            <p className="text-xs font-semibold uppercase text-slate-500">Charges total</p>
                            <p className="text-xl font-bold text-rose-700 mt-1">{formatMoney(financeOverview.chargesTotal)}</p>
                        </div>
                    </div>
                    <MonthlyFinanceBars rows={financeOverview.monthly} />
                    <Link
                        to="/finance"
                        className="inline-flex items-center justify-center w-full px-4 py-2 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
                    >
                        Ouvrir module Finance
                    </Link>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                    <h3 className="text-lg font-bold text-slate-900 mb-3">Acces rapides</h3>
                    <div className="space-y-2">
                        {quickActions.map((action) => (
                            <Link
                                key={action.to}
                                to={action.to}
                                className="block border border-slate-200 rounded-lg p-3 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                            >
                                <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{action.hint}</p>
                            </Link>
                        ))}
                    </div>
                    <div className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500">
                        <p>Agences visibles: {formatInteger(agences.length)}</p>
                        {usersCount !== null && <p>Utilisateurs visibles: {formatInteger(usersCount)}</p>}
                        <p>Derniere synchro: {formatDateTime(new Date().toISOString())}</p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Dashboard;
