import React, { useEffect, useState } from 'react';
import userService from '../../Services/userService';

const Profile = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await userService.getProfile();
                setProfile(data);
            } catch (err) {
                setError('Impossible de charger les données du profil.');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 p-4 rounded-md">
                <p className="text-red-700">{error}</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white shadow overflow-hidden sm:rounded-xl border border-slate-200">
                <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl leading-6 font-bold text-slate-900">
                            Profil Utilisateur
                        </h3>
                        <p className="mt-1 max-w-2xl text-sm text-slate-500">
                            Informations personnelles et professionnelles.
                        </p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-full">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                    </div>
                </div>
                <div className="border-t border-slate-200">
                    <dl>
                        <div className="bg-slate-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-slate-500">Nom complet</dt>
                            <dd className="mt-1 text-sm font-semibold text-slate-900 sm:mt-0 sm:col-span-2">{profile?.nom}</dd>
                        </div>
                        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-t border-slate-200">
                            <dt className="text-sm font-medium text-slate-500">Adresse Email</dt>
                            <dd className="mt-1 text-sm font-semibold text-slate-900 sm:mt-0 sm:col-span-2">{profile?.email}</dd>
                        </div>
                        <div className="bg-slate-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-t border-slate-200">
                            <dt className="text-sm font-medium text-slate-500">Rôle au sein du système</dt>
                            <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">
                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${profile?.role === 'admin' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    }`}>
                                    {profile?.role?.toUpperCase()}
                                </span>
                            </dd>
                        </div>
                        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-t border-slate-200">
                            <dt className="text-sm font-medium text-slate-500">ID Succursale / Agence</dt>
                            <dd className="mt-1 text-sm font-semibold text-slate-900 sm:mt-0 sm:col-span-2">{profile?.agence_id}</dd>
                        </div>
                        <div className="bg-slate-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-t border-slate-200">
                            <dt className="text-sm font-medium text-slate-500">Statut du compte</dt>
                            <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2 flex items-center font-semibold">
                                <span className={`h-2.5 w-2.5 rounded-full mr-2 ${profile?.actif ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                {profile?.actif ? 'Compte Actif' : 'Compte Désactivé'}
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>
    );
};

export default Profile;
