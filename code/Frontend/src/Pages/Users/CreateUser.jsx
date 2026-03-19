import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import userService from '../../Services/userService';

const CreateUser = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        nom: '',
        email: '',
        password: '',
        role: 'employe',
        agence_id: 1,
        actif: true
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : (name === 'agence_id' ? parseInt(value) || 0 : value)
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await userService.createUser(formData);
            navigate('/users');
        } catch (err) {
            if (err.response && err.response.data && err.response.data.detail) {
                setError(JSON.stringify(err.response.data.detail));
            } else {
                setError('Erreur lors de la création de l\'utilisateur.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Nouvel Utilisateur</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Remplissez les informations pour créer un accès au système.
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
                                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                                    Mot de passe
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="password"
                                        name="password"
                                        id="password"
                                        required
                                        value={formData.password}
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
                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-lg py-2 px-3 border bg-white"
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
                                            Compte actif immédiat
                                        </label>
                                        <p className="text-slate-500 mt-1">Activer directement l'accès au système pour cet utilisateur après la création.</p>
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
                                disabled={loading}
                                className="inline-flex justify-center flex-shrink-0 py-2 px-6 border border-transparent shadow-md text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
                            >
                                {loading ? 'Création en cours...' : 'Créer l\'utilisateur'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateUser;
