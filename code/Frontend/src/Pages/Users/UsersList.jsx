import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import userService from '../../Services/userService';

const UsersList = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await userService.getAllUsers();
            setUsers(data);
        } catch (err) {
            setError('Erreur lors du chargement des utilisateurs. Vérifiez que vous avez les droits administrateur.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleToggleStatus = async (user) => {
        try {
            if (user.actif) {
                await userService.disableUser(user.id);
            } else {
                await userService.enableUser(user.id);
            }
            setUsers(users.map(u => u.id === user.id ? { ...u, actif: !user.actif } : u));
        } catch (err) {
            alert("Erreur lors du changement de statut.");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette liste gère l'accès de votre personnel.")) {
            try {
                await userService.deleteUser(id);
                setUsers(users.filter(u => u.id !== id));
            } catch (err) {
                alert("Erreur lors de la suppression.");
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
                    <p className="mt-1 text-sm text-slate-500">
                        Gérez tous les accès, rôles et statuts depuis cette interface.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0">
                    <Link
                        to="/users/create"
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                        <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Ajouter un utilisateur
                    </Link>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 p-4 rounded-md border border-red-200">
                    <p className="text-red-700 text-sm font-medium">{error}</p>
                </div>
            )}

            <div className="flex flex-col">
                <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                        <div className="shadow overflow-hidden border-b border-slate-200 sm:rounded-lg">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Utilisateur (Nom & Email)
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Agence
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Rôle
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Statut
                                        </th>
                                        <th scope="col" className="relative px-6 py-3">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <span className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm border border-slate-300">
                                                            {user.nom.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-bold text-slate-900">{user.nom}</div>
                                                        <div className="text-sm text-slate-500">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                                                ID: {user.agence_id}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.actif ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
                                                    }`}>
                                                    {user.actif ? 'Actif' : 'Désactivé'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                                <Link to={`/users/edit/${user.id}`} className="text-blue-600 hover:text-blue-900 transition-colors">
                                                    Modifier
                                                </Link>
                                                <button
                                                    onClick={() => handleToggleStatus(user)}
                                                    className={`${user.actif ? 'text-orange-600 hover:text-orange-900' : 'text-emerald-600 hover:text-emerald-900'} transition-colors`}
                                                >
                                                    {user.actif ? 'Désactiver' : 'Activer'}
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
                                                Aucun utilisateur trouvé. Veuillez en ajouter un.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UsersList;
