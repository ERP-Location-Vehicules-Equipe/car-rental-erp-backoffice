import React, { useMemo } from 'react';

const formatMoney = (value) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat('fr-MA', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

const prettifyMonth = (value) => {
    if (!value || typeof value !== 'string' || value.length < 7) {
        return value || '-';
    }
    const [year, month] = value.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
};

const statusLabel = (value) => {
    if (value === 'validee' || value === 'payee') {
        return 'Payees';
    }
    if (value === 'en_attente') {
        return 'En attente';
    }
    return 'Autres';
};

const FinanceOverviewPanel = ({ rapport, dashboardStats, scopeLabel, agenceById = {} }) => {
    const monthlyData = Array.isArray(dashboardStats?.monthly_overview)
        ? dashboardStats.monthly_overview
        : [];

    const chargesByType = Array.isArray(dashboardStats?.charges_by_type)
        ? dashboardStats.charges_by_type
        : [];

    const statusData = Array.isArray(dashboardStats?.factures_by_status)
        ? dashboardStats.factures_by_status
        : [];
    const agenceFinanceStats = Array.isArray(dashboardStats?.agence_finance_stats)
        ? dashboardStats.agence_finance_stats
        : [];
    const isSuperAdminScope = dashboardStats?.scope === 'global';

    const monthMax = useMemo(() => {
        const maxValue = monthlyData.reduce((max, row) => {
            return Math.max(
                max,
                Number(row?.revenue || 0),
                Number(row?.charges || 0),
                Number(row?.paiements || 0),
            );
        }, 0);
        return maxValue > 0 ? maxValue : 1;
    }, [monthlyData]);

    const statusTotal = useMemo(() => {
        const total = statusData.reduce((acc, row) => acc + Number(row?.count || 0), 0);
        return total > 0 ? total : 1;
    }, [statusData]);

    return (
        <section className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Revenu Total</p>
                    <p className="text-2xl font-bold text-slate-900">{formatMoney(dashboardStats?.revenu_total)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Charges Totales</p>
                    <p className="text-2xl font-bold text-rose-700">{formatMoney(dashboardStats?.charges_total)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Benefice</p>
                    <p className="text-2xl font-bold text-emerald-700">{formatMoney(dashboardStats?.benefice)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Paiements Recus</p>
                    <p className="text-2xl font-bold text-blue-700">{formatMoney(dashboardStats?.total_paiements)}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase">
                        {isSuperAdminScope ? 'Solde Comptes (Global)' : 'Solde Compte Agence'}
                    </p>
                    <p className="text-2xl font-bold text-indigo-700">
                        {formatMoney(isSuperAdminScope ? dashboardStats?.total_comptes_solde : dashboardStats?.agence_compte_solde)}
                    </p>
                    {!isSuperAdminScope && (
                        <p className="mt-1 text-xs text-slate-500">{dashboardStats?.agence_compte_nom || 'Compte non configure'}</p>
                    )}
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h3 className="text-lg font-bold text-slate-900">Vue globale Finance</h3>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold border border-blue-200 bg-blue-50 text-blue-800">
                        {scopeLabel}
                    </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 text-sm">
                    <div><span className="font-semibold text-slate-700">Total Factures:</span> {formatMoney(rapport?.total_factures)}</div>
                    <div><span className="font-semibold text-slate-700">Total Paiements:</span> {formatMoney(rapport?.total_paiements)}</div>
                    <div><span className="font-semibold text-slate-700">Total Charges:</span> {formatMoney(rapport?.total_charges)}</div>
                    <div><span className="font-semibold text-slate-700">Solde Net:</span> {formatMoney(rapport?.solde_net)}</div>
                    <div><span className="font-semibold text-slate-700">Factures:</span> {Number(dashboardStats?.nb_factures || 0)}</div>
                </div>
            </div>

            {isSuperAdminScope && (
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-slate-900 mb-3">Synthese par agence</h4>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Agence</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Compte</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Solde Compte</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Paiements Locations</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Charges</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Solde Operations</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {agenceFinanceStats.map((row) => {
                                    const agenceLabel = agenceById[Number(row.agence_id)] || 'Agence inconnue';
                                    return (
                                        <tr key={row.agence_id}>
                                            <td className="px-4 py-2 text-sm text-slate-700">{agenceLabel}</td>
                                            <td className="px-4 py-2 text-sm text-slate-700">{row.compte_nom || '-'}</td>
                                            <td className="px-4 py-2 text-sm font-semibold text-indigo-700">{formatMoney(row.solde_compte)}</td>
                                            <td className="px-4 py-2 text-sm text-blue-700">{formatMoney(row.total_paiements)}</td>
                                            <td className="px-4 py-2 text-sm text-rose-700">{formatMoney(row.total_charges)}</td>
                                            <td className="px-4 py-2 text-sm font-semibold text-emerald-700">{formatMoney(row.solde_operations)}</td>
                                        </tr>
                                    );
                                })}
                                {agenceFinanceStats.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                                            Aucune agence finance disponible.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 bg-white border border-slate-200 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-slate-900 mb-3">Evolution mensuelle (6 derniers mois)</h4>
                    <div className="space-y-3">
                        {monthlyData.length === 0 && (
                            <p className="text-sm text-slate-500">Aucune donnee disponible.</p>
                        )}
                        {monthlyData.map((row) => {
                            const revenue = Number(row?.revenue || 0);
                            const charges = Number(row?.charges || 0);
                            const paiements = Number(row?.paiements || 0);
                            const revenueWidth = `${Math.max(4, (revenue / monthMax) * 100)}%`;
                            const chargeWidth = `${Math.max(4, (charges / monthMax) * 100)}%`;
                            const paiementWidth = `${Math.max(4, (paiements / monthMax) * 100)}%`;

                            return (
                                <div key={row.month} className="space-y-1.5">
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span className="font-semibold text-slate-700">{prettifyMonth(row.month)}</span>
                                        <span>Profit: {formatMoney(row?.profit)}</span>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                            <div className="h-full bg-blue-600" style={{ width: revenueWidth }} />
                                        </div>
                                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                            <div className="h-full bg-rose-500" style={{ width: chargeWidth }} />
                                        </div>
                                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                            <div className="h-full bg-emerald-600" style={{ width: paiementWidth }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs">
                        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600" /> Revenu</span>
                        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Charges</span>
                        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-600" /> Paiements</span>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-slate-900 mb-3">Repartition des Charges</h4>
                    <div className="space-y-2">
                        {chargesByType.length === 0 && (
                            <p className="text-sm text-slate-500">Aucune charge disponible.</p>
                        )}
                        {chargesByType.map((row) => {
                            const amount = Number(row?.amount || 0);
                            const width = dashboardStats?.charges_total
                                ? `${Math.max(6, (amount / Number(dashboardStats.charges_total || 1)) * 100)}%`
                                : '6%';
                            return (
                                <div key={row.type}>
                                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                                        <span className="font-semibold">{row.type}</span>
                                        <span>{formatMoney(amount)}</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                        <div className="h-full bg-indigo-600" style={{ width }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h4 className="text-sm font-bold text-slate-900 mb-3">Statut des Factures</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {statusData.map((row) => {
                        const count = Number(row?.count || 0);
                        const percent = Math.round((count / statusTotal) * 100);
                        return (
                            <div key={row.status} className="border border-slate-200 rounded-lg p-3">
                                <p className="text-xs uppercase font-semibold text-slate-500">{statusLabel(row.status)}</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{count}</p>
                                <p className="text-xs text-slate-500">{percent}%</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default FinanceOverviewPanel;
