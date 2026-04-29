import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

const LocationDetailPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const currentUser = authService.getCurrentUser();
    const isSuperAdmin = currentUser?.role === authService.ROLE_SUPER_ADMIN;
    const isAdmin = currentUser?.role === authService.ROLE_ADMIN;
    const isEmploye = currentUser?.role === authService.ROLE_EMPLOYE;
    const userAgenceId = currentUser?.agence_id;

    const canEditLocation = isSuperAdmin || isAdmin || isEmploye;
    const canChangeStatus = isSuperAdmin || isAdmin || isEmploye;
    const canManageAdvanced = isSuperAdmin || isAdmin;
    const canDeleteLocation = isSuperAdmin || isAdmin;

    const [location, setLocation] = useState(null);
    const [vehicles, setVehicles] = useState([]);
    const [modeles, setModeles] = useState([]);
    const [marques, setMarques] = useState([]);
    const [agences, setAgences] = useState([]);

    const [formData, setFormData] = useState(emptyForm);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [dateDialog, setDateDialog] = useState({
        open: false,
        mode: null,
        value: '',
    });

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
            acc[Number(marque.id)] = marque.nom;
            return acc;
        }, {});
    }, [marques]);

    const getVehicleLabel = useCallback((vehicleId) => {
        const vehicle = vehicleById[Number(vehicleId)];
        if (!vehicle) {
            return 'Vehicule inconnu';
        }

        const modele = modeleById[Number(vehicle.modele_id)];
        const marque = modele ? marqueById[Number(modele.marque_id)] : null;
        const base = `${marque || ''} ${modele?.nom || ''}`.trim();

        if (base) {
            return `${base} (${vehicle.immatriculation})`;
        }

        return vehicle.immatriculation || 'Vehicule inconnu';
    }, [marqueById, modeleById, vehicleById]);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [locationData, vehiclesData, modelesData, marquesData, agencesResult] = await Promise.all([
                locationService.getLocationById(id),
                fleetService.getVehicles(),
                fleetService.getModeles(),
                fleetService.getMarques(),
                getAgencesCachedSafe(),
            ]);

            setLocation(locationData);
            setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
            setModeles(Array.isArray(modelesData) ? modelesData : []);
            setMarques(Array.isArray(marquesData) ? marquesData : []);
            setAgences(Array.isArray(agencesResult.agences) ? agencesResult.agences : []);
        } catch (loadError) {
            setError(getErrorMessage(loadError, 'Impossible de charger les details de cette location.'));
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (!location) {
            return;
        }

        setFormData({
            client_id: String(location.client_id || ''),
            vehicle_id: String(location.vehicle_id || ''),
            agence_depart_id: String(location.agence_depart_id || ''),
            agence_retour_id: String(location.agence_retour_id || ''),
            date_debut: toLocalDatetimeInput(location.date_debut),
            date_fin_prevue: toLocalDatetimeInput(location.date_fin_prevue),
            tarif_jour: String(location.tarif_jour ?? ''),
        });
    }, [location]);

    const handleVehicleChange = (value) => {
        const vehicle = vehicleById[Number(value)];
        setFormData((prev) => {
            const next = { ...prev, vehicle_id: value };
            if (vehicle?.prix_location != null) {
                next.tarif_jour = String(vehicle.prix_location);
            }
            if (isSuperAdmin && vehicle?.agence_id) {
                next.agence_depart_id = String(vehicle.agence_id);
            }
            return next;
        });
    };

    const buildPayload = () => {
        const agenceDepart = isSuperAdmin ? Number(formData.agence_depart_id) : Number(userAgenceId);
        return {
            client_id: Number(formData.client_id),
            vehicle_id: Number(formData.vehicle_id),
            agence_depart_id: agenceDepart,
            agence_retour_id: Number(formData.agence_retour_id),
            date_debut: toIsoOrNull(formData.date_debut),
            date_fin_prevue: toIsoOrNull(formData.date_fin_prevue),
            tarif_jour: formData.tarif_jour === '' ? null : Number(formData.tarif_jour),
        };
    };

    const handleUpdate = async (event) => {
        event.preventDefault();
        if (!location) {
            return;
        }

        const payload = buildPayload();
        const numericFields = [
            payload.client_id,
            payload.vehicle_id,
            payload.agence_depart_id,
            payload.agence_retour_id,
        ];

        if (
            numericFields.some((value) => Number.isNaN(value) || value <= 0) ||
            !payload.date_debut ||
            !payload.date_fin_prevue
        ) {
            setError('Veuillez renseigner des valeurs valides pour mettre a jour cette location.');
            return;
        }

        setSaving(true);
        setError('');
        setNotice('');
        try {
            const updated = await locationService.updateLocation(location.id, payload);
            setLocation(updated);
            setNotice('Location mise a jour avec succes.');
        } catch (updateError) {
            setError(getErrorMessage(updateError, 'Impossible de mettre a jour cette location.'));
        } finally {
            setSaving(false);
        }
    };

    const handleStatusUpdate = async (nextStatus) => {
        if (!location) {
            return;
        }

        setError('');
        setNotice('');
        try {
            await locationService.updateLocationStatus(location.id, nextStatus);
            const refreshed = await locationService.getLocationById(location.id);
            setLocation(refreshed);
            setNotice(`Statut mis a jour: ${nextStatus}`);
        } catch (statusError) {
            setError(getErrorMessage(statusError, 'Impossible de mettre a jour le statut.'));
        }
    };

    const handleReturn = async () => {
        if (!location) {
            return;
        }
        const parsed = toIsoOrNull(dateDialog.value);
        if (!parsed) {
            setError('Format de date invalide pour le retour.');
            return;
        }

        setError('');
        setNotice('');
        try {
            await locationService.processReturn(location.id, parsed);
            const refreshed = await locationService.getLocationById(location.id);
            setLocation(refreshed);
            setNotice('Retour location traite avec succes.');
        } catch (returnError) {
            setError(getErrorMessage(returnError, 'Impossible de traiter le retour.'));
        }
    };

    const handleExtend = async () => {
        if (!location) {
            return;
        }
        const parsed = toIsoOrNull(dateDialog.value);
        if (!parsed) {
            setError('Format de date invalide pour la prolongation.');
            return;
        }

        setError('');
        setNotice('');
        try {
            await locationService.extendLocation(location.id, parsed);
            const refreshed = await locationService.getLocationById(location.id);
            setLocation(refreshed);
            setNotice('Location prolongee avec succes.');
        } catch (extendError) {
            setError(getErrorMessage(extendError, 'Impossible de prolonger la location.'));
        }
    };

    const handleDelete = async () => {
        if (!location) {
            return;
        }

        setDeleting(true);
        setError('');
        setNotice('');
        try {
            await locationService.deleteLocation(location.id);
            navigate('/locations');
        } catch (deleteError) {
            setError(getErrorMessage(deleteError, 'Impossible de supprimer cette location.'));
        } finally {
            setDeleting(false);
        }
    };

    const openReturnDialog = () => {
        setDateDialog({
            open: true,
            mode: 'return',
            value: '',
        });
    };

    const openExtendDialog = () => {
        setDateDialog({
            open: true,
            mode: 'extend',
            value: '',
        });
    };

    const closeDateDialog = () => {
        if (saving) {
            return;
        }
        setDateDialog((prev) => ({ ...prev, open: false }));
    };

    const confirmDateDialog = async () => {
        if (dateDialog.mode === 'return') {
            await handleReturn();
        } else if (dateDialog.mode === 'extend') {
            await handleExtend();
        }
        setDateDialog({
            open: false,
            mode: null,
            value: '',
        });
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
            </div>
        );
    }

    if (!location) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
                <p className="text-sm text-red-700">{error || 'Location introuvable.'}</p>
                <button
                    type="button"
                    onClick={() => navigate('/locations')}
                    className="px-3 py-2 text-sm font-semibold rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                    Retour locations
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Details de la location</h2>
                    <p className="mt-1 text-sm text-slate-500">{getVehicleLabel(location.vehicle_id)}</p>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/locations')}
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
                    <div><span className="font-semibold text-slate-700">Client:</span> {location.client_id}</div>
                    <div><span className="font-semibold text-slate-700">Vehicule:</span> {getVehicleLabel(location.vehicle_id)}</div>
                    <div><span className="font-semibold text-slate-700">Agence depart:</span> {agenceById[Number(location.agence_depart_id)] || "Pas d'agence"}</div>
                    <div><span className="font-semibold text-slate-700">Agence retour:</span> {agenceById[Number(location.agence_retour_id)] || "Pas d'agence"}</div>
                    <div><span className="font-semibold text-slate-700">Date debut:</span> {formatDateTime(location.date_debut)}</div>
                    <div><span className="font-semibold text-slate-700">Date fin prevue:</span> {formatDateTime(location.date_fin_prevue)}</div>
                    <div><span className="font-semibold text-slate-700">Date retour reelle:</span> {formatDateTime(location.date_retour_reelle)}</div>
                    <div><span className="font-semibold text-slate-700">Tarif / jour:</span> {location.tarif_jour}</div>
                    <div><span className="font-semibold text-slate-700">Montant total:</span> {location.montant_total}</div>
                    <div><span className="font-semibold text-slate-700">Statut:</span> {location.etat}</div>
                </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    {canChangeStatus && (
                        <label className="text-xs font-semibold text-slate-600">
                            Changer statut
                            <select
                                value={location.etat}
                                onChange={(event) => handleStatusUpdate(event.target.value)}
                                className="mt-1 ml-2 px-2 py-1 border border-slate-300 rounded-md text-xs"
                            >
                                {STATUS_OPTIONS.map((statusValue) => (
                                    <option key={statusValue} value={statusValue}>{statusValue}</option>
                                ))}
                            </select>
                        </label>
                    )}

                    {canManageAdvanced && (
                        <button
                            type="button"
                            onClick={openReturnDialog}
                            className="px-3 py-2 text-sm font-semibold rounded-md text-white bg-emerald-600 hover:bg-emerald-700"
                        >
                            Retour
                        </button>
                    )}

                    {canManageAdvanced && (
                        <button
                            type="button"
                            onClick={openExtendDialog}
                            className="px-3 py-2 text-sm font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            Prolonger
                        </button>
                    )}

                    {canDeleteLocation && (
                        <button
                            type="button"
                            onClick={() => setDeleteDialogOpen(true)}
                            className="px-3 py-2 text-sm font-semibold rounded-md text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60"
                            disabled={deleting}
                        >
                            {deleting ? 'Suppression...' : 'Supprimer'}
                        </button>
                    )}
                </div>
            </section>

            {canEditLocation && (
                <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
                    <h3 className="text-lg font-bold text-slate-900">Modifier la location</h3>
                    <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <label className="text-xs font-semibold text-slate-600">
                            Client
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
                                    <option key={vehicle.id} value={vehicle.id}>{getVehicleLabel(vehicle.id)}</option>
                                ))}
                            </select>
                        </label>

                        <label className="text-xs font-semibold text-slate-600">
                            Tarif / jour
                            <input
                                value={formData.tarif_jour}
                                onChange={(event) => setFormData((prev) => ({ ...prev, tarif_jour: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
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
                                    value={agenceById[Number(userAgenceId)] || "Pas d'agence"}
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
                open={deleteDialogOpen}
                title="Confirmation de suppression"
                message={location ? `Supprimer la location #${location.id} definitivement ?` : 'Supprimer cette location ?'}
                confirmLabel="Supprimer"
                loading={deleting}
                onCancel={() => setDeleteDialogOpen(false)}
                onConfirm={async () => {
                    await handleDelete();
                    setDeleteDialogOpen(false);
                }}
            />
            <DateTimeInputDialog
                open={dateDialog.open}
                title={dateDialog.mode === 'return' ? 'Retour de location' : 'Prolonger location'}
                label={dateDialog.mode === 'return' ? 'Date retour reelle' : 'Nouvelle date fin prevue'}
                value={dateDialog.value}
                loading={saving}
                onChange={(value) => setDateDialog((prev) => ({ ...prev, value }))}
                onCancel={closeDateDialog}
                onSubmit={confirmDateDialog}
            />
        </div>
    );
};

export default LocationDetailPage;
