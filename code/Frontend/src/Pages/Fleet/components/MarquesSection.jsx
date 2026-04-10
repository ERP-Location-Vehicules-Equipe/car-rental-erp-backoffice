import React, { useMemo, useState } from 'react';
import fleetService from '../../../Services/fleetService';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';

const initialForm = {
    nom: '',
};

const MarquesSection = ({ marques, canEdit, executeAction }) => {
    const [formData, setFormData] = useState(initialForm);
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState('');
    const [marqueToDelete, setMarqueToDelete] = useState(null);

    const filteredMarques = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) {
            return marques;
        }
        return marques.filter((marque) => String(marque.nom || '').toLowerCase().includes(query));
    }, [marques, search]);

    const resetForm = () => {
        setFormData(initialForm);
        setEditingId(null);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        const payload = { nom: formData.nom.trim() };
        if (!payload.nom) {
            return executeAction(
                async () => {
                    throw new Error('Le nom de la marque est obligatoire.');
                },
                '',
                () => 'Le nom de la marque est obligatoire.',
            );
        }

        if (editingId) {
            return executeAction(
                () => fleetService.updateMarque(editingId, payload),
                'Marque mise a jour avec succes.',
                () => 'Impossible de modifier la marque.',
                resetForm,
            );
        }

        return executeAction(
            () => fleetService.createMarque(payload),
            'Marque creee avec succes.',
            () => 'Impossible de creer la marque.',
            resetForm,
        );
    };

    const handleDelete = (id) => {
        return executeAction(
            () => fleetService.deleteMarque(id),
            'Marque supprimee.',
            () => 'Impossible de supprimer la marque.',
        );
    };

    const handleEdit = (marque) => {
        setEditingId(marque.id);
        setFormData({ nom: marque.nom || '' });
    };

    return (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Marques</h3>
                    <p className="text-sm text-slate-500">Referentiel constructeur des vehicules.</p>
                </div>
                {!canEdit && (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        Lecture seule
                    </span>
                )}
            </div>

            {canEdit && (
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div className="md:col-span-2">
                        <label htmlFor="marque-nom" className="block text-xs font-semibold text-slate-600 mb-1">Nom</label>
                        <input
                            id="marque-nom"
                            name="nom"
                            value={formData.nom}
                            onChange={(event) => setFormData({ nom: event.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            placeholder="Toyota, Renault..."
                            required
                        />
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

            <label className="block text-xs font-semibold text-slate-600">
                Recherche
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="mt-1 w-full md:max-w-sm px-3 py-2 border border-slate-300 rounded-md text-sm"
                    placeholder="Nom marque..."
                />
            </label>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">ID</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Nom</th>
                            {canEdit && <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredMarques.map((marque) => (
                            <tr key={marque.id}>
                                <td className="px-4 py-2 text-sm text-slate-700">{marque.id}</td>
                                <td className="px-4 py-2 text-sm text-slate-900 font-medium">{marque.nom}</td>
                                {canEdit && (
                                    <td className="px-4 py-2 text-right text-sm space-x-3">
                                        <button type="button" onClick={() => handleEdit(marque)} className="text-blue-600 hover:text-blue-800">
                                            Modifier
                                        </button>
                                        <button type="button" onClick={() => setMarqueToDelete(marque)} className="text-red-600 hover:text-red-800">
                                            Supprimer
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                        {filteredMarques.length === 0 && (
                            <tr>
                                <td colSpan={canEdit ? 3 : 2} className="px-4 py-6 text-center text-sm text-slate-500">
                                    Aucune marque trouvee.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <ConfirmDialog
                open={Boolean(marqueToDelete)}
                title="Confirmation de suppression"
                message={marqueToDelete ? `Supprimer la marque "${marqueToDelete.nom}" ?` : 'Supprimer cette marque ?'}
                confirmLabel="Supprimer"
                onCancel={() => setMarqueToDelete(null)}
                onConfirm={async () => {
                    if (!marqueToDelete) {
                        return;
                    }
                    await handleDelete(marqueToDelete.id);
                    setMarqueToDelete(null);
                }}
            />
        </section>
    );
};

export default MarquesSection;
