import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import userService from '../../Services/userService';
import { getAgencesCached, getAgenceNameById } from '../../Services/agenceLookupService';
import { getErrorMessage } from '../../utils/errorHandler';

const UserDetail = () => {
    const { id } = useParams();
    const [user, setUser] = useState(null);
    const [agenceName, setAgenceName] = useState('Agence inconnue');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const data = await userService.getUserById(id);
                setUser(data);

                try {
                    const agences = await getAgencesCached();
                    setAgenceName(getAgenceNameById(agences, data.agence_id));
                } catch {
                    setAgenceName('Agence inconnue');
                }
            } catch (err) {
                setError(getErrorMessage(err, "Impossible de recuperer les informations de l'utilisateur."));
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [id]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="bg-red-50 p-4 rounded-md border border-red-200">
                    <p className="text-sm font-medium text-red-700">{error || 'Utilisateur introuvable'}</p>
                </div>
                <div className="mt-4">
                    <Link to="/users" className="text-blue-600 hover:text-blue-800 font-medium">
                        &larr; Retour a la liste
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        Fiche Utilisateur
                        <span className={`px-2 py-0.5 ml-2 text-xs rounded-full ${user.actif ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                            {user.actif ? 'Actif' : 'Desactive'}
                        </span>
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Visualisation des informations completes du compte.
                    </p>
                </div>
                <div className="flex space-x-3">
                    <Link
                        to="/users"
                        className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                    >
                        Retour
                    </Link>
                    <Link
                        to={`/users/edit/${user.id}`}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-all"
                    >
                        Modifier
                    </Link>
                </div>
            </div>

            <div className="bg-white shadow-sm sm:rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-6 sm:p-8 bg-slate-50 border-b border-slate-200 flex items-center space-x-5">
                    <div className="flex-shrink-0 h-16 w-16">
                        <span className="h-16 w-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-2xl border border-slate-300 shadow-sm">
                            {user.nom.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900">{user.nom}</h3>
                        <p className="text-slate-500 font-medium">{user.email}</p>
                    </div>
                </div>

                <div className="px-6 py-6 sm:p-8">
                    <h4 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">Details d'acces</h4>
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                        <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-slate-500">ID Systeme</dt>
                            <dd className="mt-1 text-sm text-slate-900 bg-slate-50 p-2 rounded border border-slate-100 font-mono">#{user.id}</dd>
                        </div>
                        <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-slate-500">Agence</dt>
                            <dd className="mt-1 text-sm font-semibold text-slate-900 bg-slate-50 p-2 rounded border border-slate-100">{agenceName}</dd>
                        </div>
                        <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-slate-500">Role d'administration</dt>
                            <dd className="mt-1 text-sm text-slate-900 bg-slate-50 p-2 rounded border border-slate-100 flex items-center">
                                <span className={`inline-flex items-center justify-center h-2 w-2 rounded-full mr-2 ${user.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'}`}></span>
                                {user.role === 'admin' ? 'Administrateur complet' : 'Employe standard'}
                            </dd>
                        </div>
                        <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-slate-500">Statut de connexion</dt>
                            <dd className="mt-1 text-sm text-slate-900 bg-slate-50 p-2 rounded border border-slate-100">
                                {user.actif ? 'Autorise a se connecter' : 'Connexion bloquee'}
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>
    );
};

export default UserDetail;
