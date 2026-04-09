import React, { useMemo, useState } from 'react';
import fleetService from '../../../Services/fleetService';

const initialForm = {
    nom: '',
    marque_id: '',
};

const ModelesSection = ({ modeles, marques, canEdit, executeAction }) => {
    const [formData, setFormData] = useState(initialForm);
    const [editingId, setEditingId] = useState(null);

    const marqueNameById = useMemo(() => {
        return (marques || []).reduce((acc, item) => {
            acc[Number(item.id)] = item.nom;
            return acc;
        }, {});
    }, [marques]);

    const resetForm = () => {
        setFormData(initialForm);
        setEditingId(null);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        const payload = {
            nom: formData.nom.trim(),
            marque_id: formData.marque_id ? Number(formData.marque_id) : null,
        };

        if (!payload.nom) {
            return executeAction(
                async () => {
                    throw new Error('Le nom du modele est obligatoire.');
                },
                '',
                () => 'Le nom du modele est obligatoire.',
            );
        }

        if (formData.marque_id && Number.isNaN(payload.marque_id)) {
            return executeAction(
                async () => {
                    throw new Error('La marque selectionnee est invalide.');
                },
                '',
                () => 'La marque selectionnee est invalide.',
            );
        }

        if (editingId) {
            return executeAction(
                () => fleetService.updateModele(editingId, payload),
                'Modele mis a jour avec succes.',
                () => 'Impossible de modifier le modele.',
                resetForm,
            );
        }

        return executeAction(
            () => fleetService.createModele(payload),
            'Modele cree avec succes.',
            () => 'Impossible de creer le modele.',
            resetForm,
        );
    };

    const handleEdit = (modele) => {
        setEditingId(modele.id);
        setFormData({
            nom: modele.nom || '',
            marque_id: modele.marque_id ? String(modele.marque_id) : '',
        });
    };

    const handleDelete = (id) => {
        if (!window.confirm('Supprimer ce modele ?')) {
            return;
        }
        return executeAction(
            () => fleetService.deleteModele(id),
            'Modele supprime.',
            () => 'Impossible de supprimer le modele.',
        );
    };

    return (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Modeles</h3>
                    <p className="text-sm text-slate-500">Catalogue des modeles rattaches a une marque.</p>
                </div>
                {!canEdit && (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        Lecture seule
                    </span>
                )}
            </div>

            {canEdit && (
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div className="md:col-span-2">
                        <label htmlFor="modele-nom" className="block text-xs font-semibold text-slate-600 mb-1">Nom modele</label>
                        <input
                            id="modele-nom"
                            name="nom"
                            value={formData.nom}
                            onChange={(event) => setFormData((prev) => ({ ...prev, nom: event.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            placeholder="Clio, Corolla..."
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="modele-marque" className="block text-xs font-semibold text-slate-600 mb-1">Marque</label>
                        <select
                            id="modele-marque"
                            name="marque_id"
                            value={formData.marque_id}
                            onChange={(event) => setFormData((prev) => ({ ...prev, marque_id: event.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                        >
                            <option value="">Sans marque</option>
                            {marques.map((marque) => (
                                <option key={marque.id} value={marque.id}>{marque.nom}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2">
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
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">ID</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Modele</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Marque</th>
                            {canEdit && <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {modeles.map((modele) => (
                            <tr key={modele.id}>
                                <td className="px-4 py-2 text-sm text-slate-700">{modele.id}</td>
                                <td className="px-4 py-2 text-sm text-slate-900 font-medium">{modele.nom}</td>
                                <td className="px-4 py-2 text-sm text-slate-700">
                                    {marqueNameById[Number(modele.marque_id)] || '-'}
                                </td>
                                {canEdit && (
                                    <td className="px-4 py-2 text-right text-sm space-x-3">
                                        <button type="button" onClick={() => handleEdit(modele)} className="text-blue-600 hover:text-blue-800">
                                            Modifier
                                        </button>
                                        <button type="button" onClick={() => handleDelete(modele.id)} className="text-red-600 hover:text-red-800">
                                            Supprimer
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                        {modeles.length === 0 && (
                            <tr>
                                <td colSpan={canEdit ? 4 : 3} className="px-4 py-6 text-center text-sm text-slate-500">
                                    Aucun modele disponible.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
};

export default ModelesSection;
