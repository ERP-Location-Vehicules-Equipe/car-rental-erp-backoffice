import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import userService from '../../Services/userService';
import { getAgencesCachedSafe } from '../../Services/agenceLookupService';
import { getErrorMessage } from '../../utils/errorHandler';

const CreateUser = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [loadingAgences, setLoadingAgences] = useState(true);
    const [agenceServiceAvailable, setAgenceServiceAvailable] = useState(true);
    const [agenceWarning, setAgenceWarning] = useState('');
    const [agences, setAgences] = useState([]);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});

    const [formData, setFormData] = useState({
        nom: '',
        email: '',
        password: '',
        role: 'employe',
        agence_id: '',
        actif: true,
    });

    useEffect(() => {
        const loadAgences = async () => {
            setLoadingAgences(true);
            const result = await getAgencesCachedSafe();
            setAgences(result.agences);
            setAgenceServiceAvailable(result.available);

            if (!result.available) {
                setAgenceWarning("Service Agence indisponible. Vous pouvez saisir l'ID agence manuellement.");
            }

            if (result.agences.length > 0) {
                setFormData((prev) => ({
                    ...prev,
                    agence_id: prev.agence_id || String(result.agences[0].id),
                }));
            }

            if (!result.available) {
                setFormData((prev) => ({
                    ...prev,
                    agence_id: prev.agence_id || '1',
                }));
            }

            setLoadingAgences(false);
        };

        loadAgences();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));

        setFieldErrors((prev) => {
            if (!prev[name]) {
                return prev;
            }
            const next = { ...prev };
            delete next[name];
            return next;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMessage('');
        setFieldErrors({});

        if (!formData.agence_id) {
            setFieldErrors({ agence_id: "Selectionnez une agence." });
            setError("Veuillez choisir une agence.");
            setLoading(false);
            return;
        }

        const payload = {
            ...formData,
            agence_id: Number(formData.agence_id),
        };

        try {
            await userService.createUser(payload);
            const message = "Utilisateur cree avec succes.";
            setSuccessMessage(message);
            alert(message);
            navigate('/users');
        } catch (err) {
            const backendMessage = `${err?.response?.data?.message || err?.response?.data?.detail || ''}`.toLowerCase();
            if (backendMessage.includes('agence not found')) {
                setFieldErrors({ agence_id: 'Agence not found' });
                setError('Agence not found');
                alert('Agence not found');
            } else {
                setError(getErrorMessage(err, "Erreur lors de la creation de l'utilisateur."));
            }
        } finally {
            setLoading(false);
        }
    };

    const isSubmitDisabled = loading || loadingAgences;

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Nouvel Utilisateur</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Remplissez les informations pour creer un acces au systeme.
                    </p>
                </div>
                <Link
                    to="/users"
                    className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                >
                    Retour a la liste
                </Link>
            </div>

            <div className="bg-white shadow-sm sm:rounded-xl border border-slate-200">
                <div className="px-4 py-5 sm:p-6">
                    {error && (
                        <div className="mb-4 bg-red-50 p-4 rounded-md border border-red-200">
                            <p className="text-sm font-medium text-red-700">{error}</p>
                        </div>
                    )}
                    {successMessage && (
                        <div className="mb-4 bg-green-50 p-4 rounded-md border border-green-200">
                            <p className="text-sm font-medium text-green-700">{successMessage}</p>
                        </div>
                    )}
                    {agenceWarning && (
                        <div className="mb-4 bg-amber-50 p-4 rounded-md border border-amber-200">
                            <p className="text-sm font-medium text-amber-700">{agenceWarning}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label htmlFor="nom" className="block text-sm font-medium text-slate-700 mb-1">
                                    Nom Complet
                                </label>
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

                            <div className="sm:col-span-1">
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                                    Adresse Email
                                </label>
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

                            <div className="sm:col-span-1">
                                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                                    Mot de passe
                                </label>
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

                            <div className="sm:col-span-1">
                                <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1">
                                    Role Systeme
                                </label>
                                <select
                                    id="role"
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-lg py-2 px-3 border bg-white"
                                >
                                    <option value="employe">Employe</option>
                                    <option value="admin">Administrateur</option>
                                </select>
                            </div>

                            <div className="sm:col-span-1">
                                <label htmlFor="agence_id" className="block text-sm font-medium text-slate-700 mb-1">
                                    Agence
                                </label>
                                {agenceServiceAvailable ? (
                                    <select
                                        id="agence_id"
                                        name="agence_id"
                                        required
                                        value={formData.agence_id}
                                        onChange={handleChange}
                                        disabled={loadingAgences || agences.length === 0}
                                        className={`shadow-sm block w-full sm:text-sm rounded-lg py-2 px-3 border bg-white ${
                                            fieldErrors.agence_id
                                                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                                : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                                        }`}
                                    >
                                        {loadingAgences && (
                                            <option value="">Chargement des agences...</option>
                                        )}
                                        {!loadingAgences && agences.length === 0 && (
                                            <option value="">Aucune agence disponible</option>
                                        )}
                                        {!loadingAgences && agences.length > 0 && agences.map((agence) => (
                                            <option key={agence.id} value={agence.id}>
                                                {agence.nom}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        id="agence_id"
                                        name="agence_id"
                                        type="number"
                                        min="1"
                                        required
                                        value={formData.agence_id}
                                        onChange={handleChange}
                                        placeholder="Saisir ID agence"
                                        className={`shadow-sm block w-full sm:text-sm rounded-lg py-2 px-3 border ${
                                            fieldErrors.agence_id
                                                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                                : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                                        }`}
                                    />
                                )}
                                {fieldErrors.agence_id && (
                                    <p className="mt-1 text-xs text-red-600">{fieldErrors.agence_id}</p>
                                )}
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
                                            Compte actif immediat
                                        </label>
                                        <p className="text-slate-500 mt-1">Activer directement l'acces au systeme pour cet utilisateur.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 flex justify-end space-x-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => navigate('/users')}
                                className="bg-white py-2 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitDisabled}
                                className="inline-flex justify-center flex-shrink-0 py-2 px-6 border border-transparent shadow-md text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? 'Creation en cours...' : 'Creer utilisateur'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateUser;
