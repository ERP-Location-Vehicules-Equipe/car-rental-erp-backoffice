import React from 'react';
import { Link } from 'react-router-dom';
import authService from '../../Services/authService';

const Dashboard = () => {
    const user = authService.getCurrentUser();
    const isAdmin = authService.isAdmin();

    return (
        <div className="space-y-6">
            <div className="bg-white shadow-sm overflow-hidden sm:rounded-xl border border-slate-200">
                <div className="px-4 py-5 sm:px-6 bg-slate-50">
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                        Bienvenue sur votre ERP, {user?.nom}
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500">
                        Aperçu rapide de vos informations de session et autorisations.
                    </p>
                </div>
                <div className="border-t border-slate-200 px-4 py-5 sm:p-0">
                    <dl className="sm:divide-y sm:divide-slate-200">
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-slate-500">Rôle de l'utilisateur</dt>
                            <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">
                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${isAdmin ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    }`}>
                                    {user?.role?.toUpperCase()}
                                </span>
                            </dd>
                        </div>
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-slate-500">Agence (ID)</dt>
                            <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{user?.agence_id}</dd>
                        </div>
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-slate-500">Adresse Email</dt>
                            <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{user?.email}</dd>
                        </div>
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-slate-500">Statut du compte</dt>
                            <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">
                                <div className="flex items-center">
                                    <div className={`h-2.5 w-2.5 rounded-full mr-2 ${user?.actif ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                    {user?.actif ? 'Actif' : 'Inactif (Désactivé)'}
                                </div>
                            </dd>
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
                                <dl>
                                    <dt className="text-sm font-medium text-slate-500 truncate">
                                        Mon Profil
                                    </dt>
                                    <dd className="mt-1 text-lg font-semibold text-slate-900">
                                        Consulter vos informations
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 px-5 py-3 border-t border-slate-100">
                        <div className="text-sm">
                            <Link to="/profile" className="font-medium text-blue-600 hover:text-blue-800 flex items-center">
                                Voir le profil complet
                                <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </div>
                    </div>
                </div>

                {isAdmin && (
                    <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-slate-200 transition-all hover:shadow-md">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3">
                                    <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-slate-500 truncate">
                                            Administration
                                        </dt>
                                        <dd className="mt-1 text-lg font-semibold text-slate-900">
                                            Gestion des utilisateurs
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100">
                            <div className="text-sm">
                                <Link to="/users" className="font-medium text-purple-600 hover:text-purple-800 flex items-center">
                                    Gérer les accès
                                    <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
