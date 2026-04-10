import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import authService from '../../Services/authService';
import fleetService from '../../Services/fleetService';
import { getAgencesCachedSafe } from '../../Services/agenceLookupService';
import transferService from '../../Services/transferService';
import { getErrorMessage } from '../../utils/errorHandler';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DateTimeInputDialog from '../../components/ui/DateTimeInputDialog';

const STATUS_OPTIONS = ['PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'];

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

const TransferDetailPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const currentUser = authService.getCurrentUser();
    const isSuperAdmin = currentUser?.role === authService.ROLE_SUPER_ADMIN;
    const isAdmin = currentUser?.role === authService.ROLE_ADMIN;
    const isEmploye = currentUser?.role === authService.ROLE_EMPLOYE;
    const userAgenceId = currentUser?.agence_id;

    const canManageWorkflow = isSuperAdmin || isAdmin || isEmploye;
    const canDeleteTransfer = isSuperAdmin;

    const [transfer, setTransfer] = useState(null);
    const [agences, setAgences] = useState([]);
    const [modeles, setModeles] = useState([]);
    const [marques, setMarques] = useState([]);
    const [candidateVehicles, setCandidateVehicles] = useState([]);
    const [formData, setFormData] = useState({ ...initialForm });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        mode: null,
        loading: false,
    });
    const [dateDialog, setDateDialog] = useState({
        open: false,
        mode: null,
        value: '',
        loading: false,
    });

    const agenceById = useMemo(() => {
        return agences.reduce((acc, agence) => {
            acc[Number(agence.id)] = agence.nom;
            return acc;
        }, {});
    }, [agences]);

    const modeleById = useMemo(() => {
        return modeles.reduce((acc, modele) => {
            acc[Number(modele.id)] = modele;
            return acc;
        }, {});
    }, [modeles]);

    const marqueById = useMemo(() => {
        return marques.reduce((acc, marque) => {
            acc[Number(marque.id)] = marque.nom;
            return acc;
        }, {});
    }, [marques]);

    const candidateVehicleById = useMemo(() => {
        return candidateVehicles.reduce((acc, vehicle) => {
            acc[Number(vehicle.id)] = vehicle;
            return acc;
        }, {});
    }, [candidateVehicles]);

    const getVehicleLabel = useCallback((vehicleLike) => {
        if (!vehicleLike) {
            return 'Vehicule inconnu';
        }

        const modele = modeleById[Number(vehicleLike.modele_id)];
        const marque = modele ? marqueById[Number(modele.marque_id)] : null;
        const marqueNom = marque || '';
        const modeleNom = modele?.nom || '';
        const immat = vehicleLike.immatriculation || '';

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
        return 'Vehicule inconnu';
    }, [marqueById, modeleById]);

    const isSourceAgenceUser = useMemo(() => {
        if (!transfer) {
            return false;
        }
        return Number(transfer.agence_source_id) === Number(userAgenceId);
    }, [transfer, userAgenceId]);

    const canEditTransfer = isSuperAdmin || (isAdmin && isSourceAgenceUser);
    const canManageTransferWorkflow = canManageWorkflow && (isSuperAdmin || isSourceAgenceUser);
    const canCancelTransfer = isSuperAdmin || (isAdmin && isSourceAgenceUser);

    const statusOptionsForUser = useMemo(() => {
        if (isEmploye) {
            return STATUS_OPTIONS.filter((value) => value !== 'CANCELLED');
        }
        return STATUS_OPTIONS;
    }, [isEmploye]);

    const loadCandidates = useCallback(async (sourceAgenceId, currentVehicleId = null) => {
        const params = {};
        if (sourceAgenceId) {
            params.source_agence_id = Number(sourceAgenceId);
        }
        if (isSuperAdmin) {
            params.include_my_agence = true;
        }

        const availability = await transferService.getTransferCandidates(params);
        const vehicles = Array.isArray(availability?.vehicles) ? [...availability.vehicles] : [];

        if (currentVehicleId && !vehicles.some((item) => Number(item.id) === Number(currentVehicleId))) {
            try {
                const currentVehicle = await fleetService.getVehicleById(currentVehicleId);
                vehicles.push(currentVehicle);
            } catch {
                // keep current list if vehicle cannot be resolved
            }
        }

        setCandidateVehicles(vehicles);
    }, [isSuperAdmin]);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [transferData, agencesResult, modelesData, marquesData] = await Promise.all([
                transferService.getTransferById(id),
                getAgencesCachedSafe(),
                fleetService.getModeles(),
                fleetService.getMarques(),
            ]);

            setTransfer(transferData);
            setAgences(Array.isArray(agencesResult.agences) ? agencesResult.agences : []);
            setModeles(Array.isArray(modelesData) ? modelesData : []);
            setMarques(Array.isArray(marquesData) ? marquesData : []);

            setFormData({
                vehicule_id: String(transferData.vehicule_id || ''),
                agence_source_id: String(transferData.agence_source_id || ''),
                agence_destination_id: String(transferData.agence_destination_id || ''),
                date_depart: toLocalDatetimeInput(transferData.date_depart),
                date_arrivee_prevue: toLocalDatetimeInput(transferData.date_arrivee_prevue),
                reason: transferData.reason || '',
                notes: transferData.notes || '',
            });

            await loadCandidates(transferData.agence_source_id, transferData.vehicule_id);
        } catch (loadError) {
            setError(getErrorMessage(loadError, 'Impossible de charger les details de ce transfer.'));
        } finally {
            setLoading(false);
        }
    }, [id, loadCandidates]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSourceAgenceChange = async (value) => {
        setFormData((prev) => ({
            ...prev,
            agence_source_id: value,
            vehicule_id: '',
        }));
        await loadCandidates(value || null, null);
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
        const destinationId = isSuperAdmin
            ? Number(formData.agence_destination_id)
            : Number(userAgenceId);

        return {
            vehicule_id: Number(formData.vehicule_id),
            agence_source_id: Number(formData.agence_source_id),
            agence_destination_id: destinationId,
            date_depart: toIsoOrNull(formData.date_depart),
            date_arrivee_prevue: toIsoOrNull(formData.date_arrivee_prevue),
            reason: formData.reason.trim(),
            notes: formData.notes.trim() || null,
        };
    };

    const handleUpdate = async (event) => {
        event.preventDefault();
        if (!transfer) {
            return;
        }

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

        setSaving(true);
        setError('');
        setNotice('');
        try {
            const updated = await transferService.updateTransfer(transfer.id, updatePayload);
            setTransfer(updated);
            setNotice('Transfer mis a jour avec succes.');
            await loadCandidates(updated.agence_source_id, updated.vehicule_id);
        } catch (updateError) {
            setError(getErrorMessage(updateError, 'Impossible de modifier ce transfert.'));
        } finally {
            setSaving(false);
        }
    };

    const handleStatusChange = async (targetStatus) => {
        if (!transfer) {
            return;
        }

        if (targetStatus === 'IN_TRANSIT') {
            setDateDialog({
                open: true,
                mode: 'IN_TRANSIT',
                value: '',
                loading: false,
            });
            return;
        }

        if (targetStatus === 'COMPLETED') {
            setDateDialog({
                open: true,
                mode: 'COMPLETED',
                value: '',
                loading: false,
            });
            return;
        }

        setError('');
        setNotice('');
        try {
            const updated = await transferService.updateTransferStatus(transfer.id, { etat: targetStatus });
            setTransfer(updated);
            setNotice(`Etat transfer mis a jour: ${targetStatus}`);
        } catch (statusError) {
            setError(getErrorMessage(statusError, 'Impossible de modifier le statut du transfert.'));
        }
    };

    const handleCancel = async () => {
        if (!transfer) {
            return;
        }

        setError('');
        setNotice('');
        try {
            const updated = await transferService.cancelTransfer(transfer.id);
            setTransfer(updated);
            setNotice('Transfert annule avec succes.');
        } catch (cancelError) {
            setError(getErrorMessage(cancelError, 'Impossible d annuler ce transfert.'));
        }
    };

    const handleDelete = async () => {
        if (!transfer) {
            return;
        }

        setError('');
        setNotice('');
        try {
            await transferService.deleteTransfer(transfer.id);
            navigate('/transferts');
        } catch (deleteError) {
            setError(getErrorMessage(deleteError, 'Impossible de supprimer ce transfert.'));
        }
    };

    const closeDateDialog = () => {
        if (dateDialog.loading) {
            return;
        }
        setDateDialog((prev) => ({ ...prev, open: false }));
    };

    const confirmDateDialog = async () => {
        if (!transfer) {
            return;
        }
        const parsed = toIsoOrNull(dateDialog.value);
        if (!parsed) {
            setError('Format de date invalide.');
            return;
        }

        setDateDialog((prev) => ({ ...prev, loading: true }));
        const payload = { etat: dateDialog.mode };
        if (dateDialog.mode === 'IN_TRANSIT') {
            payload.date_arrivee_prevue = parsed;
        } else {
            payload.date_arrivee_reelle = parsed;
        }

        setError('');
        setNotice('');
        try {
            const updated = await transferService.updateTransferStatus(transfer.id, payload);
            setTransfer(updated);
            setNotice(`Etat transfer mis a jour: ${dateDialog.mode}`);
            setDateDialog({
                open: false,
                mode: null,
                value: '',
                loading: false,
            });
        } catch (statusError) {
            setDateDialog((prev) => ({ ...prev, loading: false }));
            setError(getErrorMessage(statusError, 'Impossible de modifier le statut du transfert.'));
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
            </div>
        );
    }

    if (!transfer) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
                <p className="text-sm text-red-700">{error || 'Transfer introuvable.'}</p>
                <button
                    type="button"
                    onClick={() => navigate('/transferts')}
                    className="px-3 py-2 text-sm font-semibold rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                    Retour transfers
                </button>
            </div>
        );
    }

    const currentVehicle = candidateVehicleById[Number(transfer.vehicule_id)] || {
        id: transfer.vehicule_id,
        immatriculation: '',
        modele_id: null,
    };

    return (
        <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Details du transfer</h2>
                    <p className="mt-1 text-sm text-slate-500">{getVehicleLabel(currentVehicle)}</p>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/transferts')}
                    className="px-3 py-2 text-sm font-semibold rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                    Retour
                </button>
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

            <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Details complets</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div><span className="font-semibold text-slate-700">Vehicule:</span> {getVehicleLabel(currentVehicle)}</div>
                    <div><span className="font-semibold text-slate-700">Agence source:</span> {agenceById[Number(transfer.agence_source_id)] || "Pas d'agence"}</div>
                    <div><span className="font-semibold text-slate-700">Agence destination:</span> {agenceById[Number(transfer.agence_destination_id)] || "Pas d'agence"}</div>
                    <div><span className="font-semibold text-slate-700">Etat:</span> {transfer.etat}</div>
                    <div><span className="font-semibold text-slate-700">Date depart:</span> {formatDateTime(transfer.date_depart)}</div>
                    <div><span className="font-semibold text-slate-700">Arrivee prevue:</span> {formatDateTime(transfer.date_arrivee_prevue)}</div>
                    <div><span className="font-semibold text-slate-700">Arrivee reelle:</span> {formatDateTime(transfer.date_arrivee_reelle)}</div>
                    <div><span className="font-semibold text-slate-700">Motif:</span> {transfer.reason || '-'}</div>
                    <div><span className="font-semibold text-slate-700">Notes:</span> {transfer.notes || '-'}</div>
                    <div><span className="font-semibold text-slate-700">Demandeur:</span> {transfer.created_by || '-'}</div>
                </div>
            </section>

            {(canManageTransferWorkflow || canCancelTransfer || canDeleteTransfer) && (
                <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
                    <h3 className="text-lg font-bold text-slate-900">Actions workflow</h3>
                    <div className="flex flex-wrap items-center gap-3">
                        {canManageTransferWorkflow && transfer.etat !== 'COMPLETED' && transfer.etat !== 'CANCELLED' && (
                            <label className="text-xs font-semibold text-slate-600">
                                Changer statut
                                <select
                                    value={transfer.etat}
                                    onChange={(event) => handleStatusChange(event.target.value)}
                                    className="mt-1 ml-2 px-2 py-1 border border-slate-300 rounded-md text-xs"
                                >
                                    {statusOptionsForUser.map((statusValue) => (
                                        <option key={statusValue} value={statusValue}>{statusValue}</option>
                                    ))}
                                </select>
                            </label>
                        )}

                        {canCancelTransfer && transfer.etat !== 'COMPLETED' && transfer.etat !== 'CANCELLED' && (
                            <button
                                type="button"
                                onClick={() => setConfirmDialog({ open: true, mode: 'cancel', loading: false })}
                                className="px-3 py-2 text-sm font-semibold rounded-md text-white bg-rose-600 hover:bg-rose-700"
                            >
                                Annuler
                            </button>
                        )}

                        {canDeleteTransfer && (
                            <button
                                type="button"
                                onClick={() => setConfirmDialog({ open: true, mode: 'delete', loading: false })}
                                className="px-3 py-2 text-sm font-semibold rounded-md text-white bg-slate-800 hover:bg-slate-700"
                            >
                                Supprimer
                            </button>
                        )}
                    </div>
                </section>
            )}

            {canEditTransfer && (
                <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
                    <h3 className="text-lg font-bold text-slate-900">Modifier le transfer</h3>
                    <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <label className="text-xs font-semibold text-slate-600">
                            Agence source
                            <select
                                value={formData.agence_source_id}
                                onChange={(event) => handleSourceAgenceChange(event.target.value)}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                required
                                disabled={!isSuperAdmin}
                            >
                                <option value="">Selectionner</option>
                                {agences.map((agence) => (
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
                                    value={agenceById[Number(userAgenceId)] || "Pas d'agence"}
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
                                disabled={!isSuperAdmin}
                            >
                                <option value="">Selectionner</option>
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
                            <button
                                type="submit"
                                className="px-3 py-2 text-sm font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                                disabled={saving}
                            >
                                {saving ? 'Mise a jour...' : 'Mettre a jour'}
                            </button>
                        </div>
                    </form>
                </section>
            )}
            <ConfirmDialog
                open={confirmDialog.open}
                title={confirmDialog.mode === 'cancel' ? "Confirmation d'annulation" : 'Confirmation de suppression'}
                message={
                    confirmDialog.mode === 'cancel'
                        ? `Annuler le transfer #${transfer.id} ?`
                        : `Supprimer definitivement le transfer #${transfer.id} ?`
                }
                confirmLabel={confirmDialog.mode === 'cancel' ? 'Annuler transfer' : 'Supprimer'}
                confirmClassName={confirmDialog.mode === 'cancel' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'}
                loading={confirmDialog.loading}
                onCancel={() => setConfirmDialog({ open: false, mode: null, loading: false })}
                onConfirm={async () => {
                    if (confirmDialog.mode === 'cancel') {
                        await handleCancel();
                    } else if (confirmDialog.mode === 'delete') {
                        await handleDelete();
                    }
                    setConfirmDialog({ open: false, mode: null, loading: false });
                }}
            />
            <DateTimeInputDialog
                open={dateDialog.open}
                title={dateDialog.mode === 'IN_TRANSIT' ? 'Passer en IN_TRANSIT' : 'Passer en COMPLETED'}
                label={dateDialog.mode === 'IN_TRANSIT' ? 'Date arrivee prevue' : 'Date arrivee reelle'}
                value={dateDialog.value}
                loading={dateDialog.loading}
                onChange={(value) => setDateDialog((prev) => ({ ...prev, value }))}
                onCancel={closeDateDialog}
                onSubmit={confirmDateDialog}
            />
        </div>
    );
};

export default TransferDetailPage;
