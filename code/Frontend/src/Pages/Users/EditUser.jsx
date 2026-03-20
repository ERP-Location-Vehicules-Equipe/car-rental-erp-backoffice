import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import userService from '../../Services/userService';
import { getErrorMessage } from '../../utils/errorHandler';

const EditUser = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        nom: '',
        email: '',
        role: 'employe',
        agence_id: 1,
        actif: true
    });

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const user = await userService.getUserById(id);
                setFormData({
                    nom: user.nom,
                    email: user.email,
                    role: user.role,
                    agence_id: user.agence_id,
                    actif: user.actif
                });
            } catch (err) {
                setError(getErrorMessage(err, 'Impossible de récupérer les informations de l\'utilisateur.'));
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [id]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : (name === 'agence_id' ? parseInt(value) || 0 : value)
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            await userService.updateUser(id, formData);
            navigate('/users');
        } catch (err) {
            setError(getErrorMessage(err, 'Erreur lors de la mise à jour de l\'utilisateur.'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Éditer l'Utilisateur</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Modification des informations du compte.
                    </p>
                </div>
                <Link
                    to="/users"
                    className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                >
                    Retour à la liste
                </Link>
            </div>

            <div className="bg-white shadow-sm sm:rounded-xl border border-slate-200">
                <div className="px-4 py-5 sm:p-6">
                    {error && (
                        <div className="mb-4 bg-red-50 p-4 rounded-md border border-red-200">
                            <p className="text-sm font-medium text-red-700">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label htmlFor="nom" className="block text-sm font-medium text-slate-700 mb-1">
                                    Nom Complet
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        name="nom"
                                        id="nom"
                                        required
                                        value={formData.nom}
                                        onChange={handleChange}
                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-lg py-2 px-3 border"
                                    />
                                </div>
                            </div>

                            <div className="sm:col-span-1">
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                                    Adresse Email
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="email"
                                        name="email"
                                        id="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-lg py-2 px-3 border"
                                    />
                                </div>
                            </div>

                            <div className="sm:col-span-1">
                                <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1">
                                    Rôle Système
                                </label>
                                <div className="mt-1">
                                    <select
                                        id="role"
                                        name="role"
                                        value={formData.role}
                                        onChange={handleChange}
                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-lg py-2 px-3 border bg-white cursor-pointer"
                                    >
                                        <option value="employe">Employé</option>
                                        <option value="admin">Administrateur</option>
                                    </select>
                                </div>
                            </div>

                            <div className="sm:col-span-1">
                                <label htmlFor="agence_id" className="block text-sm font-medium text-slate-700 mb-1">
                                    ID Agence / Succursale
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="number"
                                        name="agence_id"
                                        id="agence_id"
                                        required
                                        min="1"
                                        value={formData.agence_id}
                                        onChange={handleChange}
                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-lg py-2 px-3 border"
                                    />
                                </div>
                            </div>

                            <div className="sm:col-span-2 mt-2">
                                <div className="flex items-start bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <div className="flex items-center h-5 mt-1">
                                        <input
                                            id="actif"
                                            name="actif"
                                            type="checkbox"
                                            checked={formData.actif}
                                            onChange={handleChange}
                                            className="focus:ring-blue-500 h-5 w-5 text-blue-600 border-slate-300 rounded cursor-pointer"
                                        />
                                    </div>
                                    <div className="ml-3 text-sm">
                                        <label htmlFor="actif" className="font-bold text-slate-700 cursor-pointer">
                                            Compte actif
                                        </label>
                                        <p className="text-slate-500 mt-1">Activer ou désactiver l'accès au système pour cet utilisateur.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 flex justify-end space-x-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => navigate('/users')}
                                className="bg-white py-2 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex justify-center flex-shrink-0 py-2 px-6 border border-transparent shadow-md text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
                            >
                                {saving ? 'Enregistrement en cours...' : 'Enregistrer les modifications'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditUser;
