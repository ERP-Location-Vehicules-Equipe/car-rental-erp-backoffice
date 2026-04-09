import React, { useCallback, useEffect, useMemo, useState } from 'react';
import authService from '../../Services/authService';
import fleetService from '../../Services/fleetService';
import { getAgencesCachedSafe } from '../../Services/agenceLookupService';
import CategoriesSection from './components/CategoriesSection';
import EntretiensSection from './components/EntretiensSection';
import MarquesSection from './components/MarquesSection';
import ModelesSection from './components/ModelesSection';
import VehiclesSection from './components/VehiclesSection';
import { extractApiMessage } from './components/fleetUiUtils';

const TABS = [
    { id: 'vehicles', label: 'Vehicules' },
    { id: 'entretiens', label: 'Entretiens' },
    { id: 'categories', label: 'Categories' },
    { id: 'marques', label: 'Marques' },
    { id: 'modeles', label: 'Modeles' },
];

const FleetManagement = () => {
    const currentUser = authService.getCurrentUser();
    const isSuperAdmin = currentUser?.role === authService.ROLE_SUPER_ADMIN;
    const isAdmin = currentUser?.role === authService.ROLE_ADMIN;
    const userAgenceId = currentUser?.agence_id;

    const canEditReferences = isSuperAdmin;
    const canManageVehicles = isSuperAdmin || isAdmin;
    const canManageEntretiens = isSuperAdmin || isAdmin;

    const [activeTab, setActiveTab] = useState('vehicles');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const [categories, setCategories] = useState([]);
    const [marques, setMarques] = useState([]);
    const [modeles, setModeles] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [entretiens, setEntretiens] = useState([]);
    const [agences, setAgences] = useState([]);
    const [agenceWarning, setAgenceWarning] = useState('');

    const roleBadge = useMemo(() => {
        if (isSuperAdmin) {
            return { label: 'SUPER ADMIN', className: 'bg-amber-100 text-amber-800 border border-amber-200' };
        }
        if (isAdmin) {
            return { label: 'ADMIN', className: 'bg-indigo-100 text-indigo-800 border border-indigo-200' };
        }
        return { label: 'EMPLOYE', className: 'bg-emerald-100 text-emerald-800 border border-emerald-200' };
    }, [isAdmin, isSuperAdmin]);

    const loadAll = useCallback(async (silent = false) => {
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            setError('');
            const [
                categoriesData,
                marquesData,
                modelesData,
                vehiclesData,
                entretiensData,
                agencesResult,
            ] = await Promise.all([
                fleetService.getCategories(),
                fleetService.getMarques(),
                fleetService.getModeles(),
                fleetService.getVehicles(),
                fleetService.getEntretiens(),
                getAgencesCachedSafe(),
            ]);

            setCategories(Array.isArray(categoriesData) ? categoriesData : []);
            setMarques(Array.isArray(marquesData) ? marquesData : []);
            setModeles(Array.isArray(modelesData) ? modelesData : []);
            setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
            setEntretiens(Array.isArray(entretiensData) ? entretiensData : []);
            setAgences(Array.isArray(agencesResult.agences) ? agencesResult.agences : []);
            setAgenceWarning(
                agencesResult.available
                    ? ''
                    : "Service Agence indisponible. Les noms d'agences peuvent etre incomplets."
            );
        } catch (loadError) {
            setError(extractApiMessage(loadError, 'Erreur lors du chargement du service de gestion de parc.'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const executeAction = async (action, successMessage, errorMessageFactory, onDone) => {
        setError('');
        setNotice('');
        try {
            await action();
            if (successMessage) {
                setNotice(successMessage);
            }
            await loadAll(true);
            if (typeof onDone === 'function') {
                onDone();
            }
        } catch (actionError) {
            const fallback = typeof errorMessageFactory === 'function'
                ? errorMessageFactory()
                : errorMessageFactory;
            setError(extractApiMessage(actionError, fallback || "Operation impossible pour l'instant."));
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Gestion de Parc</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Pilotage du service fleet-service: references, vehicules et entretiens.
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${roleBadge.className}`}>
                                {roleBadge.label}
                            </span>
                            <span className="text-xs text-slate-500">
                                Portee agence: {userAgenceId ? `Agence #${userAgenceId}` : 'globale'}
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => loadAll(true)}
                        className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
                        disabled={refreshing}
                    >
                        {refreshing ? 'Actualisation...' : 'Rafraichir'}
                    </button>
                </div>
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
            {agenceWarning && (
                <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
                    <p className="text-sm font-medium text-amber-700">{agenceWarning}</p>
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                            activeTab === tab.id
                                ? 'bg-slate-800 text-white'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'vehicles' && (
                <VehiclesSection
                    vehicles={vehicles}
                    categories={categories}
                    modeles={modeles}
                    agences={agences}
                    canManageVehicles={canManageVehicles}
                    isSuperAdmin={isSuperAdmin}
                    userAgenceId={userAgenceId}
                    executeAction={executeAction}
                />
            )}

            {activeTab === 'entretiens' && (
                <EntretiensSection
                    entretiens={entretiens}
                    vehicles={vehicles}
                    canManage={canManageEntretiens}
                    executeAction={executeAction}
                />
            )}

            {activeTab === 'categories' && (
                <CategoriesSection
                    categories={categories}
                    canEdit={canEditReferences}
                    executeAction={executeAction}
                />
            )}

            {activeTab === 'marques' && (
                <MarquesSection
                    marques={marques}
                    canEdit={canEditReferences}
                    executeAction={executeAction}
                />
            )}

            {activeTab === 'modeles' && (
                <ModelesSection
                    modeles={modeles}
                    marques={marques}
                    canEdit={canEditReferences}
                    executeAction={executeAction}
                />
            )}
        </div>
    );
};

export default FleetManagement;
