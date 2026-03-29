import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import agenceService from '../../Services/agenceService';
import authService from '../../Services/authService';
import { getErrorMessage } from '../../utils/errorHandler';

const formatDateTime = (value) => {
    if (!value) {
        return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString();
};

const AgencesList = () => {
    const [agences, setAgences] = useState([]);
    const [deletedAgences, setDeletedAgences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingDeleted, setLoadingDeleted] = useState(false);
    const [showDeleted, setShowDeleted] = useState(false);
    const [error, setError] = useState('');
    const [deletedError, setDeletedError] = useState('');
    const isAdmin = authService.isAdmin();

    const fetchAgences = async () => {
        try {
            setLoading(true);
            const data = await agenceService.getAllAgences();
            setAgences(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(getErrorMessage(err, "Erreur lors du chargement des agences."));
        } finally {
            setLoading(false);
        }
    };

    const fetchDeletedAgences = async () => {
        if (!isAdmin) {
            return;
        }

        try {
            setLoadingDeleted(true);
            setDeletedError('');
            const data = await agenceService.getDeletedAgences();
            setDeletedAgences(Array.isArray(data) ? data : []);
        } catch (err) {
            setDeletedError(getErrorMessage(err, "Erreur lors du chargement de l'historique des suppressions."));
        } finally {
            setLoadingDeleted(false);
        }
    };

    useEffect(() => {
        fetchAgences();
    }, []);

    useEffect(() => {
        if (showDeleted) {
            fetchDeletedAgences();
        }
    }, [showDeleted]);

    const handleToggleStatus = async (agence) => {
        try {
            if (agence.actif) {
                await agenceService.disableAgence(agence.id);
            } else {
                await agenceService.enableAgence(agence.id);
            }
            setAgences(agences.map((a) => (
                a.id === agence.id ? { ...a, actif: !agence.actif } : a
            )));
        } catch (err) {
            alert(getErrorMessage(err, "Erreur lors du changement de statut."));
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Supprimer cette agence ? Cette action applique un soft delete.")) {
            try {
                await agenceService.deleteAgence(id);
                setAgences(agences.filter((a) => a.id !== id));

                if (showDeleted) {
                    fetchDeletedAgences();
                }
            } catch (err) {
                alert(getErrorMessage(err, "Erreur lors de la suppression."));
            }
        }
    };

    const handleRestore = async (id) => {
        if (window.confirm("Restaurer cette agence supprimee ?")) {
            try {
                await agenceService.restoreAgence(id);
                setDeletedAgences((prev) => prev.filter((a) => a.id !== id));
                fetchAgences();
            } catch (err) {
                alert(getErrorMessage(err, "Erreur lors de la restauration de l'agence."));
            }
        }
    };

    if (loading && agences.length === 0) {
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
                    <h2 className="text-2xl font-bold text-slate-900">Agences</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Consultez et administrez le reseau d'agences.
                    </p>
                </div>
                {isAdmin && (
                    <div className="mt-4 sm:mt-0 flex items-center gap-3">
                        <button
                            onClick={() => setShowDeleted((prev) => !prev)}
                            className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                        >
                            {showDeleted ? 'Masquer historique' : 'Voir historique'}
                        </button>
                        <Link
                            to="/agences/create"
                            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                        >
                            Ajouter une agence
                        </Link>
                    </div>
                )}
            </div>

            {error && (
                <div className="bg-red-50 p-4 rounded-md border border-red-200">
                    <p className="text-red-700 text-sm font-medium">{error}</p>
                </div>
            )}

            <div className="shadow overflow-hidden border-b border-slate-200 sm:rounded-lg">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Agence
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Ville
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Responsable
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
                        {agences.map((agence) => (
                            <tr key={agence.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-bold text-slate-900">{agence.nom}</div>
                                    <div className="text-xs text-slate-500">Code: {agence.code}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{agence.ville}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                                    {agence.responsable_nom || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${agence.actif ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                                        {agence.actif ? 'Actif' : 'Desactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                    <Link to={`/agences/${agence.id}`} className="text-slate-700 hover:text-slate-900">
                                        Details
                                    </Link>
                                    {isAdmin && (
                                        <>
                                            <Link to={`/agences/edit/${agence.id}`} className="text-blue-600 hover:text-blue-900">
                                                Modifier
                                            </Link>
                                            <button
                                                onClick={() => handleToggleStatus(agence)}
                                                className={`${agence.actif ? 'text-orange-600 hover:text-orange-900' : 'text-emerald-600 hover:text-emerald-900'} transition-colors`}
                                            >
                                                {agence.actif ? 'Desactiver' : 'Activer'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(agence.id)}
                                                className="text-red-600 hover:text-red-900 transition-colors"
                                            >
                                                Supprimer
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {agences.length === 0 && !loading && (
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-sm text-slate-500">
                                    Aucune agence trouvee.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isAdmin && showDeleted && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-900">Historique des suppressions</h3>
                        {loadingDeleted && (
                            <span className="text-sm text-slate-500">Chargement...</span>
                        )}
                    </div>

                    {deletedError && (
                        <div className="bg-red-50 p-4 rounded-md border border-red-200">
                            <p className="text-red-700 text-sm font-medium">{deletedError}</p>
                        </div>
                    )}

                    <div className="shadow overflow-hidden border-b border-slate-200 sm:rounded-lg">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Agence
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Ville
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Supprimee le
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {deletedAgences.map((agence) => (
                                    <tr key={agence.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-slate-900">{agence.nom}</div>
                                            <div className="text-xs text-slate-500">Code: {agence.code}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{agence.ville || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{formatDateTime(agence.deleted_at)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleRestore(agence.id)}
                                                className="text-emerald-600 hover:text-emerald-900 transition-colors"
                                            >
                                                Restaurer
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {deletedAgences.length === 0 && !loadingDeleted && (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-sm text-slate-500">
                                            Aucune agence supprimee.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgencesList;
