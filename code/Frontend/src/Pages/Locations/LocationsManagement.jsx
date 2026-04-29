import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import authService from '../../Services/authService';
import fleetService from '../../Services/fleetService';
import locationService from '../../Services/locationService';
import { getAgencesCachedSafe } from '../../Services/agenceLookupService';
import { getErrorMessage } from '../../utils/errorHandler';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DateTimeInputDialog from '../../components/ui/DateTimeInputDialog';

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

const toDateOnly = (value) => {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    return date.toISOString().slice(0, 10);
};

const ActionIconButton = ({ title, onClick, className, children }) => (
    <button
        type="button"
        title={title}
        aria-label={title}
        onClick={onClick}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent transition-colors ${className}`}
    >
        {children}
    </button>
);

const IconDetails = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const IconPdf = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 15h8M8 11h8M8 19h5" />
    </svg>
);

const IconEdit = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
);

const IconReturn = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 14l-4-4 4-4" />
        <path d="M5 10h10a4 4 0 010 8h-2" />
    </svg>
);

const IconExtend = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
    </svg>
);

const IconDelete = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v6M14 11v6" />
    </svg>
);

const LocationsManagement = () => {
    const routeLocation = useLocation();
    const navigate = useNavigate();
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
    const showActionsColumn = true;

    const [locations, setLocations] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        en_cours: 0,
        terminees: 0,
        annulees: 0,
        revenue: 0,
    });
    const [vehicles, setVehicles] = useState([]);
    const [modeles, setModeles] = useState([]);
    const [marques, setMarques] = useState([]);
    const [agences, setAgences] = useState([]);
    const [agenceWarning, setAgenceWarning] = useState('');

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const [formData, setFormData] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [prefillApplied, setPrefillApplied] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        from: '',
        to: '',
    });
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [locationToDelete, setLocationToDelete] = useState(null);
    const [dateDialog, setDateDialog] = useState({
        open: false,
        mode: null,
        locationId: null,
        value: '',
        loading: false,
    });

    const preselectedVehicleId = useMemo(() => {
        const params = new URLSearchParams(routeLocation.search || '');
        const rawVehicleId = params.get('vehicle_id');
        if (!rawVehicleId) {
            return null;
        }
        const parsed = Number(rawVehicleId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            return null;
        }
        return parsed;
    }, [routeLocation.search]);

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

    const modeleById = useMemo(() => {
        return modeles.reduce((acc, modele) => {
            acc[Number(modele.id)] = modele;
            return acc;
        }, {});
    }, [modeles]);

    const marqueById = useMemo(() => {
        return marques.reduce((acc, marque) => {
            acc[Number(marque.id)] = marque;
            return acc;
        }, {});
    }, [marques]);

    const getVehicleLabel = useCallback((vehicle) => {
        if (!vehicle) {
            return 'Vehicule inconnu';
        }

        const modele = modeleById[Number(vehicle.modele_id)];
        const marque = modele ? marqueById[Number(modele.marque_id)] : null;

        const marqueNom = marque?.nom || '';
        const modeleNom = modele?.nom || '';
        const immat = vehicle.immatriculation || '';

        const base = `${marqueNom} ${modeleNom}`.trim();
        if (base && immat) {
            return `${base} (${immat})`;
        }
        if (base) {
            return base;
        }
        if (immat) {
            return immat;
        }
        return `Vehicule #${vehicle.id}`;
    }, [marqueById, modeleById]);

    const scopeAgenceLabel = useMemo(() => {
        if (isSuperAdmin) {
            return 'Globale';
        }
        if (!userAgenceId) {
            return "Pas d'agence";
        }
        return agenceById[Number(userAgenceId)] || "Pas d'agence";
    }, [agenceById, isSuperAdmin, userAgenceId]);

    const filteredLocations = useMemo(() => {
        const query = filters.search.trim().toLowerCase();
        const from = filters.from;
        const to = filters.to;

        return locations.filter((location) => {
            const dateOnly = toDateOnly(location.date_debut);
            const matchFrom = !from || (dateOnly && dateOnly >= from);
            const matchTo = !to || (dateOnly && dateOnly <= to);
            if (!matchFrom || !matchTo) {
                return false;
            }
            if (!query) {
                return true;
            }
            const vehicleLabel = getVehicleLabel(vehicleById[Number(location.vehicle_id)]);
            return [
                location.id,
                location.client_id,
                location.etat,
                vehicleLabel,
                agenceById[Number(location.agence_depart_id)] || '',
                agenceById[Number(location.agence_retour_id)] || '',
                location.montant_total,
            ].some((value) => String(value || '').toLowerCase().includes(query));
        });
    }, [agenceById, filters.from, filters.search, filters.to, getVehicleLabel, locations, vehicleById]);

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
                modelesData,
                marquesData,
                agencesResult,
            ] = await Promise.all([
                locationService.getLocations(),
                locationService.getLocationStats(),
                fleetService.getVehicles(),
                fleetService.getModeles(),
                fleetService.getMarques(),
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
            setModeles(Array.isArray(modelesData) ? modelesData : []);
            setMarques(Array.isArray(marquesData) ? marquesData : []);
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

    useEffect(() => {
        setPrefillApplied(false);
    }, [routeLocation.search]);

    useEffect(() => {
        if (prefillApplied || editingId || !preselectedVehicleId) {
            return;
        }

        const selectedVehicle = vehicleById[Number(preselectedVehicleId)];
        if (!selectedVehicle) {
            return;
        }

        setFormData((prev) => {
            const next = {
                ...prev,
                vehicle_id: String(preselectedVehicleId),
            };
            if (selectedVehicle?.prix_location != null) {
                next.tarif_jour = String(selectedVehicle.prix_location);
            }
            if (isSuperAdmin && selectedVehicle?.agence_id) {
                next.agence_depart_id = String(selectedVehicle.agence_id);
            }
            return next;
        });
        setNotice('Vehicule preselectionne depuis Gestion Parc.');
        setPrefillApplied(true);
    }, [editingId, isSuperAdmin, prefillApplied, preselectedVehicleId, vehicleById]);

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

    const handleDownloadContract = async (locationItem) => {
        setError('');
        try {
            const blob = await locationService.downloadContractPdf(locationItem.id);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `contrat-location-${locationItem.id}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            setNotice(`Contrat PDF telecharge pour la location #${locationItem.id}.`);
        } catch (downloadError) {
            setError(getErrorMessage(downloadError, 'Impossible de telecharger le contrat PDF.'));
        }
    };

    const openReturnDialog = (locationId) => {
        setDateDialog({
            open: true,
            mode: 'return',
            locationId,
            value: '',
            loading: false,
        });
    };

    const openExtendDialog = (locationId) => {
        setDateDialog({
            open: true,
            mode: 'extend',
            locationId,
            value: '',
            loading: false,
        });
    };

    const closeDateDialog = () => {
        if (dateDialog.loading) {
            return;
        }
        setDateDialog((prev) => ({ ...prev, open: false }));
    };

    const confirmDateDialog = async () => {
        const parsed = toIsoOrNull(dateDialog.value);
        if (!parsed || !dateDialog.locationId) {
            setError('Format de date invalide.');
            return;
        }
        setDateDialog((prev) => ({ ...prev, loading: true }));
        if (dateDialog.mode === 'return') {
            await runAction(
                () => locationService.processReturn(dateDialog.locationId, parsed),
                'Retour location traite avec succes.',
                'Impossible de traiter le retour.',
            );
        } else if (dateDialog.mode === 'extend') {
            await runAction(
                () => locationService.extendLocation(dateDialog.locationId, parsed),
                'Location prolongee avec succes.',
                'Impossible de prolonger la location.',
            );
        }
        setDateDialog({
            open: false,
            mode: null,
            locationId: null,
            value: '',
            loading: false,
        });
    };

    const requestDelete = (location) => {
        setLocationToDelete(location);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!locationToDelete) {
            return;
        }
        await handleDelete(locationToDelete.id);
        setDeleteDialogOpen(false);
        setLocationToDelete(null);
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
                                        {getVehicleLabel(vehicle)} - {agenceById[Number(vehicle.agence_id)] || "Pas d'agence"}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <label className="text-xs font-semibold text-slate-600">
                        Recherche
                        <input
                            value={filters.search}
                            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            placeholder="Vehicule, agence, statut, client..."
                        />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                        Date debut du
                        <input
                            type="date"
                            value={filters.from}
                            onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
                            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                        />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                        Date debut au
                        <input
                            type="date"
                            value={filters.to}
                            onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
                            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                        />
                    </label>
                </div>
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
                                {showActionsColumn && (
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredLocations.map((location) => (
                                <tr key={location.id}>
                                    <td className="px-4 py-2 text-sm text-slate-700">{location.id}</td>
                                    <td className="px-4 py-2 text-sm text-slate-900 font-medium">
                                        {getVehicleLabel(vehicleById[Number(location.vehicle_id)])}
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
                                    {showActionsColumn && (
                                        <td className="px-4 py-2 text-right">
                                            <div className="inline-flex items-center gap-1">
                                                <ActionIconButton
                                                    title="Details"
                                                    onClick={() => navigate(`/locations/${location.id}`)}
                                                    className="text-slate-700 hover:bg-slate-100"
                                                >
                                                    <IconDetails />
                                                </ActionIconButton>
                                                <ActionIconButton
                                                    title="Contrat PDF"
                                                    onClick={() => handleDownloadContract(location)}
                                                    className="text-indigo-700 hover:bg-indigo-50"
                                                >
                                                    <IconPdf />
                                                </ActionIconButton>
                                            {canEditLocation && (
                                                    <ActionIconButton
                                                        title="Modifier"
                                                        onClick={() => handleEdit(location)}
                                                        className="text-blue-700 hover:bg-blue-50"
                                                    >
                                                        <IconEdit />
                                                    </ActionIconButton>
                                            )}
                                            {canManageAdvanced && (
                                                    <>
                                                        <ActionIconButton
                                                            title="Retour"
                                                            onClick={() => openReturnDialog(location.id)}
                                                            className="text-emerald-700 hover:bg-emerald-50"
                                                        >
                                                            <IconReturn />
                                                        </ActionIconButton>
                                                        <ActionIconButton
                                                            title="Prolonger"
                                                            onClick={() => openExtendDialog(location.id)}
                                                            className="text-cyan-700 hover:bg-cyan-50"
                                                        >
                                                            <IconExtend />
                                                        </ActionIconButton>
                                                </>
                                            )}
                                            {canDeleteLocation && (
                                                    <ActionIconButton
                                                        title="Supprimer"
                                                        onClick={() => requestDelete(location)}
                                                        className="text-red-700 hover:bg-red-50"
                                                    >
                                                        <IconDelete />
                                                    </ActionIconButton>
                                            )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {filteredLocations.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">
                                        Aucune location trouvee.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
            <ConfirmDialog
                open={deleteDialogOpen}
                title="Confirmation de suppression"
                message={locationToDelete ? `Supprimer la location #${locationToDelete.id} ?` : 'Supprimer cette location ?'}
                confirmLabel="Supprimer"
                onCancel={() => {
                    setDeleteDialogOpen(false);
                    setLocationToDelete(null);
                }}
                onConfirm={confirmDelete}
            />
            <DateTimeInputDialog
                open={dateDialog.open}
                title={dateDialog.mode === 'return' ? 'Retour de location' : 'Prolonger location'}
                label={dateDialog.mode === 'return' ? 'Date retour reelle' : 'Nouvelle date fin prevue'}
                value={dateDialog.value}
                loading={dateDialog.loading}
                onChange={(value) => setDateDialog((prev) => ({ ...prev, value }))}
                onCancel={closeDateDialog}
                onSubmit={confirmDateDialog}
            />
        </div>
    );
};

export default LocationsManagement;
