import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import userService from '../../Services/userService';
import { getAgencesCachedSafe, getAgenceNameById } from '../../Services/agenceLookupService';
import { getErrorMessage } from '../../utils/errorHandler';

const UsersList = () => {
    const [users, setUsers] = useState([]);
    const [agences, setAgences] = useState([]);
    const [agenceWarning, setAgenceWarning] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchUsersAndOptionalAgences = async () => {
        try {
            setLoading(true);
            setError('');
            setAgenceWarning('');

            const usersData = await userService.getAllUsers();
            setUsers(Array.isArray(usersData) ? usersData : []);

            const agencesResult = await getAgencesCachedSafe();
            setAgences(agencesResult.agences);

            if (!agencesResult.available) {
                setAgenceWarning("Service Agence indisponible pour le moment. Les noms des agences peuvent etre incomplets.");
            }
        } catch (err) {
            setError(getErrorMessage(err, 'Erreur lors du chargement des utilisateurs.'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsersAndOptionalAgences();
    }, []);

    const agenceNameMap = useMemo(() => {
        const map = {};
        agences.forEach((agence) => {
            map[Number(agence.id)] = agence.nom;
        });
        return map;
    }, [agences]);

    const handleToggleStatus = async (user) => {
        try {
            if (user.actif) {
                await userService.disableUser(user.id);
            } else {
                await userService.enableUser(user.id);
            }
            setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, actif: !user.actif } : u)));
        } catch (err) {
            alert(getErrorMessage(err, "Erreur lors du changement de statut."));
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Etes-vous sur de vouloir supprimer cet utilisateur ?")) {
            try {
                await userService.deleteUser(id);
                setUsers((prev) => prev.filter((u) => u.id !== id));
            } catch (err) {
                alert(getErrorMessage(err, "Erreur lors de la suppression."));
            }
        }
    };

    if (loading && users.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Utilisateurs</h2>
                    <p className="mt-1 text-sm text-slate-500">Gerez les acces, roles et statuts.</p>
                </div>
                <div className="mt-4 sm:mt-0">
                    <Link
                        to="/users/create"
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                        Ajouter un utilisateur
                    </Link>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 p-4 rounded-md border border-red-200">
                    <p className="text-red-700 text-sm font-medium">{error}</p>
                </div>
            )}
            {agenceWarning && (
                <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
                    <p className="text-amber-700 text-sm font-medium">{agenceWarning}</p>
                </div>
            )}

            <div className="shadow overflow-hidden border-b border-slate-200 sm:rounded-lg">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Utilisateur
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Agence
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Role
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Statut
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-bold text-slate-900">{user.nom}</div>
                                    <div className="text-sm text-slate-500">{user.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                                    {agenceNameMap[Number(user.agence_id)] || getAgenceNameById(agences, user.agence_id)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        user.role === 'admin'
                                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        user.actif
                                            ? 'bg-green-100 text-green-800 border border-green-200'
                                            : 'bg-red-100 text-red-800 border border-red-200'
                                    }`}>
                                        {user.actif ? 'Actif' : 'Desactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                    <Link to={`/users/${user.id}`} className="text-slate-700 hover:text-slate-900">
                                        Details
                                    </Link>
                                    <Link to={`/users/edit/${user.id}`} className="text-blue-600 hover:text-blue-900">
                                        Modifier
                                    </Link>
                                    <button
                                        onClick={() => handleToggleStatus(user)}
                                        className={`${user.actif ? 'text-orange-600 hover:text-orange-900' : 'text-emerald-600 hover:text-emerald-900'} transition-colors`}
                                    >
                                        {user.actif ? 'Desactiver' : 'Activer'}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(user.id)}
                                        className="text-red-600 hover:text-red-900 transition-colors"
                                    >
                                        Supprimer
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && !loading && (
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-sm text-slate-500">
                                    Aucun utilisateur trouve.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UsersList;
