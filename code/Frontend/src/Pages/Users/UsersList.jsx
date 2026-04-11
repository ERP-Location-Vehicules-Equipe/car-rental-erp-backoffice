import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../../Services/authService';
import userService from '../../Services/userService';
import { getAgencesCachedSafe, getAgenceNameById } from '../../Services/agenceLookupService';
import { getErrorMessage } from '../../utils/errorHandler';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const getRoleBadge = (role) => {
    if (role === 'super_admin') {
        return 'bg-amber-100 text-amber-800 border border-amber-200';
    }
    if (role === 'admin') {
        return 'bg-purple-100 text-purple-800 border border-purple-200';
    }
    return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
};

const toDateOnly = (value) => {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    return date.toISOString().slice(0, 10);
};

const UsersList = () => {
    const isSuperAdmin = authService.isSuperAdmin();
    const [users, setUsers] = useState([]);
    const [agences, setAgences] = useState([]);
    const [agenceWarning, setAgenceWarning] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [userToDelete, setUserToDelete] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
        from: '',
        to: '',
    });

    const fetchUsersAndOptionalAgences = async () => {
        try {
            setLoading(true);
            setError('');
            setAgenceWarning('');

            const usersData = await userService.getAllUsers();
            setUsers(Array.isArray(usersData) ? usersData : []);

            const agencesResult = await getAgencesCachedSafe(isSuperAdmin);
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
    }, [isSuperAdmin]);

    const agenceNameMap = useMemo(() => {
        const map = {};
        agences.forEach((agence) => {
            map[Number(agence.id)] = agence.nom;
        });
        return map;
    }, [agences]);

    const filteredUsers = useMemo(() => {
        const query = filters.search.trim().toLowerCase();
        const from = filters.from;
        const to = filters.to;
        return users.filter((user) => {
            const dateOnly = toDateOnly(user.created_at);
            const matchFrom = !from || (dateOnly && dateOnly >= from);
            const matchTo = !to || (dateOnly && dateOnly <= to);
            if (!matchFrom || !matchTo) {
                return false;
            }
            if (!query) {
                return true;
            }
            return [
                user.nom,
                user.email,
                user.role,
                agenceNameMap[Number(user.agence_id)] || '',
            ].some((value) => String(value || '').toLowerCase().includes(query));
        });
    }, [agenceNameMap, filters.from, filters.search, filters.to, users]);

    const handleToggleStatus = async (user) => {
        try {
            if (user.actif) {
                await userService.disableUser(user.id);
            } else {
                await userService.enableUser(user.id);
            }
            setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, actif: !user.actif } : u)));
        } catch (err) {
            setError(getErrorMessage(err, "Erreur lors du changement de statut."));
        }
    };

    const handleDelete = async (id) => {
        try {
            await userService.deleteUser(id);
            setUsers((prev) => prev.filter((u) => u.id !== id));
        } catch (err) {
            setError(getErrorMessage(err, "Erreur lors de la suppression."));
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="text-xs font-semibold text-slate-600">
                    Recherche
                    <input
                        value={filters.search}
                        onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                        placeholder="Nom, email, role, agence..."
                    />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                    Date creation du
                    <input
                        type="date"
                        value={filters.from}
                        onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                    />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                    Date creation au
                    <input
                        type="date"
                        value={filters.to}
                        onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                    />
                </label>
            </div>

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
                        {filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-bold text-slate-900">{user.nom}</div>
                                    <div className="text-sm text-slate-500">{user.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                                    {agenceNameMap[Number(user.agence_id)] || getAgenceNameById(agences, user.agence_id)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadge(user.role)}`}>
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
                                        onClick={() => setUserToDelete(user)}
                                        className="text-red-600 hover:text-red-900 transition-colors"
                                    >
                                        Supprimer
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredUsers.length === 0 && !loading && (
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-sm text-slate-500">
                                    Aucun utilisateur trouve.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <ConfirmDialog
                open={Boolean(userToDelete)}
                title="Confirmation de suppression"
                message={userToDelete ? `Supprimer l'utilisateur ${userToDelete.nom} ?` : 'Supprimer cet utilisateur ?'}
                confirmLabel="Supprimer"
                onCancel={() => setUserToDelete(null)}
                onConfirm={async () => {
                    if (!userToDelete) {
                        return;
                    }
                    await handleDelete(userToDelete.id);
                    setUserToDelete(null);
                }}
            />
        </div>
    );
};

export default UsersList;
