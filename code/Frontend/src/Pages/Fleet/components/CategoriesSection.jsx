import React, { useState } from 'react';
import fleetService from '../../../Services/fleetService';

const initialForm = {
    libelle: '',
    tarif_jour_base: '',
};

const CategoriesSection = ({ categories, canEdit, executeAction }) => {
    const [formData, setFormData] = useState(initialForm);
    const [editingId, setEditingId] = useState(null);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleEdit = (category) => {
        setEditingId(category.id);
        setFormData({
            libelle: category.libelle || '',
            tarif_jour_base: String(category.tarif_jour_base ?? ''),
        });
    };

    const resetForm = () => {
        setFormData(initialForm);
        setEditingId(null);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const payload = {
            libelle: formData.libelle.trim(),
            tarif_jour_base: Number(formData.tarif_jour_base),
        };

        if (!payload.libelle || Number.isNaN(payload.tarif_jour_base)) {
            return executeAction(
                async () => {
                    throw new Error('Veuillez saisir un libelle et un tarif jour valide pour la categorie.');
                },
                '',
                () => 'Veuillez saisir un libelle et un tarif jour valide pour la categorie.',
            );
        }

        if (editingId) {
            return executeAction(
                () => fleetService.updateCategory(editingId, payload),
                'Categorie mise a jour avec succes.',
                () => 'Impossible de modifier la categorie.',
                resetForm,
            );
        }

        return executeAction(
            () => fleetService.createCategory(payload),
            'Categorie creee avec succes.',
            () => 'Impossible de creer la categorie.',
            resetForm,
        );
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Supprimer cette categorie ?')) {
            return;
        }
        return executeAction(
            () => fleetService.deleteCategory(id),
            'Categorie supprimee.',
            () => 'Impossible de supprimer la categorie.',
        );
    };

    return (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Categories</h3>
                    <p className="text-sm text-slate-500">Classification des vehicules avec tarif journalier de base.</p>
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
                        <label htmlFor="category-libelle" className="block text-xs font-semibold text-slate-600 mb-1">Libelle</label>
                        <input
                            id="category-libelle"
                            name="libelle"
                            value={formData.libelle}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            placeholder="SUV, Berline..."
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="category-price" className="block text-xs font-semibold text-slate-600 mb-1">Tarif/jour base</label>
                        <input
                            id="category-price"
                            name="tarif_jour_base"
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.tarif_jour_base}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            placeholder="350"
                            required
                        />
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" className="px-3 py-2 text-sm font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700">
                            {editingId ? 'Mettre a jour' : 'Ajouter'}
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

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">ID</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Libelle</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Tarif/jour</th>
                            {canEdit && <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {categories.map((category) => (
                            <tr key={category.id}>
                                <td className="px-4 py-2 text-sm text-slate-700">{category.id}</td>
                                <td className="px-4 py-2 text-sm text-slate-900 font-medium">{category.libelle}</td>
                                <td className="px-4 py-2 text-sm text-slate-700">{category.tarif_jour_base}</td>
                                {canEdit && (
                                    <td className="px-4 py-2 text-right text-sm space-x-3">
                                        <button type="button" onClick={() => handleEdit(category)} className="text-blue-600 hover:text-blue-800">
                                            Modifier
                                        </button>
                                        <button type="button" onClick={() => handleDelete(category.id)} className="text-red-600 hover:text-red-800">
                                            Supprimer
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                        {categories.length === 0 && (
                            <tr>
                                <td colSpan={canEdit ? 4 : 3} className="px-4 py-6 text-center text-sm text-slate-500">
                                    Aucune categorie disponible.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
};

export default CategoriesSection;
