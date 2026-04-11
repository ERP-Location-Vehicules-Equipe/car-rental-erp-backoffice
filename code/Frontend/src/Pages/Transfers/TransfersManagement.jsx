import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../Services/authService';
import fleetService from '../../Services/fleetService';
import { getAgencesCachedSafe } from '../../Services/agenceLookupService';
import transferService from '../../Services/transferService';
import { getErrorMessage } from '../../utils/errorHandler';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DateTimeInputDialog from '../../components/ui/DateTimeInputDialog';

const STATUS_OPTIONS = ['PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'];
const BADGE_BY_STATUS = {
    PENDING: 'bg-amber-100 text-amber-800 border border-amber-200',
    IN_TRANSIT: 'bg-blue-100 text-blue-800 border border-blue-200',
    COMPLETED: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    CANCELLED: 'bg-rose-100 text-rose-800 border border-rose-200',
};

const initialForm = {
    vehicule_id: '',
    agence_source_id: '',
    agence_destination_id: '',
    date_depart: '',
    date_arrivee_prevue: '',
    reason: '',
    notes: '',
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

const normalizeVehicleStatus = (value) => String(value || '').trim().toLowerCase();

const TransfersManagement = () => {
    const navigate = useNavigate();
    const currentUser = authService.getCurrentUser();
    const isSuperAdmin = currentUser?.role === authService.ROLE_SUPER_ADMIN;
    const isAdmin = currentUser?.role === authService.ROLE_ADMIN;
    const isEmploye = currentUser?.role === authService.ROLE_EMPLOYE;
    const userAgenceId = currentUser?.agence_id;

    const canCreate = isSuperAdmin || isAdmin || isEmploye;
    const canUpdateTransfer = isSuperAdmin || isAdmin;
    const canManageWorkflow = isSuperAdmin || isAdmin || isEmploye;
    const canDeleteTransfer = isSuperAdmin;
    const showActionsColumn = true;

    const [transfers, setTransfers] = useState([]);
    const [agences, setAgences] = useState([]);
    const [modeles, setModeles] = useState([]);
    const [marques, setMarques] = useState([]);
    const [candidateVehicles, setCandidateVehicles] = useState([]);
    const [agenceWarning, setAgenceWarning] = useState('');

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
        from: '',
        to: '',
    });
    const [deleteDialog, setDeleteDialog] = useState({
        open: false,
        transfer: null,
        loading: false,
    });
    const [dateDialog, setDateDialog] = useState({
        open: false,
        transfer: null,
        mode: null,
        value: '',
        loading: false,
    });

    const [formData, setFormData] = useState({
        ...initialForm,
        agence_destination_id: isSuperAdmin ? '' : String(userAgenceId || ''),
    });

    const agenceById = useMemo(() => {
        return agences.reduce((acc, agence) => {
            acc[Number(agence.id)] = agence.nom;
            return acc;
        }, {});
    }, [agences]);

    const sourceAgences = useMemo(() => {
        if (isSuperAdmin) {
            return agences;
        }
        return agences.filter((agence) => Number(agence.id) !== Number(userAgenceId));
    }, [agences, isSuperAdmin, userAgenceId]);

    const candidateVehicleById = useMemo(() => {
        return candidateVehicles.reduce((acc, vehicle) => {
            acc[Number(vehicle.id)] = vehicle;
            return acc;
        }, {});
    }, [candidateVehicles]);

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

    const filteredTransfers = useMemo(() => {
        const query = filters.search.trim().toLowerCase();
        const from = filters.from;
        const to = filters.to;

        return transfers.filter((transfer) => {
            const dateOnly = toDateOnly(transfer.date_depart);
            const matchFrom = !from || (dateOnly && dateOnly >= from);
            const matchTo = !to || (dateOnly && dateOnly <= to);
            if (!matchFrom || !matchTo) {
                return false;
            }
            if (!query) {
                return true;
            }

            const vehicleLabel = getVehicleLabel(
                candidateVehicleById[Number(transfer.vehicule_id)] || {
                    immatriculation: String(transfer.vehicule_id || ''),
                    modele_id: null,
                }
            );
            return [
                transfer.id,
                transfer.etat,
                transfer.reason,
                transfer.notes,
                vehicleLabel,
                agenceById[Number(transfer.agence_source_id)] || '',
                agenceById[Number(transfer.agence_destination_id)] || '',
            ].some((value) => String(value || '').toLowerCase().includes(query));
        });
    }, [agenceById, candidateVehicleById, filters.from, filters.search, filters.to, getVehicleLabel, transfers]);

    const resetForm = useCallback(() => {
        setEditingId(null);
        setFormData({
            ...initialForm,
            agence_destination_id: isSuperAdmin ? '' : String(userAgenceId || ''),
        });
    }, [isSuperAdmin, userAgenceId]);

    const loadCandidates = useCallback(async (sourceAgenceId = null) => {
        const params = {};
        if (sourceAgenceId) {
            params.source_agence_id = Number(sourceAgenceId);
        }
        params.include_my_agence = true;

        const availability = await transferService.getTransferCandidates(params);
        const vehicles = Array.isArray(availability?.vehicles)
            ? availability.vehicles.filter((vehicle) => normalizeVehicleStatus(vehicle?.statut) === 'disponible')
            : [];
        setCandidateVehicles(vehicles);
        return vehicles;
    }, []);

    const ensureTransferVehicleLabels = useCallback(async (transfersData, baseVehicles = []) => {
        const transferVehicleIds = [
            ...new Set(
                (Array.isArray(transfersData) ? transfersData : [])
                    .map((item) => Number(item?.vehicule_id))
                    .filter((id) => Number.isInteger(id) && id > 0)
            ),
        ];
        if (!transferVehicleIds.length) {
            return;
        }

        const knownIds = new Set((Array.isArray(baseVehicles) ? baseVehicles : []).map((item) => Number(item.id)));
        const missingIds = transferVehicleIds.filter((id) => !knownIds.has(id));
        if (!missingIds.length) {
            return;
        }

        const resolvedVehicles = await Promise.all(
            missingIds.map(async (vehicleId) => {
                try {
                    return await fleetService.getVehicleById(vehicleId);
                } catch {
                    return null;
                }
            })
        );

        const extras = resolvedVehicles.filter(Boolean);
        if (!extras.length) {
            return;
        }

        setCandidateVehicles((prev) => {
            const byId = new Map((prev || []).map((item) => [Number(item.id), item]));
            extras.forEach((vehicle) => {
                byId.set(Number(vehicle.id), vehicle);
            });
            return Array.from(byId.values());
        });
    }, []);

    const loadData = useCallback(async (silent = false) => {
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            setError('');
            const [transfersData, agencesResult, modelesData, marquesData] = await Promise.all([
                transferService.getTransfers(),
                getAgencesCachedSafe(),
                fleetService.getModeles(),
                fleetService.getMarques(),
            ]);

            const normalizedTransfers = Array.isArray(transfersData) ? transfersData : [];
            setTransfers(normalizedTransfers);
            setAgences(Array.isArray(agencesResult.agences) ? agencesResult.agences : []);
            setModeles(Array.isArray(modelesData) ? modelesData : []);
            setMarques(Array.isArray(marquesData) ? marquesData : []);
            setAgenceWarning(
                agencesResult.available
                    ? ''
                    : "Service Agence indisponible. Les noms d'agences peuvent etre incomplets."
            );
            const baseVehicles = await loadCandidates(formData.agence_source_id || null);
            await ensureTransferVehicleLabels(normalizedTransfers, baseVehicles);
        } catch (loadError) {
            setError(getErrorMessage(loadError, 'Erreur lors du chargement du service transfer.'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [ensureTransferVehicleLabels, formData.agence_source_id, loadCandidates]);

    useEffect(() => {
        loadData();
    }, [loadData]);

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

    const handleSourceAgenceChange = async (value) => {
        setFormData((prev) => ({
            ...prev,
            agence_source_id: value,
            vehicule_id: '',
        }));
        await loadCandidates(value || null);
    };

    const handleVehicleChange = (value) => {
        const vehicleId = Number(value);
        const selected = candidateVehicles.find((item) => Number(item.id) === vehicleId);
        setFormData((prev) => ({
            ...prev,
            vehicule_id: value,
            agence_source_id: selected?.agence_id ? String(selected.agence_id) : prev.agence_source_id,
        }));
    };

    const buildPayload = () => {
        const selectedVehicle = candidateVehicles.find(
            (vehicle) => Number(vehicle.id) === Number(formData.vehicule_id)
        );
        const fallbackSourceId = selectedVehicle?.agence_id ? Number(selectedVehicle.agence_id) : NaN;
        const requestedSourceId = Number(formData.agence_source_id);
        const sourceId = Number.isInteger(requestedSourceId) && requestedSourceId > 0
            ? requestedSourceId
            : fallbackSourceId;

        const destinationId = isSuperAdmin
            ? Number(formData.agence_destination_id)
            : Number(userAgenceId);

        return {
            vehicule_id: Number(formData.vehicule_id),
            agence_source_id: sourceId,
            agence_destination_id: destinationId,
            date_depart: toIsoOrNull(formData.date_depart),
            date_arrivee_prevue: toIsoOrNull(formData.date_arrivee_prevue),
            reason: formData.reason.trim(),
            notes: formData.notes.trim() || null,
        };
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const payload = buildPayload();
        const requiredNumbers = [
            payload.vehicule_id,
            payload.agence_source_id,
            payload.agence_destination_id,
        ];
        if (requiredNumbers.some((value) => Number.isNaN(value) || value <= 0) || !payload.reason) {
            setError('Veuillez remplir les champs obligatoires du transfert.');
            return;
        }
        if (
            payload.date_depart &&
            payload.date_arrivee_prevue &&
            new Date(payload.date_arrivee_prevue).getTime() <= new Date(payload.date_depart).getTime()
        ) {
            setError('La date arrivee prevue doit etre apres la date depart.');
            return;
        }

        if (editingId) {
            const updatePayload = {
                agence_destination_id: payload.agence_destination_id,
                date_depart: payload.date_depart,
                date_arrivee_prevue: payload.date_arrivee_prevue,
                reason: payload.reason,
                notes: payload.notes,
            };
            if (isSuperAdmin) {
                updatePayload.vehicule_id = payload.vehicule_id;
                updatePayload.agence_source_id = payload.agence_source_id;
            }

            await runAction(
                () => transferService.updateTransfer(editingId, updatePayload),
                'Transfert mis a jour avec succes.',
                'Impossible de modifier ce transfert.',
                resetForm,
            );
            return;
        }

        await runAction(
            () => transferService.createTransfer(payload),
            'Demande de transfert creee avec succes.',
            'Impossible de creer ce transfert.',
            resetForm,
        );
    };

    const handleEdit = async (transfer) => {
        setEditingId(transfer.id);
        setFormData({
            vehicule_id: String(transfer.vehicule_id || ''),
            agence_source_id: String(transfer.agence_source_id || ''),
            agence_destination_id: String(transfer.agence_destination_id || ''),
            date_depart: toLocalDatetimeInput(transfer.date_depart),
            date_arrivee_prevue: toLocalDatetimeInput(transfer.date_arrivee_prevue),
            reason: transfer.reason || '',
            notes: transfer.notes || '',
        });
        const baseVehicles = await loadCandidates(transfer.agence_source_id || null);
        await ensureTransferVehicleLabels([transfer], baseVehicles);
    };

    const openStatusDateDialog = (transfer, mode) => {
        setDateDialog({
            open: true,
            transfer,
            mode,
            value: '',
            loading: false,
        });
    };

    const closeStatusDateDialog = () => {
        if (dateDialog.loading) {
            return;
        }
        setDateDialog((prev) => ({ ...prev, open: false }));
    };

    const handleStatusChange = async (transfer, targetStatus) => {
        if (targetStatus === 'IN_TRANSIT') {
            openStatusDateDialog(transfer, 'IN_TRANSIT');
            return;
        }
        if (targetStatus === 'COMPLETED') {
            openStatusDateDialog(transfer, 'COMPLETED');
            return;
        }

        await runAction(
            () => transferService.updateTransferStatus(transfer.id, { etat: targetStatus }),
            `Etat transfer mis a jour: ${targetStatus}`,
            'Impossible de modifier le statut du transfert.',
        );
    };

    const confirmStatusDateDialog = async () => {
        const parsed = toIsoOrNull(dateDialog.value);
        if (!parsed || !dateDialog.transfer) {
            setError('Format de date invalide.');
            return;
        }

        setDateDialog((prev) => ({ ...prev, loading: true }));
        const payload = { etat: dateDialog.mode };
        if (dateDialog.mode === 'IN_TRANSIT') {
            payload.date_arrivee_prevue = parsed;
        } else if (dateDialog.mode === 'COMPLETED') {
            payload.date_arrivee_reelle = parsed;
        }

        await runAction(
            () => transferService.updateTransferStatus(dateDialog.transfer.id, payload),
            `Etat transfer mis a jour: ${dateDialog.mode}`,
            'Impossible de modifier le statut du transfert.',
        );
        setDateDialog({
            open: false,
            transfer: null,
            mode: null,
            value: '',
            loading: false,
        });
    };

    const handleCancel = async (transferId) => {
        await runAction(
            () => transferService.cancelTransfer(transferId),
            'Transfert annule avec succes.',
            'Impossible d annuler ce transfert.',
        );
    };

    const handleDelete = async (transferId) => {
        await runAction(
            () => transferService.deleteTransfer(transferId),
            'Transfert supprime.',
            'Impossible de supprimer ce transfert.',
        );
    };

    const requestDelete = (transfer) => {
        setDeleteDialog({
            open: true,
            transfer,
            loading: false,
        });
    };

    const closeDeleteDialog = () => {
        if (deleteDialog.loading) {
            return;
        }
        setDeleteDialog((prev) => ({ ...prev, open: false }));
    };

    const confirmDelete = async () => {
        if (!deleteDialog.transfer) {
            return;
        }
        setDeleteDialog((prev) => ({ ...prev, loading: true }));
        await handleDelete(deleteDialog.transfer.id);
        setDeleteDialog({
            open: false,
            transfer: null,
            loading: false,
        });
    };

    const requestCancel = (transfer) => {
        setDeleteDialog({
            open: true,
            transfer: { ...transfer, __cancelOnly: true },
            loading: false,
        });
    };

    const confirmCancel = async () => {
        if (!deleteDialog.transfer) {
            return;
        }
        setDeleteDialog((prev) => ({ ...prev, loading: true }));
        await handleCancel(deleteDialog.transfer.id);
        setDeleteDialog({
            open: false,
            transfer: null,
            loading: false,
        });
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
                        <h2 className="text-2xl font-bold text-slate-900">Gestion des Transfers</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Demandes de transfert inter-agences, validation et suivi de disponibilite.
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

            <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Demande de Transfer</h3>
                    <span className="text-xs text-slate-500">
                        Vehicules disponibles autres agences: {candidateVehicles.length}
                    </span>
                </div>

                {canCreate && (
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <label className="text-xs font-semibold text-slate-600">
                            Agence source
                            <select
                                value={formData.agence_source_id}
                                onChange={(event) => handleSourceAgenceChange(event.target.value)}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                required
                                disabled={editingId !== null && !isSuperAdmin}
                            >
                                <option value="">Selectionner</option>
                                {sourceAgences.map((agence) => (
                                    <option key={agence.id} value={agence.id}>{agence.nom}</option>
                                ))}
                            </select>
                        </label>

                        {isSuperAdmin ? (
                            <label className="text-xs font-semibold text-slate-600">
                                Agence destination
                                <select
                                    value={formData.agence_destination_id}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, agence_destination_id: event.target.value }))}
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
                                Agence destination
                                <input
                                    value={scopeAgenceLabel}
                                    className="mt-1 w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-md text-sm"
                                    disabled
                                />
                            </label>
                        )}

                        <label className="text-xs font-semibold text-slate-600">
                            Vehicule
                            <select
                                value={formData.vehicule_id}
                                onChange={(event) => handleVehicleChange(event.target.value)}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                required
                                disabled={editingId !== null && !isSuperAdmin}
                            >
                                <option value="">Selectionner</option>
                                {candidateVehicles.length === 0 && (
                                    <option value="" disabled>
                                        Aucun vehicule disponible
                                    </option>
                                )}
                                {candidateVehicles.map((vehicle) => (
                                    <option key={vehicle.id} value={vehicle.id}>
                                        {getVehicleLabel(vehicle)} - {agenceById[Number(vehicle.agence_id)] || "Agence inconnue"}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="text-xs font-semibold text-slate-600">
                            Date depart
                            <input
                                type="datetime-local"
                                value={formData.date_depart}
                                onChange={(event) => setFormData((prev) => ({ ...prev, date_depart: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            />
                        </label>

                        <label className="text-xs font-semibold text-slate-600">
                            Date arrivee prevue
                            <input
                                type="datetime-local"
                                value={formData.date_arrivee_prevue}
                                onChange={(event) => setFormData((prev) => ({ ...prev, date_arrivee_prevue: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            />
                        </label>

                        <label className="text-xs font-semibold text-slate-600 md:col-span-3">
                            Motif
                            <input
                                value={formData.reason}
                                onChange={(event) => setFormData((prev) => ({ ...prev, reason: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                required
                                minLength={3}
                                maxLength={255}
                            />
                        </label>

                        <label className="text-xs font-semibold text-slate-600 md:col-span-3">
                            Notes
                            <textarea
                                value={formData.notes}
                                onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                rows={3}
                                maxLength={500}
                            />
                        </label>

                        <div className="flex items-end gap-2">
                            <button type="submit" className="px-3 py-2 text-sm font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700">
                                {editingId ? 'Mettre a jour' : 'Creer transfer'}
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
                <h3 className="text-lg font-bold text-slate-900 mb-4">Liste des Transfers</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <label className="text-xs font-semibold text-slate-600">
                        Recherche
                        <input
                            value={filters.search}
                            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            placeholder="Vehicule, agence, statut, motif..."
                        />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                        Date depart du
                        <input
                            type="date"
                            value={filters.from}
                            onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
                            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                        />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                        Date depart au
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
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Source</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Destination</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Etat</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Depart</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Arrivee prevue</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Arrivee reelle</th>
                                {showActionsColumn && (
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredTransfers.map((transfer) => {
                                const isSourceAgenceUser = Number(transfer.agence_source_id) === Number(userAgenceId);
                                const canManageRowWorkflow = isSuperAdmin || ((isAdmin || isEmploye) && isSourceAgenceUser);
                                const canEditRow = isSuperAdmin || (isAdmin && Number(transfer.agence_source_id) === Number(userAgenceId));
                                const canCancelRow = isSuperAdmin || (isAdmin && isSourceAgenceUser);
                                const statusOptionsForRow = isEmploye
                                    ? STATUS_OPTIONS.filter((statusValue) => statusValue !== 'CANCELLED')
                                    : STATUS_OPTIONS;

                                return (
                                    <tr key={transfer.id}>
                                        <td className="px-4 py-2 text-sm text-slate-700">{transfer.id}</td>
                                        <td className="px-4 py-2 text-sm text-slate-700">
                                            {getVehicleLabel(
                                                candidateVehicleById[Number(transfer.vehicule_id)] || {
                                                    id: transfer.vehicule_id,
                                                    immatriculation: `#${transfer.vehicule_id}`,
                                                }
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-slate-700">
                                            {agenceById[Number(transfer.agence_source_id)] || "Pas d'agence"}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-slate-700">
                                            {agenceById[Number(transfer.agence_destination_id)] || "Pas d'agence"}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-slate-700">
                                            <span className={`px-2 py-1 text-xs rounded-full ${BADGE_BY_STATUS[transfer.etat] || 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                                                {transfer.etat}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-sm text-slate-700">{formatDateTime(transfer.date_depart)}</td>
                                        <td className="px-4 py-2 text-sm text-slate-700">{formatDateTime(transfer.date_arrivee_prevue)}</td>
                                        <td className="px-4 py-2 text-sm text-slate-700">{formatDateTime(transfer.date_arrivee_reelle)}</td>
                                        {showActionsColumn && (
                                            <td className="px-4 py-2 text-right text-sm space-x-3 whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/transferts/${transfer.id}`)}
                                                    className="text-slate-700 hover:text-slate-900"
                                                >
                                                    Details
                                                </button>
                                                {canEditRow && transfer.etat !== 'COMPLETED' && transfer.etat !== 'CANCELLED' && (
                                                    <button type="button" onClick={() => handleEdit(transfer)} className="text-blue-600 hover:text-blue-800">
                                                        Modifier
                                                    </button>
                                                )}
                                                {canManageRowWorkflow && transfer.etat !== 'COMPLETED' && transfer.etat !== 'CANCELLED' && (
                                                    <select
                                                        value={transfer.etat}
                                                        onChange={(event) => handleStatusChange(transfer, event.target.value)}
                                                        className="px-2 py-1 border border-slate-300 rounded-md text-xs"
                                                    >
                                                        {statusOptionsForRow.map((statusValue) => (
                                                            <option key={statusValue} value={statusValue}>{statusValue}</option>
                                                        ))}
                                                    </select>
                                                )}
                                                {canCancelRow && transfer.etat !== 'COMPLETED' && transfer.etat !== 'CANCELLED' && (
                                                    <button type="button" onClick={() => requestCancel(transfer)} className="text-rose-600 hover:text-rose-800">
                                                        Annuler
                                                    </button>
                                                )}
                                                {canDeleteTransfer && (
                                                    <button type="button" onClick={() => requestDelete(transfer)} className="text-slate-700 hover:text-slate-900">
                                                        Supprimer
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                            {filteredTransfers.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-4 py-6 text-center text-sm text-slate-500">
                                        Aucun transfer trouve.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
            <ConfirmDialog
                open={deleteDialog.open}
                title={deleteDialog.transfer?.__cancelOnly ? "Confirmation d'annulation" : 'Confirmation de suppression'}
                message={
                    deleteDialog.transfer
                        ? (
                            deleteDialog.transfer.__cancelOnly
                                ? `Annuler le transfer #${deleteDialog.transfer.id} ?`
                                : `Supprimer definitivement le transfer #${deleteDialog.transfer.id} ?`
                        )
                        : 'Confirmer cette action ?'
                }
                confirmLabel={deleteDialog.transfer?.__cancelOnly ? 'Annuler transfer' : 'Supprimer'}
                confirmClassName={deleteDialog.transfer?.__cancelOnly ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'}
                loading={deleteDialog.loading}
                onCancel={closeDeleteDialog}
                onConfirm={deleteDialog.transfer?.__cancelOnly ? confirmCancel : confirmDelete}
            />
            <DateTimeInputDialog
                open={dateDialog.open}
                title={dateDialog.mode === 'IN_TRANSIT' ? 'Passer en IN_TRANSIT' : 'Passer en COMPLETED'}
                label={dateDialog.mode === 'IN_TRANSIT' ? 'Date arrivee prevue' : 'Date arrivee reelle'}
                value={dateDialog.value}
                loading={dateDialog.loading}
                onChange={(value) => setDateDialog((prev) => ({ ...prev, value }))}
                onCancel={closeStatusDateDialog}
                onSubmit={confirmStatusDateDialog}
            />
        </div>
    );
};

export default TransfersManagement;
