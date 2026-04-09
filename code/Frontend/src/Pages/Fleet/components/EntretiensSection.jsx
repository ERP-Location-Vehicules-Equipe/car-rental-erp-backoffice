import React, { useMemo, useState } from 'react';
import fleetService from '../../../Services/fleetService';
import { formatDateTime, toIsoOrNull, toLocalDateTimeInput } from './fleetUiUtils';

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

const EntretiensSection = ({ entretiens, vehicles, canManage, executeAction }) => {
    const [formData, setFormData] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);

    const vehicleLabelById = useMemo(() => {
        return (vehicles || []).reduce((acc, vehicle) => {
            acc[Number(vehicle.id)] = `${vehicle.immatriculation} (${vehicle.id})`;
            return acc;
        }, {});
    }, [vehicles]);

    const resetForm = () => {
        setFormData(emptyForm);
        setEditingId(null);
    };

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

    const handleSubmit = (event) => {
        event.preventDefault();
        const payload = buildPayload();
        if (
            Number.isNaN(payload.vehicle_id) ||
            !payload.description ||
            !payload.date_debut ||
            Number.isNaN(payload.cout)
        ) {
            return executeAction(
                async () => {
                    throw new Error('Veuillez remplir les champs obligatoires de l entretien avec des valeurs valides.');
                },
                '',
                () => 'Veuillez remplir les champs obligatoires de l entretien avec des valeurs valides.',
            );
        }

        if (editingId) {
            return executeAction(
                () => fleetService.updateEntretien(editingId, payload),
                'Entretien mis a jour avec succes.',
                () => 'Impossible de modifier l entretien.',
                resetForm,
            );
        }

        return executeAction(
            () => fleetService.createEntretien(payload),
            'Entretien cree avec succes.',
            () => 'Impossible de creer l entretien.',
            resetForm,
        );
    };

    const handleEdit = (entretien) => {
        setEditingId(entretien.id);
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
    };

    const handleDelete = (id) => {
        if (!window.confirm('Supprimer cet entretien ?')) {
            return;
        }
        return executeAction(
            () => fleetService.deleteEntretien(id),
            'Entretien supprime.',
            () => 'Impossible de supprimer l entretien.',
        );
    };

    return (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Entretiens</h3>
                    <p className="text-sm text-slate-500">Suivi maintenance preventive et corrective par vehicule.</p>
                </div>
                {!canManage && (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        Lecture seule
                    </span>
                )}
            </div>

            {canManage && (
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className="text-xs font-semibold text-slate-600">
                        Vehicule
                        <select
                            name="vehicle_id"
                            value={formData.vehicle_id}
                            onChange={(event) => setFormData((prev) => ({ ...prev, vehicle_id: event.target.value }))}
                            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            required
                        >
                            <option value="">Selectionner</option>
                            {vehicles.map((vehicle) => (
                                <option key={vehicle.id} value={vehicle.id}>
                                    {vehicle.immatriculation} - {vehicle.id}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                        Type
                        <select
                            name="type_entretien"
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
                            name="statut"
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
                            name="description"
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
                            name="date_debut"
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
                            name="date_fin"
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
                            name="cout"
                            value={formData.cout}
                            onChange={(event) => setFormData((prev) => ({ ...prev, cout: event.target.value }))}
                            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            required
                        />
                    </label>
                    <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                        Prestataire
                        <input
                            name="prestataire"
                            value={formData.prestataire}
                            onChange={(event) => setFormData((prev) => ({ ...prev, prestataire: event.target.value }))}
                            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            placeholder="Garage / centre service"
                        />
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
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Vehicule</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Statut</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Debut</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Fin</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Cout</th>
                            {canManage && <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {entretiens.map((entretien) => (
                            <tr key={entretien.id}>
                                <td className="px-4 py-2 text-sm text-slate-900 font-medium">{vehicleLabelById[Number(entretien.vehicle_id)] || `Vehicule #${entretien.vehicle_id}`}</td>
                                <td className="px-4 py-2 text-sm text-slate-700">{entretien.type_entretien}</td>
                                <td className="px-4 py-2 text-sm text-slate-700">{entretien.statut}</td>
                                <td className="px-4 py-2 text-sm text-slate-700">{formatDateTime(entretien.date_debut)}</td>
                                <td className="px-4 py-2 text-sm text-slate-700">{formatDateTime(entretien.date_fin)}</td>
                                <td className="px-4 py-2 text-sm text-slate-700">{entretien.cout}</td>
                                {canManage && (
                                    <td className="px-4 py-2 text-right text-sm space-x-3">
                                        <button type="button" onClick={() => handleEdit(entretien)} className="text-blue-600 hover:text-blue-800">
                                            Modifier
                                        </button>
                                        <button type="button" onClick={() => handleDelete(entretien.id)} className="text-red-600 hover:text-red-800">
                                            Supprimer
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                        {entretiens.length === 0 && (
                            <tr>
                                <td colSpan={canManage ? 7 : 6} className="px-4 py-6 text-center text-sm text-slate-500">
                                    Aucun entretien enregistre.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
};

export default EntretiensSection;
