import React, { useEffect, useState } from 'react';
import userService from '../../Services/userService';
import authService from '../../Services/authService';
import { getErrorMessage } from '../../utils/errorHandler';

const Profile = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [globalError, setGlobalError] = useState('');

    // États pour l'édition de profil
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editFormData, setEditFormData] = useState({ nom: '', email: '' });
    const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
    const [savingProfile, setSavingProfile] = useState(false);

    // États pour le changement de mot de passe
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordFormData, setPasswordFormData] = useState({ current_password: '', new_password: '', confirm_password: '' });
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
        } catch (err) {
            setGlobalError(getErrorMessage(err, 'Impossible de charger les données du profil.'));
        } finally {
            setLoading(false);
        }
    };

    // Gestionnaires de formulaires (Update Profile)
    const handleEditChange = (e) => {
        setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setProfileMessage({ type: '', text: '' });
        setSavingProfile(true);

        try {
            // Appel de la route spécifique au profil
            const updateData = {
                nom: editFormData.nom,
                email: editFormData.email
            };

            const updatedUser = await userService.updateMyProfile(updateData);
            setProfile(updatedUser);
            setProfileMessage({ type: 'success', text: 'Profil mis à jour avec succès.' });
            setTimeout(() => setIsEditingProfile(false), 2000);

            // Mettre à jour le localStorage si nécessaire
            localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (error) {
            setProfileMessage({
                type: 'error',
                text: getErrorMessage(error, 'Erreur lors de la mise à jour du profil.')
            });
        } finally {
            setSavingProfile(false);
        }
    };

    // Gestionnaires de formulaires (Change Password)
    const handlePasswordChange = (e) => {
        setPasswordFormData({ ...passwordFormData, [e.target.name]: e.target.value });
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordMessage({ type: '', text: '' });

        if (passwordFormData.new_password !== passwordFormData.confirm_password) {
            setPasswordMessage({ type: 'error', text: 'Les nouveaux mots de passe ne correspondent pas.' });
            return;
        }

        if (passwordFormData.new_password.length < 6) {
            setPasswordMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères.' });
            return;
        }

        setSavingPassword(true);

        try {
            // Appel du service : la route backend attend email et new_password
            await authService.resetPassword(profile.email, passwordFormData.new_password);
            setPasswordMessage({ type: 'success', text: 'Mot de passe modifié avec succès.' });
            setPasswordFormData({ current_password: '', new_password: '', confirm_password: '' });
            setTimeout(() => setIsChangingPassword(false), 2000);
        } catch (error) {
            setPasswordMessage({
                type: 'error',
                text: getErrorMessage(error, 'Une erreur est survenue lors de la modification du mot de passe.')
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
            <div className="bg-red-50 p-4 rounded-md">
                <p className="text-red-700">{globalError}</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">

            <div className="bg-white shadow overflow-hidden sm:rounded-xl border border-slate-200">
                {/* Header Profil */}
                <div className="px-4 py-5 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white">
                    <div className="flex items-center space-x-4">
                        <div className="bg-blue-100 p-4 rounded-full shadow-sm border border-blue-200">
                            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-xl leading-6 font-bold text-slate-900 tracking-tight">
                                Profil Utilisateur
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Gérez vos informations personnelles et paramètres de sécurité.
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 sm:mt-0 flex flex-wrap gap-2">
                        <button
                            onClick={() => {
                                setIsEditingProfile(!isEditingProfile);
                                setIsChangingPassword(false);
                            }}
                            className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                            {isEditingProfile ? 'Annuler' : 'Mettre à jour le profil'}
                        </button>
                        <button
                            onClick={() => {
                                setIsChangingPassword(!isChangingPassword);
                                setIsEditingProfile(false);
                            }}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors"
                        >
                            {isChangingPassword ? 'Annuler' : 'Changer le mot de passe'}
                        </button>
                    </div>
                </div>

                {/* Section Affichage / Edition Profil */}
                <div className="border-t border-slate-200">

                    {isEditingProfile ? (
                        <div className="p-6 bg-slate-50">
                            <h4 className="text-lg font-medium text-slate-900 mb-4 border-b pb-2">Modifier les informations</h4>

                            {profileMessage.text && (
                                <div className={`mb-4 p-3 rounded-md ${profileMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
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
                                        className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md py-2 px-3 border"
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
                                        className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md py-2 px-3 border"
                                        required
                                    />
                                </div>
                                <div className="pt-2 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={savingProfile}
                                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {savingProfile ? 'Enregistrement...' : 'Sauvegarder les modifications'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : isChangingPassword ? (
                        <div className="p-6 bg-slate-50">
                            <h4 className="text-lg font-medium text-slate-900 mb-4 border-b pb-2">Sécurité du compte</h4>

                            {passwordMessage.text && (
                                <div className={`mb-4 p-3 rounded-md ${passwordMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                                    {passwordMessage.text}
                                </div>
                            )}

                            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-xl">
                                <div>
                                    <label htmlFor="current_password" className="block text-sm font-medium text-slate-700">
                                        Mot de passe actuel
                                    </label>
                                    <input
                                        type="password"
                                        name="current_password"
                                        id="current_password"
                                        value={passwordFormData.current_password}
                                        onChange={handlePasswordChange}
                                        placeholder="Saisissez votre mot de passe actuel"
                                        className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md py-2 px-3 border"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="new_password" className="block text-sm font-medium text-slate-700">
                                        Nouveau mot de passe
                                    </label>
                                    <input
                                        type="password"
                                        name="new_password"
                                        id="new_password"
                                        value={passwordFormData.new_password}
                                        onChange={handlePasswordChange}
                                        placeholder="Nouveau mot de passe (min 6 caractères)"
                                        className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md py-2 px-3 border"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="confirm_password" className="block text-sm font-medium text-slate-700">
                                        Confirmer le nouveau mot de passe
                                    </label>
                                    <input
                                        type="password"
                                        name="confirm_password"
                                        id="confirm_password"
                                        value={passwordFormData.confirm_password}
                                        onChange={handlePasswordChange}
                                        placeholder="Confirmez le nouveau mot de passe"
                                        className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md py-2 px-3 border"
                                        required
                                    />
                                </div>
                                <div className="pt-2 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={savingPassword}
                                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-800 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500"
                                    >
                                        {savingPassword ? 'Traitement...' : 'Valider le changement'}
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
                                <dt className="text-sm font-medium text-slate-500">Adresse Email</dt>
                                <dd className="mt-1 text-sm font-semibold text-slate-900 sm:mt-0 sm:col-span-2">{profile?.email}</dd>
                            </div>
                            <div className="bg-slate-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-t border-slate-100">
                                <dt className="text-sm font-medium text-slate-500">Rôle au sein du système</dt>
                                <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">
                                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${profile?.role === 'admin' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                        }`}>
                                        {profile?.role?.toUpperCase()}
                                    </span>
                                </dd>
                            </div>
                            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-t border-slate-100">
                                <dt className="text-sm font-medium text-slate-500">ID Succursale / Agence</dt>
                                <dd className="mt-1 text-sm font-semibold text-slate-900 sm:mt-0 sm:col-span-2">{profile?.agence_id}</dd>
                            </div>
                            <div className="bg-slate-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-t border-slate-100">
                                <dt className="text-sm font-medium text-slate-500">Statut du compte</dt>
                                <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2 flex items-center font-semibold">
                                    <span className={`h-2.5 w-2.5 rounded-full mr-2 shadow-sm border border-slate-200 ${profile?.actif ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                    {profile?.actif ? 'Compte Actif' : 'Compte Désactivé'}
                                </dd>
                            </div>
                        </dl>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
