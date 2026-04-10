import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import authService from '../../Services/authService';
import fleetService from '../../Services/fleetService';
import { getAgencesCachedSafe } from '../../Services/agenceLookupService';
import { getErrorMessage } from '../../utils/errorHandler';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { formatDateTime, toIsoOrNull, toLocalDateTimeInput } from './components/fleetUiUtils';

const VEHICLE_STATUSES = ['disponible', 'loue', 'entretien', 'hors_service'];

const emptyForm = {
    agence_id: '',
    modele_id: '',
    categorie_id: '',
    immatriculation: '',
    date_mise_en_circulation: '',
    kilometrage: '',
    nombre_places: '',
    statut: 'disponible',
    photo_url: '',
    prix_location: '',
    valeur_achat: '',
};

const VehicleDetailPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const currentUser = authService.getCurrentUser();
    const isSuperAdmin = currentUser?.role === authService.ROLE_SUPER_ADMIN;
    const isAdmin = currentUser?.role === authService.ROLE_ADMIN;
    const canManageVehicles = isSuperAdmin || isAdmin;
    const userAgenceId = currentUser?.agence_id;

    const [vehicle, setVehicle] = useState(null);
    const [categories, setCategories] = useState([]);
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

    const categoryById = useMemo(() => {
        return categories.reduce((acc, category) => {
            acc[Number(category.id)] = category.libelle;
            return acc;
        }, {});
    }, [categories]);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [vehicleData, categoriesData, modelesData, marquesData, agencesResult] = await Promise.all([
                fleetService.getVehicleById(id),
                fleetService.getCategories(),
                fleetService.getModeles(),
                fleetService.getMarques(),
                getAgencesCachedSafe(),
            ]);

            setVehicle(vehicleData);
            setCategories(Array.isArray(categoriesData) ? categoriesData : []);
            setModeles(Array.isArray(modelesData) ? modelesData : []);
            setMarques(Array.isArray(marquesData) ? marquesData : []);
            setAgences(Array.isArray(agencesResult.agences) ? agencesResult.agences : []);
        } catch (loadError) {
            setError(getErrorMessage(loadError, 'Impossible de charger les details du vehicule.'));
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (!vehicle) {
            return;
        }

        setFormData({
            agence_id: String(vehicle.agence_id || ''),
            modele_id: String(vehicle.modele_id || ''),
            categorie_id: String(vehicle.categorie_id || ''),
            immatriculation: vehicle.immatriculation || '',
            date_mise_en_circulation: toLocalDateTimeInput(vehicle.date_mise_en_circulation),
            kilometrage: String(vehicle.kilometrage ?? ''),
            nombre_places: String(vehicle.nombre_places ?? ''),
            statut: vehicle.statut || 'disponible',
            photo_url: vehicle.photo_url || '',
            prix_location: String(vehicle.prix_location ?? ''),
            valeur_achat: String(vehicle.valeur_achat ?? ''),
        });
    }, [vehicle]);

    const buildPayload = () => {
        const agenceId = isSuperAdmin ? Number(formData.agence_id) : Number(userAgenceId);

        return {
            agence_id: agenceId,
            modele_id: Number(formData.modele_id),
            categorie_id: Number(formData.categorie_id),
            immatriculation: formData.immatriculation.trim(),
            date_mise_en_circulation: toIsoOrNull(formData.date_mise_en_circulation),
            kilometrage: Number(formData.kilometrage),
            nombre_places: Number(formData.nombre_places),
            statut: formData.statut,
            photo_url: formData.photo_url.trim() || null,
            prix_location: Number(formData.prix_location),
            valeur_achat: Number(formData.valeur_achat),
        };
    };

    const handleUpdate = async (event) => {
        event.preventDefault();
        if (!vehicle) {
            return;
        }

        const payload = buildPayload();
        const hasInvalidNumber = [
            payload.agence_id,
            payload.modele_id,
            payload.categorie_id,
            payload.kilometrage,
            payload.nombre_places,
            payload.prix_location,
            payload.valeur_achat,
        ].some((value) => Number.isNaN(value) || value < 0);

        if (!payload.immatriculation || hasInvalidNumber) {
            setError('Veuillez renseigner des valeurs valides pour mettre a jour le vehicule.');
            return;
        }

        setSaving(true);
        setError('');
        setNotice('');
        try {
            const updated = await fleetService.updateVehicle(vehicle.id, payload);
            setVehicle(updated);
            setNotice('Vehicule mis a jour avec succes.');
        } catch (updateError) {
            setError(getErrorMessage(updateError, 'Impossible de mettre a jour ce vehicule.'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!vehicle) {
            return;
        }

        setDeleting(true);
        setError('');
        setNotice('');
        try {
            await fleetService.deleteVehicle(vehicle.id);
            navigate('/fleet');
        } catch (deleteError) {
            setError(getErrorMessage(deleteError, 'Impossible de supprimer ce vehicule.'));
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

    if (!vehicle) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
                <p className="text-sm text-red-700">{error || 'Vehicule introuvable.'}</p>
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

    const modele = modeleById[Number(vehicle.modele_id)];
    const marqueName = modele ? marqueById[Number(modele.marque_id)] : null;

    return (
        <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Details du vehicule</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        {marqueName || 'Marque inconnue'} {modele?.nom || 'Modele inconnu'} - {vehicle.immatriculation}
                    </p>
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
                    <div><span className="font-semibold text-slate-700">Agence:</span> {agenceById[Number(vehicle.agence_id)] || "Pas d'agence"}</div>
                    <div><span className="font-semibold text-slate-700">Modele:</span> {modele?.nom || 'Modele inconnu'}</div>
                    <div><span className="font-semibold text-slate-700">Marque:</span> {marqueName || 'Marque inconnue'}</div>
                    <div><span className="font-semibold text-slate-700">Categorie:</span> {categoryById[Number(vehicle.categorie_id)] || 'Categorie inconnue'}</div>
                    <div><span className="font-semibold text-slate-700">Immatriculation:</span> {vehicle.immatriculation}</div>
                    <div><span className="font-semibold text-slate-700">Mise en circulation:</span> {formatDateTime(vehicle.date_mise_en_circulation)}</div>
                    <div><span className="font-semibold text-slate-700">Kilometrage:</span> {vehicle.kilometrage}</div>
                    <div><span className="font-semibold text-slate-700">Nombre de places:</span> {vehicle.nombre_places}</div>
                    <div><span className="font-semibold text-slate-700">Prix de location:</span> {vehicle.prix_location}</div>
                    <div><span className="font-semibold text-slate-700">Valeur d'achat:</span> {vehicle.valeur_achat}</div>
                    <div><span className="font-semibold text-slate-700">Statut:</span> {vehicle.statut}</div>
                    <div><span className="font-semibold text-slate-700">Photo:</span> {vehicle.photo_url || '-'}</div>
                </div>
            </section>

            {canManageVehicles && (
                <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
                    <h3 className="text-lg font-bold text-slate-900">Modifier le vehicule</h3>
                    <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {isSuperAdmin ? (
                            <label className="text-xs font-semibold text-slate-600">
                                Agence
                                <select
                                    value={formData.agence_id}
                                    onChange={(event) => setFormData((prev) => ({ ...prev, agence_id: event.target.value }))}
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
                                Agence
                                <input
                                    value={agenceById[Number(userAgenceId)] || "Pas d'agence"}
                                    className="mt-1 w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-md text-sm"
                                    disabled
                                />
                            </label>
                        )}

                        <label className="text-xs font-semibold text-slate-600">
                            Modele
                            <select
                                value={formData.modele_id}
                                onChange={(event) => setFormData((prev) => ({ ...prev, modele_id: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                required
                            >
                                <option value="">Selectionner</option>
                                {modeles.map((modeleItem) => (
                                    <option key={modeleItem.id} value={modeleItem.id}>{modeleItem.nom}</option>
                                ))}
                            </select>
                        </label>

                        <label className="text-xs font-semibold text-slate-600">
                            Categorie
                            <select
                                value={formData.categorie_id}
                                onChange={(event) => setFormData((prev) => ({ ...prev, categorie_id: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                required
                            >
                                <option value="">Selectionner</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>{category.libelle}</option>
                                ))}
                            </select>
                        </label>

                        <label className="text-xs font-semibold text-slate-600">
                            Immatriculation
                            <input
                                value={formData.immatriculation}
                                onChange={(event) => setFormData((prev) => ({ ...prev, immatriculation: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                required
                            />
                        </label>

                        <label className="text-xs font-semibold text-slate-600">
                            Date mise en circulation
                            <input
                                type="datetime-local"
                                value={formData.date_mise_en_circulation}
                                onChange={(event) => setFormData((prev) => ({ ...prev, date_mise_en_circulation: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            />
                        </label>

                        <label className="text-xs font-semibold text-slate-600">
                            Kilometrage
                            <input
                                type="number"
                                min="0"
                                value={formData.kilometrage}
                                onChange={(event) => setFormData((prev) => ({ ...prev, kilometrage: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                required
                            />
                        </label>

                        <label className="text-xs font-semibold text-slate-600">
                            Nombre places
                            <input
                                type="number"
                                min="1"
                                value={formData.nombre_places}
                                onChange={(event) => setFormData((prev) => ({ ...prev, nombre_places: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                required
                            />
                        </label>

                        <label className="text-xs font-semibold text-slate-600">
                            Prix location
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.prix_location}
                                onChange={(event) => setFormData((prev) => ({ ...prev, prix_location: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                required
                            />
                        </label>

                        <label className="text-xs font-semibold text-slate-600">
                            Valeur achat
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.valeur_achat}
                                onChange={(event) => setFormData((prev) => ({ ...prev, valeur_achat: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                required
                            />
                        </label>

                        <label className="text-xs font-semibold text-slate-600">
                            Statut
                            <select
                                value={formData.statut}
                                onChange={(event) => setFormData((prev) => ({ ...prev, statut: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            >
                                {VEHICLE_STATUSES.map((statusValue) => (
                                    <option key={statusValue} value={statusValue}>{statusValue}</option>
                                ))}
                            </select>
                        </label>

                        <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                            Photo URL
                            <input
                                value={formData.photo_url}
                                onChange={(event) => setFormData((prev) => ({ ...prev, photo_url: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                placeholder="https://..."
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
                message={vehicle ? `Supprimer le vehicule ${vehicle.immatriculation} ?` : 'Supprimer ce vehicule ?'}
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

export default VehicleDetailPage;
