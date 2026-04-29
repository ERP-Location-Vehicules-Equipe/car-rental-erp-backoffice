import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import authService from '../../Services/authService';
import fleetService from '../../Services/fleetService';
import { getErrorMessage } from '../../utils/errorHandler';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { formatDateTime, toIsoOrNull, toLocalDateTimeInput } from './components/fleetUiUtils';

const ENTRETIEN_TYPES = ['preventive', 'corrective'];
const ENTRETIEN_STATUSES = ['planifiee', 'en_cours', 'terminee', 'annulee'];

const emptyForm = {
    vehicle_id: '',
    type_entretien: 'preventive',
    description: '',
    date_debut: '',
    date_fin: '',
    cout: '0',
    prestataire: '',
    statut: 'planifiee',
};

const EntretienDetailPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const currentUser = authService.getCurrentUser();
    const isSuperAdmin = currentUser?.role === authService.ROLE_SUPER_ADMIN;
    const isAdmin = currentUser?.role === authService.ROLE_ADMIN;
    const canManage = isSuperAdmin || isAdmin;

    const [entretien, setEntretien] = useState(null);
    const [vehicles, setVehicles] = useState([]);
    const [modeles, setModeles] = useState([]);
    const [marques, setMarques] = useState([]);

    const [formData, setFormData] = useState(emptyForm);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
        const marqueName = modele ? marqueById[Number(modele.marque_id)] : null;
        const base = `${marqueName || ''} ${modele?.nom || ''}`.trim();
        if (base) {
            return `${base} (${vehicle.immatriculation})`;
        }
        return vehicle.immatriculation || 'Vehicule inconnu';
    }, [marqueById, modeleById, vehicleById]);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [entretienData, vehiclesData, modelesData, marquesData] = await Promise.all([
                fleetService.getEntretienById(id),
                fleetService.getVehicles(),
                fleetService.getModeles(),
                fleetService.getMarques(),
            ]);

            setEntretien(entretienData);
            setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
            setModeles(Array.isArray(modelesData) ? modelesData : []);
            setMarques(Array.isArray(marquesData) ? marquesData : []);
        } catch (loadError) {
            setError(getErrorMessage(loadError, 'Impossible de charger les details de cet entretien.'));
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (!entretien) {
            return;
        }

        setFormData({
            vehicle_id: String(entretien.vehicle_id || ''),
            type_entretien: entretien.type_entretien || 'preventive',
            description: entretien.description || '',
            date_debut: toLocalDateTimeInput(entretien.date_debut),
            date_fin: toLocalDateTimeInput(entretien.date_fin),
            cout: String(entretien.cout ?? 0),
            prestataire: entretien.prestataire || '',
            statut: entretien.statut || 'planifiee',
        });
    }, [entretien]);

    const buildPayload = () => {
        return {
            vehicle_id: Number(formData.vehicle_id),
            type_entretien: formData.type_entretien,
            description: formData.description.trim(),
            date_debut: toIsoOrNull(formData.date_debut),
            date_fin: formData.date_fin ? toIsoOrNull(formData.date_fin) : null,
            cout: Number(formData.cout),
            prestataire: formData.prestataire.trim() || null,
            statut: formData.statut,
        };
    };

    const handleUpdate = async (event) => {
        event.preventDefault();
        if (!entretien) {
            return;
        }

        const payload = buildPayload();
        if (
            Number.isNaN(payload.vehicle_id) ||
            !payload.description ||
            !payload.date_debut ||
            Number.isNaN(payload.cout)
        ) {
            setError('Veuillez renseigner des valeurs valides pour mettre a jour cet entretien.');
            return;
        }

        setSaving(true);
        setError('');
        setNotice('');
        try {
            const updated = await fleetService.updateEntretien(entretien.id, payload);
            setEntretien(updated);
            setNotice('Entretien mis a jour avec succes.');
        } catch (updateError) {
            setError(getErrorMessage(updateError, 'Impossible de mettre a jour cet entretien.'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!entretien) {
            return;
        }

        setDeleting(true);
        setError('');
        setNotice('');
        try {
            await fleetService.deleteEntretien(entretien.id);
            navigate('/fleet');
        } catch (deleteError) {
            setError(getErrorMessage(deleteError, 'Impossible de supprimer cet entretien.'));
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
            </div>
        );
    }

    if (!entretien) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
                <p className="text-sm text-red-700">{error || 'Entretien introuvable.'}</p>
                <button
                    type="button"
                    onClick={() => navigate('/fleet')}
                    className="px-3 py-2 text-sm font-semibold rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                    Retour gestion parc
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Details entretien</h2>
                    <p className="mt-1 text-sm text-slate-500">{getVehicleLabel(entretien.vehicle_id)}</p>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/fleet')}
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
                    <div><span className="font-semibold text-slate-700">Vehicule:</span> {getVehicleLabel(entretien.vehicle_id)}</div>
                    <div><span className="font-semibold text-slate-700">Type:</span> {entretien.type_entretien}</div>
                    <div><span className="font-semibold text-slate-700">Description:</span> {entretien.description}</div>
                    <div><span className="font-semibold text-slate-700">Date debut:</span> {formatDateTime(entretien.date_debut)}</div>
                    <div><span className="font-semibold text-slate-700">Date fin:</span> {formatDateTime(entretien.date_fin)}</div>
                    <div><span className="font-semibold text-slate-700">Cout:</span> {entretien.cout}</div>
                    <div><span className="font-semibold text-slate-700">Prestataire:</span> {entretien.prestataire || '-'}</div>
                    <div><span className="font-semibold text-slate-700">Statut:</span> {entretien.statut}</div>
                </div>
            </section>

            {canManage && (
                <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
                    <h3 className="text-lg font-bold text-slate-900">Modifier l'entretien</h3>
                    <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <label className="text-xs font-semibold text-slate-600">
                            Vehicule
                            <select
                                value={formData.vehicle_id}
                                onChange={(event) => setFormData((prev) => ({ ...prev, vehicle_id: event.target.value }))}
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
                            Type
                            <select
                                value={formData.type_entretien}
                                onChange={(event) => setFormData((prev) => ({ ...prev, type_entretien: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            >
                                {ENTRETIEN_TYPES.map((item) => (
                                    <option key={item} value={item}>{item}</option>
                                ))}
                            </select>
                        </label>

                        <label className="text-xs font-semibold text-slate-600">
                            Statut
                            <select
                                value={formData.statut}
                                onChange={(event) => setFormData((prev) => ({ ...prev, statut: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            >
                                {ENTRETIEN_STATUSES.map((item) => (
                                    <option key={item} value={item}>{item}</option>
                                ))}
                            </select>
                        </label>

                        <label className="text-xs font-semibold text-slate-600 md:col-span-3">
                            Description
                            <textarea
                                value={formData.description}
                                onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                rows={2}
                                required
                            />
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
                            Date fin
                            <input
                                type="datetime-local"
                                value={formData.date_fin}
                                onChange={(event) => setFormData((prev) => ({ ...prev, date_fin: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            />
                        </label>

                        <label className="text-xs font-semibold text-slate-600">
                            Cout
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.cout}
                                onChange={(event) => setFormData((prev) => ({ ...prev, cout: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                required
                            />
                        </label>

                        <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                            Prestataire
                            <input
                                value={formData.prestataire}
                                onChange={(event) => setFormData((prev) => ({ ...prev, prestataire: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                placeholder="Garage / centre service"
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
                            <button
                                type="button"
                                onClick={() => setDeleteDialogOpen(true)}
                                className="px-3 py-2 text-sm font-semibold rounded-md text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60"
                                disabled={deleting}
                            >
                                {deleting ? 'Suppression...' : 'Supprimer'}
                            </button>
                        </div>
                    </form>
                </section>
            )}
            <ConfirmDialog
                open={deleteDialogOpen}
                title="Confirmation de suppression"
                message={entretien ? `Supprimer cet entretien #${entretien.id} ?` : 'Supprimer cet entretien ?'}
                confirmLabel="Supprimer"
                loading={deleting}
                onCancel={() => setDeleteDialogOpen(false)}
                onConfirm={async () => {
                    await handleDelete();
                    setDeleteDialogOpen(false);
                }}
            />
        </div>
    );
};

export default EntretienDetailPage;
