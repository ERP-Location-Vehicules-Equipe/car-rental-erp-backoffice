import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import userService from '../../Services/userService';
import { getAgencesCachedSafe } from '../../Services/agenceLookupService';
import { getErrorMessage } from '../../utils/errorHandler';

const EditUser = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [loadingAgences, setLoadingAgences] = useState(true);
    const [agenceServiceAvailable, setAgenceServiceAvailable] = useState(true);
    const [agenceWarning, setAgenceWarning] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [agences, setAgences] = useState([]);

    const [formData, setFormData] = useState({
        nom: '',
        email: '',
        role: 'employe',
        agence_id: '',
        actif: true,
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setLoadingAgences(true);
                setAgenceWarning('');

                const user = await userService.getUserById(id);
                const agencesResult = await getAgencesCachedSafe();
                const safeAgences = agencesResult.agences;

                setAgences(safeAgences);
                setAgenceServiceAvailable(agencesResult.available);

                if (!agencesResult.available) {
                    setAgenceWarning("Service Agence indisponible. Vous pouvez modifier l'ID agence manuellement.");
                }

                const agenceExists = safeAgences.some((agence) => Number(agence.id) === Number(user.agence_id));
                const fallbackAgenceId = safeAgences[0] ? String(safeAgences[0].id) : String(user.agence_id || 1);

                setFormData({
                    nom: user.nom || '',
                    email: user.email || '',
                    role: user.role || 'employe',
                    agence_id: agencesResult.available
                        ? (agenceExists ? String(user.agence_id) : fallbackAgenceId)
                        : String(user.agence_id || 1),
                    actif: Boolean(user.actif),
                });
            } catch (err) {
                setError(getErrorMessage(err, "Impossible de recuperer les informations de l'utilisateur."));
            } finally {
                setLoading(false);
                setLoadingAgences(false);
            }
        };

        fetchData();
    }, [id]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            await userService.updateUser(id, {
                ...formData,
                agence_id: Number(formData.agence_id),
            });
            navigate('/users');
        } catch (err) {
            setError(getErrorMessage(err, "Erreur lors de la mise a jour de l'utilisateur."));
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
                    <h2 className="text-2xl font-bold text-slate-900">Editer l'utilisateur</h2>
                    <p className="mt-1 text-sm text-slate-500">Modification des informations du compte.</p>
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
                    {agenceWarning && (
                        <div className="mb-4 bg-amber-50 p-4 rounded-md border border-amber-200">
                            <p className="text-sm font-medium text-amber-700">{agenceWarning}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label htmlFor="nom" className="block text-sm font-medium text-slate-700 mb-1">Nom Complet</label>
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
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Adresse Email</label>
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
                                <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1">Role Systeme</label>
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
                                <label htmlFor="agence_id" className="block text-sm font-medium text-slate-700 mb-1">Agence</label>
                                {agenceServiceAvailable ? (
                                    <select
                                        id="agence_id"
                                        name="agence_id"
                                        required
                                        value={formData.agence_id}
                                        onChange={handleChange}
                                        disabled={loadingAgences || agences.length === 0}
                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-lg py-2 px-3 border bg-white"
                                    >
                                        {loadingAgences && <option value="">Chargement des agences...</option>}
                                        {!loadingAgences && agences.length === 0 && <option value="">Aucune agence disponible</option>}
                                        {!loadingAgences && agences.map((agence) => (
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
                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-lg py-2 px-3 border"
                                    />
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
                                        <label htmlFor="actif" className="font-bold text-slate-700 cursor-pointer">Compte actif</label>
                                        <p className="text-slate-500 mt-1">Activer ou desactiver l'acces au systeme pour cet utilisateur.</p>
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
                                disabled={saving || loadingAgences}
                                className="inline-flex justify-center flex-shrink-0 py-2 px-6 border border-transparent shadow-md text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
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
