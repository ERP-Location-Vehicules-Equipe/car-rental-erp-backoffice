import React, { useMemo, useState } from 'react';
import fleetService from '../../../Services/fleetService';
import { formatDateTime, toIsoOrNull, toLocalDateTimeInput } from './fleetUiUtils';

const VEHICLE_STATUSES = [
    'disponible',
    'loue',
    'entretien',
    'hors_service',
];

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

const VehiclesSection = ({
    vehicles,
    categories,
    modeles,
    agences,
    canManageVehicles,
    isSuperAdmin,
    userAgenceId,
    executeAction,
}) => {
    const [formData, setFormData] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);

    const categoryById = useMemo(() => {
        return (categories || []).reduce((acc, item) => {
            acc[Number(item.id)] = item.libelle;
            return acc;
        }, {});
    }, [categories]);

    const modeleById = useMemo(() => {
        return (modeles || []).reduce((acc, item) => {
            acc[Number(item.id)] = item.nom;
            return acc;
        }, {});
    }, [modeles]);

    const agenceById = useMemo(() => {
        return (agences || []).reduce((acc, item) => {
            acc[Number(item.id)] = item.nom;
            return acc;
        }, {});
    }, [agences]);

    const getAgenceLabel = (agenceId) => {
        if (!agenceId) {
            return "Pas d'agence";
        }
        return agenceById[Number(agenceId)] || "Pas d'agence";
    };

    const resetForm = () => {
        setFormData({
            ...emptyForm,
            agence_id: isSuperAdmin ? '' : String(userAgenceId || ''),
        });
        setEditingId(null);
    };

    const buildPayload = () => {
        const agenceValue = isSuperAdmin ? Number(formData.agence_id) : Number(userAgenceId);
        return {
            agence_id: agenceValue,
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

    const handleSubmit = (event) => {
        event.preventDefault();
        const payload = buildPayload();
        const hasInvalidNumber = [
            payload.agence_id,
            payload.modele_id,
            payload.categorie_id,
            payload.kilometrage,
            payload.nombre_places,
            payload.prix_location,
            payload.valeur_achat,
        ].some((value) => Number.isNaN(value));

        if (!payload.immatriculation || hasInvalidNumber) {
            return executeAction(
                async () => {
                    throw new Error('Veuillez remplir les champs obligatoires du vehicule avec des valeurs valides.');
                },
                '',
                () => 'Veuillez remplir les champs obligatoires du vehicule avec des valeurs valides.',
            );
        }

        if (editingId) {
            return executeAction(
                () => fleetService.updateVehicle(editingId, payload),
                'Vehicule mis a jour avec succes.',
                () => 'Impossible de modifier le vehicule.',
                resetForm,
            );
        }

        return executeAction(
            () => fleetService.createVehicle(payload),
            'Vehicule cree avec succes.',
            () => 'Impossible de creer le vehicule.',
            resetForm,
        );
    };

    const handleEdit = (vehicle) => {
        setEditingId(vehicle.id);
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
    };

    const handleDelete = (id) => {
        if (!window.confirm('Supprimer ce vehicule ?')) {
            return;
        }
        return executeAction(
            () => fleetService.deleteVehicle(id),
            'Vehicule supprime.',
            () => 'Impossible de supprimer le vehicule.',
        );
    };

    const handleStatusChange = (id, status) => {
        return executeAction(
            () => fleetService.updateVehicleStatus(id, status),
            'Statut du vehicule mis a jour.',
            () => 'Impossible de changer le statut du vehicule.',
        );
    };

    return (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Vehicules</h3>
                    <p className="text-sm text-slate-500">Parc roulant, statut et caracteristiques des vehicules.</p>
                </div>
                {!canManageVehicles && (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        Lecture seule
                    </span>
                )}
            </div>

            {canManageVehicles && (
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {isSuperAdmin ? (
                        <label className="text-xs font-semibold text-slate-600">
                            Agence
                            <select
                                name="agence_id"
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
                                value={getAgenceLabel(userAgenceId)}
                                className="mt-1 w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-md text-sm"
                                disabled
                            />
                        </label>
                    )}
                    <label className="text-xs font-semibold text-slate-600">
                        Modele
                        <select
                            name="modele_id"
                            value={formData.modele_id}
                            onChange={(event) => setFormData((prev) => ({ ...prev, modele_id: event.target.value }))}
                            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            required
                        >
                            <option value="">Selectionner</option>
                            {modeles.map((modele) => (
                                <option key={modele.id} value={modele.id}>{modele.nom}</option>
                            ))}
                        </select>
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                        Categorie
                        <select
                            name="categorie_id"
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
                    <label className="text-xs font-semibold text-slate-600">Immatriculation
                        <input name="immatriculation" value={formData.immatriculation} onChange={(event) => setFormData((prev) => ({ ...prev, immatriculation: event.target.value }))} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm" required />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">Date mise en circulation
                        <input type="datetime-local" name="date_mise_en_circulation" value={formData.date_mise_en_circulation} onChange={(event) => setFormData((prev) => ({ ...prev, date_mise_en_circulation: event.target.value }))} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">Kilometrage
                        <input type="number" min="0" name="kilometrage" value={formData.kilometrage} onChange={(event) => setFormData((prev) => ({ ...prev, kilometrage: event.target.value }))} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm" required />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">Nombre places
                        <input type="number" min="1" name="nombre_places" value={formData.nombre_places} onChange={(event) => setFormData((prev) => ({ ...prev, nombre_places: event.target.value }))} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm" required />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">Prix location
                        <input type="number" min="0" step="0.01" name="prix_location" value={formData.prix_location} onChange={(event) => setFormData((prev) => ({ ...prev, prix_location: event.target.value }))} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm" required />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">Valeur achat
                        <input type="number" min="0" step="0.01" name="valeur_achat" value={formData.valeur_achat} onChange={(event) => setFormData((prev) => ({ ...prev, valeur_achat: event.target.value }))} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm" required />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">Statut
                        <select name="statut" value={formData.statut} onChange={(event) => setFormData((prev) => ({ ...prev, statut: event.target.value }))} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm">
                            {VEHICLE_STATUSES.map((status) => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </label>
                    <label className="text-xs font-semibold text-slate-600 md:col-span-2">Photo URL
                        <input name="photo_url" value={formData.photo_url} onChange={(event) => setFormData((prev) => ({ ...prev, photo_url: event.target.value }))} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm" placeholder="https://..." />
                    </label>
                    <div className="flex items-end gap-2">
                        <button type="submit" className="px-3 py-2 text-sm font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700">
                            {editingId ? 'Mettre a jour' : 'Ajouter'}
                        </button>
                        {editingId && (
                            <button type="button" onClick={resetForm} className="px-3 py-2 text-sm font-semibold rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50">
                                Annuler
                            </button>
                        )}
                    </div>
                </form>
            )}

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Immatriculation</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Agence</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Modele</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Categorie</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Statut</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Created</th>
                            {canManageVehicles && <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {vehicles.map((vehicle) => (
                            <tr key={vehicle.id}>
                                <td className="px-4 py-2 text-sm font-medium text-slate-900">{vehicle.immatriculation}</td>
                                <td className="px-4 py-2 text-sm text-slate-700">{getAgenceLabel(vehicle.agence_id)}</td>
                                <td className="px-4 py-2 text-sm text-slate-700">{modeleById[Number(vehicle.modele_id)] || vehicle.modele_id}</td>
                                <td className="px-4 py-2 text-sm text-slate-700">{categoryById[Number(vehicle.categorie_id)] || vehicle.categorie_id}</td>
                                <td className="px-4 py-2 text-sm text-slate-700">
                                    {canManageVehicles ? (
                                        <select
                                            value={vehicle.statut}
                                            onChange={(event) => handleStatusChange(vehicle.id, event.target.value)}
                                            className="px-2 py-1 border border-slate-300 rounded-md text-xs"
                                        >
                                            {VEHICLE_STATUSES.map((status) => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                    ) : vehicle.statut}
                                </td>
                                <td className="px-4 py-2 text-sm text-slate-700">{formatDateTime(vehicle.created_at)}</td>
                                {canManageVehicles && (
                                    <td className="px-4 py-2 text-right text-sm space-x-3">
                                        <button type="button" onClick={() => handleEdit(vehicle)} className="text-blue-600 hover:text-blue-800">
                                            Modifier
                                        </button>
                                        <button type="button" onClick={() => handleDelete(vehicle.id)} className="text-red-600 hover:text-red-800">
                                            Supprimer
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                        {vehicles.length === 0 && (
                            <tr>
                                <td colSpan={canManageVehicles ? 7 : 6} className="px-4 py-6 text-center text-sm text-slate-500">
                                    Aucun vehicule disponible.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
};

export default VehiclesSection;
