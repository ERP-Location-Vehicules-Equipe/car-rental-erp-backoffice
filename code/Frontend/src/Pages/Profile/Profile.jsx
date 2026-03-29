import React, { useEffect, useState } from 'react';
import userService from '../../Services/userService';
import authService from '../../Services/authService';
import { getAgencesCachedSafe, getAgenceNameById } from '../../Services/agenceLookupService';
import { getErrorMessage } from '../../utils/errorHandler';

const getRoleBadge = (role) => {
    if (role === authService.ROLE_SUPER_ADMIN) {
        return {
            label: 'SUPER ADMIN',
            className: 'bg-amber-100 text-amber-800 border border-amber-200',
        };
    }
    if (role === authService.ROLE_ADMIN) {
        return {
            label: 'ADMIN',
            className: 'bg-purple-100 text-purple-800 border border-purple-200',
        };
    }
    return {
        label: 'EMPLOYE',
        className: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    };
};

const Profile = () => {
    const [profile, setProfile] = useState(null);
    const [agenceName, setAgenceName] = useState('-');
    const [agenceWarning, setAgenceWarning] = useState('');
    const [loading, setLoading] = useState(true);
    const [globalError, setGlobalError] = useState('');

    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editFormData, setEditFormData] = useState({ nom: '', email: '' });
    const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
    const [savingProfile, setSavingProfile] = useState(false);

    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordFormData, setPasswordFormData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: '',
    });
    const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
    const [savingPassword, setSavingPassword] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const data = await userService.getProfile();
            setProfile(data);
            setEditFormData({ nom: data.nom, email: data.email });

            if (data?.agence_id) {
                const agencesResult = await getAgencesCachedSafe();
                if (!agencesResult.available) {
                    setAgenceWarning("Service Agence indisponible. Le nom de l'agence peut etre indisponible.");
                }
                setAgenceName(getAgenceNameById(agencesResult.agences, data.agence_id));
            } else {
                setAgenceName('-');
            }
        } catch (err) {
            setGlobalError(getErrorMessage(err, 'Impossible de charger les donnees du profil.'));
        } finally {
            setLoading(false);
        }
    };

    const handleEditChange = (e) => {
        setEditFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setProfileMessage({ type: '', text: '' });
        setSavingProfile(true);

        try {
            const updatedUser = await userService.updateMyProfile({
                nom: editFormData.nom,
                email: editFormData.email,
            });
            setProfile(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setProfileMessage({ type: 'success', text: 'Profil mis a jour avec succes.' });
            setTimeout(() => setIsEditingProfile(false), 1200);
        } catch (error) {
            setProfileMessage({
                type: 'error',
                text: getErrorMessage(error, 'Erreur lors de la mise a jour du profil.'),
            });
        } finally {
            setSavingProfile(false);
        }
    };

    const handlePasswordChange = (e) => {
        setPasswordFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordMessage({ type: '', text: '' });

        if (passwordFormData.new_password !== passwordFormData.confirm_password) {
            setPasswordMessage({ type: 'error', text: 'Les nouveaux mots de passe ne correspondent pas.' });
            return;
        }

        if (passwordFormData.new_password.length < 6) {
            setPasswordMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caracteres.' });
            return;
        }

        setSavingPassword(true);
        try {
            await authService.resetPassword(profile.email, passwordFormData.new_password);
            setPasswordMessage({ type: 'success', text: 'Mot de passe modifie avec succes.' });
            setPasswordFormData({ current_password: '', new_password: '', confirm_password: '' });
            setTimeout(() => setIsChangingPassword(false), 1200);
        } catch (error) {
            setPasswordMessage({
                type: 'error',
                text: getErrorMessage(error, 'Erreur lors de la modification du mot de passe.'),
            });
        } finally {
            setSavingPassword(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (globalError) {
        return (
            <div className="bg-red-50 p-4 rounded-md border border-red-200">
                <p className="text-red-700">{globalError}</p>
            </div>
        );
    }

    const roleBadge = getRoleBadge(profile?.role);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white shadow overflow-hidden sm:rounded-xl border border-slate-200">
                <div className="px-4 py-5 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white">
                    <div>
                        <h3 className="text-xl leading-6 font-bold text-slate-900">Profil Utilisateur</h3>
                        <p className="mt-1 text-sm text-slate-500">Gerez vos informations personnelles et la securite.</p>
                    </div>
                    <div className="mt-4 sm:mt-0 flex flex-wrap gap-2">
                        <button
                            onClick={() => {
                                setIsEditingProfile((prev) => !prev);
                                setIsChangingPassword(false);
                            }}
                            className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
                        >
                            {isEditingProfile ? 'Annuler' : 'Mettre a jour le profil'}
                        </button>
                        <button
                            onClick={() => {
                                setIsChangingPassword((prev) => !prev);
                                setIsEditingProfile(false);
                            }}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-800 hover:bg-slate-700"
                        >
                            {isChangingPassword ? 'Annuler' : 'Changer le mot de passe'}
                        </button>
                    </div>
                </div>

                <div className="border-t border-slate-200">
                    {agenceWarning && (
                        <div className="m-6 mb-0 bg-amber-50 p-4 rounded-md border border-amber-200">
                            <p className="text-sm font-medium text-amber-700">{agenceWarning}</p>
                        </div>
                    )}
                    {isEditingProfile ? (
                        <div className="p-6 bg-slate-50">
                            {profileMessage.text && (
                                <div className={`mb-4 p-3 rounded-md ${
                                    profileMessage.type === 'error'
                                        ? 'bg-red-50 text-red-700 border border-red-200'
                                        : 'bg-green-50 text-green-700 border border-green-200'
                                }`}>
                                    {profileMessage.text}
                                </div>
                            )}
                            <form onSubmit={handleEditSubmit} className="space-y-4 max-w-xl">
                                <div>
                                    <label htmlFor="nom" className="block text-sm font-medium text-slate-700">Nom Complet</label>
                                    <input
                                        type="text"
                                        name="nom"
                                        id="nom"
                                        value={editFormData.nom}
                                        onChange={handleEditChange}
                                        className="mt-1 block w-full sm:text-sm border-slate-300 rounded-md py-2 px-3 border"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-slate-700">Adresse Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        id="email"
                                        value={editFormData.email}
                                        onChange={handleEditChange}
                                        className="mt-1 block w-full sm:text-sm border-slate-300 rounded-md py-2 px-3 border"
                                        required
                                    />
                                </div>
                                <div className="pt-2 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={savingProfile}
                                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                                    >
                                        {savingProfile ? 'Enregistrement...' : 'Sauvegarder'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : isChangingPassword ? (
                        <div className="p-6 bg-slate-50">
                            {passwordMessage.text && (
                                <div className={`mb-4 p-3 rounded-md ${
                                    passwordMessage.type === 'error'
                                        ? 'bg-red-50 text-red-700 border border-red-200'
                                        : 'bg-green-50 text-green-700 border border-green-200'
                                }`}>
                                    {passwordMessage.text}
                                </div>
                            )}
                            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-xl">
                                <div>
                                    <label htmlFor="current_password" className="block text-sm font-medium text-slate-700">Mot de passe actuel</label>
                                    <input
                                        type="password"
                                        name="current_password"
                                        id="current_password"
                                        value={passwordFormData.current_password}
                                        onChange={handlePasswordChange}
                                        className="mt-1 block w-full sm:text-sm border-slate-300 rounded-md py-2 px-3 border"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="new_password" className="block text-sm font-medium text-slate-700">Nouveau mot de passe</label>
                                    <input
                                        type="password"
                                        name="new_password"
                                        id="new_password"
                                        value={passwordFormData.new_password}
                                        onChange={handlePasswordChange}
                                        className="mt-1 block w-full sm:text-sm border-slate-300 rounded-md py-2 px-3 border"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="confirm_password" className="block text-sm font-medium text-slate-700">Confirmer le mot de passe</label>
                                    <input
                                        type="password"
                                        name="confirm_password"
                                        id="confirm_password"
                                        value={passwordFormData.confirm_password}
                                        onChange={handlePasswordChange}
                                        className="mt-1 block w-full sm:text-sm border-slate-300 rounded-md py-2 px-3 border"
                                        required
                                    />
                                </div>
                                <div className="pt-2 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={savingPassword}
                                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-800 hover:bg-slate-900"
                                    >
                                        {savingPassword ? 'Traitement...' : 'Valider'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <dl className="divide-y divide-slate-100">
                            <div className="bg-slate-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm font-medium text-slate-500">Nom complet</dt>
                                <dd className="mt-1 text-sm font-semibold text-slate-900 sm:mt-0 sm:col-span-2">{profile?.nom}</dd>
                            </div>
                            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-t border-slate-100">
                                <dt className="text-sm font-medium text-slate-500">Email</dt>
                                <dd className="mt-1 text-sm font-semibold text-slate-900 sm:mt-0 sm:col-span-2">{profile?.email}</dd>
                            </div>
                            <div className="bg-slate-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-t border-slate-100">
                                <dt className="text-sm font-medium text-slate-500">Role</dt>
                                <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">
                                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${roleBadge.className}`}>
                                        {roleBadge.label}
                                    </span>
                                </dd>
                            </div>
                            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-t border-slate-100">
                                <dt className="text-sm font-medium text-slate-500">Agence</dt>
                                <dd className="mt-1 text-sm font-semibold text-slate-900 sm:mt-0 sm:col-span-2">{agenceName}</dd>
                            </div>
                        </dl>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
