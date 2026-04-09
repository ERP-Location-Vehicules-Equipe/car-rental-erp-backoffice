import React, { useCallback, useEffect, useMemo, useState } from 'react';
import authService from '../../Services/authService';
import fleetService from '../../Services/fleetService';
import locationService from '../../Services/locationService';
import { getAgencesCachedSafe } from '../../Services/agenceLookupService';
import { getErrorMessage } from '../../utils/errorHandler';

const STATUS_OPTIONS = ['en_cours', 'terminee', 'annulee'];

const emptyForm = {
    client_id: '',
    vehicle_id: '',
    agence_depart_id: '',
    agence_retour_id: '',
    date_debut: '',
    date_fin_prevue: '',
    tarif_jour: '',
};

const toIsoOrNull = (value) => {
    if (!value) {
        return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    return date.toISOString();
};

const toLocalDatetimeInput = (value) => {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

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

const LocationsManagement = () => {
    const currentUser = authService.getCurrentUser();
    const isSuperAdmin = currentUser?.role === authService.ROLE_SUPER_ADMIN;
    const isAdmin = currentUser?.role === authService.ROLE_ADMIN;
    const isEmploye = currentUser?.role === authService.ROLE_EMPLOYE;
    const userAgenceId = currentUser?.agence_id;
    const canCreateLocation = isSuperAdmin || isAdmin || isEmploye;
    const canEditLocation = isSuperAdmin || isAdmin || isEmploye;
    const canChangeStatus = isSuperAdmin || isAdmin || isEmploye;
    const canManageAdvanced = isSuperAdmin || isAdmin;
    const canDeleteLocation = isSuperAdmin || isAdmin;

    const [locations, setLocations] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        en_cours: 0,
        terminees: 0,
        annulees: 0,
        revenue: 0,
    });
    const [vehicles, setVehicles] = useState([]);
    const [agences, setAgences] = useState([]);
    const [agenceWarning, setAgenceWarning] = useState('');

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const [formData, setFormData] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);

    const agenceById = useMemo(() => {
        return agences.reduce((acc, agence) => {
            acc[Number(agence.id)] = agence.nom;
            return acc;
        }, {});
    }, [agences]);

    const vehicleById = useMemo(() => {
        return vehicles.reduce((acc, vehicle) => {
            acc[Number(vehicle.id)] = vehicle;
            return acc;
        }, {});
    }, [vehicles]);

    const scopeAgenceLabel = useMemo(() => {
        if (isSuperAdmin) {
            return 'Globale';
        }
        if (!userAgenceId) {
            return "Pas d'agence";
        }
        return agenceById[Number(userAgenceId)] || "Pas d'agence";
    }, [agenceById, isSuperAdmin, userAgenceId]);

    const resetForm = useCallback(() => {
        setFormData({
            ...emptyForm,
            agence_depart_id: isSuperAdmin ? '' : String(userAgenceId || ''),
            agence_retour_id: '',
        });
        setEditingId(null);
    }, [isSuperAdmin, userAgenceId]);

    const loadData = useCallback(async (silent = false) => {
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            setError('');
            const [
                locationsData,
                statsData,
                vehiclesData,
                agencesResult,
            ] = await Promise.all([
                locationService.getLocations(),
                locationService.getLocationStats(),
                fleetService.getVehicles(),
                getAgencesCachedSafe(),
            ]);

            setLocations(Array.isArray(locationsData) ? locationsData : []);
            setStats({
                total: Number(statsData?.total || 0),
                en_cours: Number(statsData?.en_cours || 0),
                terminees: Number(statsData?.terminees || 0),
                annulees: Number(statsData?.annulees || 0),
                revenue: Number(statsData?.revenue || 0),
            });
            setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
            setAgences(Array.isArray(agencesResult.agences) ? agencesResult.agences : []);
            setAgenceWarning(
                agencesResult.available
                    ? ''
                    : "Service Agence indisponible. Les noms d'agences peuvent etre incomplets."
            );
        } catch (loadError) {
            setError(getErrorMessage(loadError, 'Erreur lors du chargement du service location.'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        resetForm();
    }, [resetForm]);

    const runAction = async (fn, successMessage, fallbackError, onSuccess) => {
        setError('');
        setNotice('');
        try {
            await fn();
            if (successMessage) {
                setNotice(successMessage);
            }
            await loadData(true);
            if (typeof onSuccess === 'function') {
                onSuccess();
            }
        } catch (actionError) {
            setError(getErrorMessage(actionError, fallbackError));
        }
    };

    const handleVehicleChange = (vehicleIdRaw) => {
        const vehicleId = Number(vehicleIdRaw);
        const selectedVehicle = vehicleById[vehicleId];

        setFormData((prev) => {
            const next = { ...prev, vehicle_id: vehicleIdRaw };
            if (selectedVehicle?.prix_location != null) {
                next.tarif_jour = String(selectedVehicle.prix_location);
            }
            if (selectedVehicle?.agence_id && isSuperAdmin) {
                next.agence_depart_id = String(selectedVehicle.agence_id);
            }
            return next;
        });
    };

    const buildPayload = () => {
        const agenceDepart = isSuperAdmin ? Number(formData.agence_depart_id) : Number(userAgenceId);
        const agenceRetour = Number(formData.agence_retour_id);
        return {
            client_id: Number(formData.client_id),
            vehicle_id: Number(formData.vehicle_id),
            agence_depart_id: agenceDepart,
            agence_retour_id: agenceRetour,
            date_debut: toIsoOrNull(formData.date_debut),
            date_fin_prevue: toIsoOrNull(formData.date_fin_prevue),
            tarif_jour: formData.tarif_jour === '' ? null : Number(formData.tarif_jour),
            etat: 'en_cours',
        };
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const payload = buildPayload();
        const numericFields = [
            payload.client_id,
            payload.vehicle_id,
            payload.agence_depart_id,
            payload.agence_retour_id,
        ];
        if (
            numericFields.some((item) => Number.isNaN(item) || item <= 0) ||
            !payload.date_debut ||
            !payload.date_fin_prevue
        ) {
            setError('Veuillez remplir correctement les champs obligatoires de la location.');
            return;
        }

        if (editingId) {
            await runAction(
                () => locationService.updateLocation(editingId, payload),
                'Location mise a jour avec succes.',
                'Impossible de modifier la location.',
                resetForm,
            );
            return;
        }

        await runAction(
            () => locationService.createLocation(payload),
            'Location creee avec succes.',
            'Impossible de creer la location.',
            resetForm,
        );
    };

    const handleEdit = (location) => {
        setEditingId(location.id);
        setFormData({
            client_id: String(location.client_id || ''),
            vehicle_id: String(location.vehicle_id || ''),
            agence_depart_id: String(location.agence_depart_id || ''),
            agence_retour_id: String(location.agence_retour_id || ''),
            date_debut: toLocalDatetimeInput(location.date_debut),
            date_fin_prevue: toLocalDatetimeInput(location.date_fin_prevue),
            tarif_jour: String(location.tarif_jour ?? ''),
        });
    };

    const handleDelete = async (locationId) => {
        if (!window.confirm('Supprimer cette location ?')) {
            return;
        }
        await runAction(
            () => locationService.deleteLocation(locationId),
            'Location supprimee.',
            'Impossible de supprimer la location.',
        );
    };

    const handleStatusUpdate = async (locationId, etat) => {
        await runAction(
            () => locationService.updateLocationStatus(locationId, etat),
            `Statut mis a jour: ${etat}`,
            'Impossible de mettre a jour le statut.',
        );
    };

    const handleReturn = async (locationId) => {
        const value = window.prompt('Date retour reelle (format: YYYY-MM-DDTHH:mm), exemple: 2026-04-10T14:30');
        if (!value) {
            return;
        }
        const parsed = toIsoOrNull(value);
        if (!parsed) {
            setError('Format de date invalide pour le retour.');
            return;
        }
        await runAction(
            () => locationService.processReturn(locationId, parsed),
            'Retour location traite avec succes.',
            'Impossible de traiter le retour.',
        );
    };

    const handleExtend = async (locationId) => {
        const value = window.prompt('Nouvelle date fin prevue (format: YYYY-MM-DDTHH:mm), exemple: 2026-04-12T10:00');
        if (!value) {
            return;
        }
        const parsed = toIsoOrNull(value);
        if (!parsed) {
            setError('Format de date invalide pour la prolongation.');
            return;
        }
        await runAction(
            () => locationService.extendLocation(locationId, parsed),
            'Location prolongee avec succes.',
            'Impossible de prolonger la location.',
        );
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
                        <h2 className="text-2xl font-bold text-slate-900">Gestion des Locations</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Integration du location-service avec selection agence/vehicule et calcul flexible du tarif.
                        </p>
                        <p className="mt-2 text-xs text-slate-500">Portee agence: {scopeAgenceLabel}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => loadData(true)}
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

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Total</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase">En cours</p>
                    <p className="text-2xl font-bold text-blue-700">{stats.en_cours}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Terminees</p>
                    <p className="text-2xl font-bold text-emerald-700">{stats.terminees}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Annulees</p>
                    <p className="text-2xl font-bold text-rose-700">{stats.annulees}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Revenu</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.revenue.toFixed(2)}</p>
                </div>
            </div>

            <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Formulaire Location</h3>
                    {!canCreateLocation && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            Lecture seule
                        </span>
                    )}
                </div>

                {canCreateLocation && (
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <label className="text-xs font-semibold text-slate-600">
                            Client ID
                            <input
                                type="number"
                                min="1"
                                value={formData.client_id}
                                onChange={(event) => setFormData((prev) => ({ ...prev, client_id: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                required
                            />
                        </label>
                        <label className="text-xs font-semibold text-slate-600">
                            Vehicule
                            <select
                                value={formData.vehicle_id}
                                onChange={(event) => handleVehicleChange(event.target.value)}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                required
                            >
                                <option value="">Selectionner</option>
                                {vehicles.map((vehicle) => (
                                    <option key={vehicle.id} value={vehicle.id}>
                                        {vehicle.immatriculation} - {agenceById[Number(vehicle.agence_id)] || "Pas d'agence"}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="text-xs font-semibold text-slate-600">
                            Tarif / jour
                            <input
                                value={formData.tarif_jour}
                                onChange={(event) => setFormData((prev) => ({ ...prev, tarif_jour: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-slate-50"
                                placeholder="Auto via vehicule"
                            />
                        </label>

                        {isSuperAdmin ? (
                            <label className="text-xs font-semibold text-slate-600">
                                Agence depart
                                <select
                                    value={formData.agence_depart_id}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, agence_depart_id: event.target.value }))}
                                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                    required
                                >
                                    <option value="">Selectionner</option>
                                    {agences.map((agence) => (
                                        <option key={agence.id} value={agence.id}>{agence.nom}</option>
                                    ))}
                                </select>
                            </label>
                        ) : (
                            <label className="text-xs font-semibold text-slate-600">
                                Agence depart
                                <input
                                    value={scopeAgenceLabel}
                                    className="mt-1 w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-md text-sm"
                                    disabled
                                />
                            </label>
                        )}

                        <label className="text-xs font-semibold text-slate-600">
                            Agence retour
                            <select
                                value={formData.agence_retour_id}
                                onChange={(event) => setFormData((prev) => ({ ...prev, agence_retour_id: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                required
                            >
                                <option value="">Selectionner</option>
                                {agences.map((agence) => (
                                    <option key={agence.id} value={agence.id}>{agence.nom}</option>
                                ))}
                            </select>
                        </label>

                        <label className="text-xs font-semibold text-slate-600">
                            Date debut
                            <input
                                type="datetime-local"
                                value={formData.date_debut}
                                onChange={(event) => setFormData((prev) => ({ ...prev, date_debut: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                required
                            />
                        </label>
                        <label className="text-xs font-semibold text-slate-600">
                            Date fin prevue
                            <input
                                type="datetime-local"
                                value={formData.date_fin_prevue}
                                onChange={(event) => setFormData((prev) => ({ ...prev, date_fin_prevue: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                required
                            />
                        </label>
                        <div className="flex items-end gap-2">
                            <button type="submit" className="px-3 py-2 text-sm font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700">
                                {editingId ? 'Mettre a jour' : 'Ajouter'}
                            </button>
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-3 py-2 text-sm font-semibold rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                                >
                                    Annuler
                                </button>
                            )}
                        </div>
                    </form>
                )}
            </section>

            <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Liste des Locations</h3>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">ID</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Vehicule</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Agence depart</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Agence retour</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Periode</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Total</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Etat</th>
                                {(canEditLocation || canDeleteLocation) && (
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {locations.map((location) => (
                                <tr key={location.id}>
                                    <td className="px-4 py-2 text-sm text-slate-700">{location.id}</td>
                                    <td className="px-4 py-2 text-sm text-slate-900 font-medium">
                                        {vehicleById[Number(location.vehicle_id)]?.immatriculation || `Vehicule #${location.vehicle_id}`}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-slate-700">
                                        {agenceById[Number(location.agence_depart_id)] || "Pas d'agence"}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-slate-700">
                                        {agenceById[Number(location.agence_retour_id)] || "Pas d'agence"}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-slate-700">
                                        <div>{formatDateTime(location.date_debut)}</div>
                                        <div className="text-xs text-slate-500">fin: {formatDateTime(location.date_fin_prevue)}</div>
                                    </td>
                                    <td className="px-4 py-2 text-sm text-slate-700">{Number(location.montant_total || 0).toFixed(2)}</td>
                                    <td className="px-4 py-2 text-sm text-slate-700">
                                        {canChangeStatus ? (
                                            <select
                                                value={location.etat}
                                                onChange={(event) => handleStatusUpdate(location.id, event.target.value)}
                                                className="px-2 py-1 border border-slate-300 rounded-md text-xs"
                                            >
                                                {STATUS_OPTIONS.map((status) => (
                                                    <option key={status} value={status}>{status}</option>
                                                ))}
                                            </select>
                                        ) : location.etat}
                                    </td>
                                    {(canEditLocation || canDeleteLocation) && (
                                        <td className="px-4 py-2 text-right text-sm space-x-3">
                                            {canEditLocation && (
                                                <button type="button" onClick={() => handleEdit(location)} className="text-blue-600 hover:text-blue-800">
                                                    Modifier
                                                </button>
                                            )}
                                            {canManageAdvanced && (
                                                <>
                                                    <button type="button" onClick={() => handleReturn(location.id)} className="text-emerald-600 hover:text-emerald-800">
                                                        Retour
                                                    </button>
                                                    <button type="button" onClick={() => handleExtend(location.id)} className="text-indigo-600 hover:text-indigo-800">
                                                        Prolonger
                                                    </button>
                                                </>
                                            )}
                                            {canDeleteLocation && (
                                                <button type="button" onClick={() => handleDelete(location.id)} className="text-red-600 hover:text-red-800">
                                                    Supprimer
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {locations.length === 0 && (
                                <tr>
                                    <td colSpan={(canEditLocation || canDeleteLocation) ? 8 : 7} className="px-4 py-6 text-center text-sm text-slate-500">
                                        Aucune location disponible.
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

export default LocationsManagement;
