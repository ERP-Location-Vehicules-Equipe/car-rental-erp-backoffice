import React, { useMemo, useState } from 'react';
import fleetService from '../../../Services/fleetService';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { formatDateTime, toIsoOrNull, toLocalDateTimeInput } from './fleetUiUtils';

const ASSURANCE_TYPES = ['rc', 'tous_risques', 'vol_incendie', 'autre'];
const ASSURANCE_STATUSES = ['active', 'expiree', 'annulee'];

const emptyForm = {
    vehicle_id: '',
    type_assurance: 'rc',
    assureur: '',
    numero_police: '',
    date_debut: '',
    date_fin: '',
    montant: '',
    statut: 'active',
    notes: '',
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

const AssurancesSection = ({ assurances, vehicles, modeles, marques, canManage, executeAction }) => {
    const [formData, setFormData] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
        from: '',
        to: '',
    });
    const [deleteDialog, setDeleteDialog] = useState({
        open: false,
        assurance: null,
    });

    const modeleById = useMemo(() => {
        return (modeles || []).reduce((acc, modele) => {
            acc[Number(modele.id)] = modele;
            return acc;
        }, {});
    }, [modeles]);

    const marqueById = useMemo(() => {
        return (marques || []).reduce((acc, marque) => {
            acc[Number(marque.id)] = marque.nom;
            return acc;
        }, {});
    }, [marques]);

    const vehicleLabelById = useMemo(() => {
        return (vehicles || []).reduce((acc, vehicle) => {
            const modele = modeleById[Number(vehicle.modele_id)];
            const marqueNom = modele ? marqueById[Number(modele.marque_id)] : '';
            const modeleNom = modele?.nom || '';
            const base = `${marqueNom || ''} ${modeleNom || ''}`.trim();
            if (base) {
                acc[Number(vehicle.id)] = `${base} (${vehicle.immatriculation})`;
            } else {
                acc[Number(vehicle.id)] = vehicle.immatriculation || 'Vehicule inconnu';
            }
            return acc;
        }, {});
    }, [marqueById, modeleById, vehicles]);

    const filteredAssurances = useMemo(() => {
        const query = filters.search.trim().toLowerCase();
        const from = filters.from;
        const to = filters.to;

        return (assurances || []).filter((assurance) => {
            const dateOnly = toDateOnly(assurance.date_fin);
            const matchFrom = !from || (dateOnly && dateOnly >= from);
            const matchTo = !to || (dateOnly && dateOnly <= to);
            if (!matchFrom || !matchTo) {
                return false;
            }
            if (!query) {
                return true;
            }
            return [
                assurance.type_assurance,
                assurance.assureur,
                assurance.numero_police,
                assurance.statut,
                assurance.montant,
                vehicleLabelById[Number(assurance.vehicle_id)] || '',
            ].some((value) => String(value || '').toLowerCase().includes(query));
        });
    }, [assurances, filters.from, filters.search, filters.to, vehicleLabelById]);

    const resetForm = () => {
        setFormData(emptyForm);
        setEditingId(null);
    };

    const buildPayload = () => {
        return {
            vehicle_id: Number(formData.vehicle_id),
            type_assurance: formData.type_assurance,
            assureur: formData.assureur.trim(),
            numero_police: formData.numero_police.trim(),
            date_debut: toIsoOrNull(formData.date_debut),
            date_fin: toIsoOrNull(formData.date_fin),
            montant: Number(formData.montant),
            statut: formData.statut,
            notes: formData.notes.trim() || null,
        };
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        const payload = buildPayload();
        if (
            Number.isNaN(payload.vehicle_id) ||
            Number.isNaN(payload.montant) ||
            !payload.assureur ||
            !payload.numero_police ||
            !payload.date_debut ||
            !payload.date_fin
        ) {
            return executeAction(
                async () => {
                    throw new Error("Veuillez remplir correctement les champs d'assurance.");
                },
                '',
                () => "Veuillez remplir correctement les champs d'assurance.",
            );
        }

        if (editingId) {
            return executeAction(
                () => fleetService.updateAssurance(editingId, payload),
                'Assurance mise a jour avec succes.',
                () => "Impossible de modifier l'assurance.",
                resetForm,
            );
        }

        return executeAction(
            () => fleetService.createAssurance(payload),
            'Assurance creee avec succes.',
            () => "Impossible de creer l'assurance.",
            resetForm,
        );
    };

    const handleEdit = (assurance) => {
        setEditingId(assurance.id);
        setFormData({
            vehicle_id: String(assurance.vehicle_id || ''),
            type_assurance: assurance.type_assurance || 'rc',
            assureur: assurance.assureur || '',
            numero_police: assurance.numero_police || '',
            date_debut: toLocalDateTimeInput(assurance.date_debut),
            date_fin: toLocalDateTimeInput(assurance.date_fin),
            montant: String(assurance.montant ?? ''),
            statut: assurance.statut || 'active',
            notes: assurance.notes || '',
        });
    };

    const handleDelete = (id) => {
        return executeAction(
            () => fleetService.deleteAssurance(id),
            'Assurance supprimee.',
            () => "Impossible de supprimer l'assurance.",
        );
    };

    return (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Assurances</h3>
                    <p className="text-sm text-slate-500">Suivi des polices assurance par vehicule et alertes d'echeance.</p>
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
                            value={formData.vehicle_id}
                            onChange={(event) => setFormData((prev) => ({ ...prev, vehicle_id: event.target.value }))}
                            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            required
                        >
                            <option value="">Selectionner</option>
                            {(vehicles || []).map((vehicle) => (
                                <option key={vehicle.id} value={vehicle.id}>
                                    {vehicleLabelById[Number(vehicle.id)] || 'Vehicule inconnu'}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                        Type assurance
                        <select
                            value={formData.type_assurance}
                            onChange={(event) => setFormData((prev) => ({ ...prev, type_assurance: event.target.value }))}
                            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                        >
                            {ASSURANCE_TYPES.map((item) => (
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
                            {ASSURANCE_STATUSES.map((item) => (
                                <option key={item} value={item}>{item}</option>
                            ))}
                        </select>
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                        Assureur
                        <input
                            value={formData.assureur}
                            onChange={(event) => setFormData((prev) => ({ ...prev, assureur: event.target.value }))}
                            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            required
                        />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                        Numero police
                        <input
                            value={formData.numero_police}
                            onChange={(event) => setFormData((prev) => ({ ...prev, numero_police: event.target.value }))}
                            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            required
                        />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                        Montant
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.montant}
                            onChange={(event) => setFormData((prev) => ({ ...prev, montant: event.target.value }))}
                            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
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
                            required
                        />
                    </label>
                    <label className="text-xs font-semibold text-slate-600 md:col-span-3">
                        Notes
                        <textarea
                            value={formData.notes}
                            onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
                            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            rows={2}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 border-b border-slate-200 bg-slate-50">
                    <label className="text-xs font-semibold text-slate-600">
                        Recherche
                        <input
                            value={filters.search}
                            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            placeholder="Vehicule, assureur, police, statut..."
                        />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                        Echeance du
                        <input
                            type="date"
                            value={filters.from}
                            onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
                            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                        />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                        Echeance au
                        <input
                            type="date"
                            value={filters.to}
                            onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
                            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                        />
                    </label>
                </div>
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Vehicule</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Assureur</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Police</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Debut</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Fin</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Montant</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Statut</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredAssurances.map((assurance) => (
                            <tr key={assurance.id}>
                                <td className="px-4 py-2 text-sm text-slate-900 font-medium">{vehicleLabelById[Number(assurance.vehicle_id)] || 'Vehicule inconnu'}</td>
                                <td className="px-4 py-2 text-sm text-slate-700">{assurance.type_assurance}</td>
                                <td className="px-4 py-2 text-sm text-slate-700">{assurance.assureur}</td>
                                <td className="px-4 py-2 text-sm text-slate-700">{assurance.numero_police}</td>
                                <td className="px-4 py-2 text-sm text-slate-700">{formatDateTime(assurance.date_debut)}</td>
                                <td className="px-4 py-2 text-sm text-slate-700">{formatDateTime(assurance.date_fin)}</td>
                                <td className="px-4 py-2 text-sm text-slate-700">{assurance.montant}</td>
                                <td className="px-4 py-2 text-sm text-slate-700">{assurance.statut}</td>
                                <td className="px-4 py-2 text-right text-sm space-x-3">
                                    {canManage && (
                                        <button type="button" onClick={() => handleEdit(assurance)} className="text-blue-600 hover:text-blue-800">
                                            Modifier
                                        </button>
                                    )}
                                    {canManage && (
                                        <button
                                            type="button"
                                            onClick={() => setDeleteDialog({ open: true, assurance })}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            Supprimer
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {filteredAssurances.length === 0 && (
                            <tr>
                                <td colSpan={9} className="px-4 py-6 text-center text-sm text-slate-500">
                                    Aucune assurance trouvee.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <ConfirmDialog
                open={deleteDialog.open}
                title="Confirmation de suppression"
                message={deleteDialog.assurance ? `Supprimer cette assurance (${deleteDialog.assurance.numero_police}) ?` : 'Supprimer cette assurance ?'}
                confirmLabel="Supprimer"
                onCancel={() => setDeleteDialog({ open: false, assurance: null })}
                onConfirm={async () => {
                    if (!deleteDialog.assurance) {
                        return;
                    }
                    await handleDelete(deleteDialog.assurance.id);
                    setDeleteDialog({ open: false, assurance: null });
                }}
            />
        </section>
    );
};

export default AssurancesSection;

