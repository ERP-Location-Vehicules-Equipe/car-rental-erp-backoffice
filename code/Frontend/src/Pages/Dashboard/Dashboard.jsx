import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../../Services/authService';
import { getAgenceNameById, getAgencesCachedSafe } from '../../Services/agenceLookupService';

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

const Dashboard = () => {
    const user = authService.getCurrentUser();
    const canManageUsers = authService.canManageUsers();
    const canManageAgences = authService.canManageAgences();
    const [agenceName, setAgenceName] = useState('Chargement...');
    const [agenceWarning, setAgenceWarning] = useState('');

    useEffect(() => {
        const loadAgenceName = async () => {
            if (!user?.agence_id) {
                setAgenceName('-');
                return;
            }

            try {
                const agencesResult = await getAgencesCachedSafe();
                if (!agencesResult.available) {
                    setAgenceWarning("Service Agence indisponible. Affichage du nom d'agence limite.");
                }
                setAgenceName(getAgenceNameById(agencesResult.agences, user.agence_id));
            } catch {
                setAgenceName('Agence inconnue');
            }
        };

        loadAgenceName();
    }, [user?.agence_id]);

    const roleBadge = getRoleBadge(user?.role);

    return (
        <div className="space-y-6">
            {agenceWarning && (
                <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
                    <p className="text-amber-700 text-sm font-medium">{agenceWarning}</p>
                </div>
            )}
            <div className="bg-white shadow-sm overflow-hidden sm:rounded-xl border border-slate-200">
                <div className="px-4 py-5 sm:px-6 bg-slate-50">
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                        Bienvenue sur votre ERP, {user?.nom}
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500">
                        Apercu rapide de votre session.
                    </p>
                </div>
                <div className="border-t border-slate-200 px-4 py-5 sm:p-0">
                    <dl className="sm:divide-y sm:divide-slate-200">
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-slate-500">Role</dt>
                            <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">
                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${roleBadge.className}`}>
                                    {roleBadge.label}
                                </span>
                            </dd>
                        </div>
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-slate-500">Agence</dt>
                            <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{agenceName}</dd>
                        </div>
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-slate-500">Email</dt>
                            <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{user?.email}</dd>
                        </div>
                    </dl>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-slate-200 transition-all hover:shadow-md">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <p className="text-sm font-medium text-slate-500 truncate">Mon Profil</p>
                                <p className="mt-1 text-lg font-semibold text-slate-900">Consulter vos informations</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 px-5 py-3 border-t border-slate-100">
                        <Link to="/profile" className="font-medium text-blue-600 hover:text-blue-800 flex items-center text-sm">
                            Voir le profil complet
                        </Link>
                    </div>
                </div>

                {canManageUsers && (
                    <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-slate-200 transition-all hover:shadow-md">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3">
                                    <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <p className="text-sm font-medium text-slate-500 truncate">Administration</p>
                                    <p className="mt-1 text-lg font-semibold text-slate-900">Gestion des utilisateurs</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100">
                            <Link to="/users" className="font-medium text-purple-600 hover:text-purple-800 flex items-center text-sm">
                                Gerer les acces
                            </Link>
                        </div>
                    </div>
                )}

                {canManageAgences && (
                    <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-slate-200 transition-all hover:shadow-md">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 bg-amber-100 rounded-lg p-3">
                                    <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <p className="text-sm font-medium text-slate-500 truncate">Supervision</p>
                                    <p className="mt-1 text-lg font-semibold text-slate-900">Gestion des agences</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100">
                            <Link to="/agences" className="font-medium text-amber-700 hover:text-amber-800 flex items-center text-sm">
                                Administrer les agences
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
