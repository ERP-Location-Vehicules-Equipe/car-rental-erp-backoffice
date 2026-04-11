import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import authService from '../../Services/authService';
import { getAgenceNameById, getAgencesCachedSafe } from '../../Services/agenceLookupService';
import userService from '../../Services/userService';
import { getErrorMessage } from '../../utils/errorHandler';

const EditUser = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isSuperAdmin = authService.isSuperAdmin();
    const isAdmin = authService.isAdmin();

    const [loading, setLoading] = useState(true);
    const [loadingAgences, setLoadingAgences] = useState(true);
    const [agenceServiceAvailable, setAgenceServiceAvailable] = useState(true);
    const [agenceWarning, setAgenceWarning] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [agences, setAgences] = useState([]);
    const [originalUser, setOriginalUser] = useState(null);

    const [formData, setFormData] = useState({
        nom: '',
        email: '',
        role: 'employe',
        agence_id: '',
        actif: true,
    });

    const agenceDisplayName = useMemo(
        () => {
            const resolved = getAgenceNameById(agences, formData.agence_id);
            if (resolved === 'Agence inconnue' && formData.agence_id) {
                return `Agence #${formData.agence_id}`;
            }
            return resolved;
        },
        [agences, formData.agence_id]
    );

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setLoadingAgences(true);
                setAgenceWarning('');

                const user = await userService.getUserById(id);
                setOriginalUser(user);

                const agencesResult = await getAgencesCachedSafe(isSuperAdmin);
                const safeAgences = agencesResult.agences;
                setAgences(safeAgences);
                setAgenceServiceAvailable(agencesResult.available);

                if (!agencesResult.available) {
                    if (isSuperAdmin) {
                        setAgenceWarning("Service Agence indisponible. Saisissez l'ID agence manuellement.");
                    } else {
                        setAgenceWarning("Service Agence indisponible. Vous pouvez modifier uniquement les champs autorises.");
                    }
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
    }, [id, isSuperAdmin]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        // Admin: role/agence verrouilles par policy backend.
        if (isAdmin && (name === 'role' || name === 'agence_id')) {
            return;
        }

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
            // Payload conforme aux regles backend:
            // - admin: role/agence conserves
            // - super_admin: role/agence modifiables (admin ou employe)
            const payload = {
                nom: formData.nom.trim(),
                email: formData.email.trim(),
                role: isSuperAdmin ? formData.role : originalUser?.role,
                agence_id: isSuperAdmin ? Number(formData.agence_id) : Number(originalUser?.agence_id),
                actif: Boolean(formData.actif),
            };

            await userService.updateUser(id, payload);
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
                                <label htmlFor="nom" className="block text-sm font-medium text-slate-700 mb-1">Nom complet</label>
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
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Adresse email</label>
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
                                <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1">Role systeme</label>
                                <select
                                    id="role"
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    disabled={!isSuperAdmin}
                                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-lg py-2 px-3 border bg-white disabled:bg-slate-100 disabled:text-slate-500"
                                >
                                    <option value="employe">Employe</option>
                                    <option value="admin">Administrateur</option>
                                </select>
                                {!isSuperAdmin && (
                                    <p className="mt-1 text-xs text-slate-500">Un admin ne peut pas changer le role.</p>
                                )}
                            </div>

                            <div className="sm:col-span-1">
                                <label htmlFor="agence_id" className="block text-sm font-medium text-slate-700 mb-1">Agence</label>
                                {isSuperAdmin ? (
                                    agenceServiceAvailable ? (
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
                                    )
                                ) : (
                                    <input
                                        id="agence_admin_display"
                                        type="text"
                                        readOnly
                                        value={agenceDisplayName}
                                        className="shadow-sm block w-full sm:text-sm rounded-lg py-2 px-3 border border-slate-300 bg-slate-100 text-slate-600"
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
