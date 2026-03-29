import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import authService from '../../Services/authService';
import agenceService from '../../Services/agenceService';
import { getErrorMessage } from '../../utils/errorHandler';

const renderValue = (value) => {
    if (value === null || value === undefined || value === '') {
        return '-';
    }
    return value;
};

const AgenceDetail = () => {
    const { id } = useParams();
    const [agence, setAgence] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const isAdmin = authService.isAdmin();

    useEffect(() => {
        const fetchAgence = async () => {
            try {
                const data = await agenceService.getAgenceById(id);
                setAgence(data);
            } catch (err) {
                setError(getErrorMessage(err, "Impossible de recuperer les informations de l'agence."));
            } finally {
                setLoading(false);
            }
        };

        fetchAgence();
    }, [id]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
            </div>
        );
    }

    if (error || !agence) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="bg-red-50 p-4 rounded-md border border-red-200">
                    <p className="text-sm font-medium text-red-700">{error || 'Agence introuvable'}</p>
                </div>
                <div className="mt-4">
                    <Link to="/agences" className="text-blue-600 hover:text-blue-800 font-medium">
                        Retour a la liste
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
                        Fiche agence
                        <span className={`px-2 py-0.5 ml-2 text-xs rounded-full ${agence.actif ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                            {agence.actif ? 'Actif' : 'Desactive'}
                        </span>
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Informations completes de l'agence.
                    </p>
                </div>
                <div className="flex space-x-3">
                    <Link
                        to="/agences"
                        className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                    >
                        Retour
                    </Link>
                    {isAdmin && (
                        <Link
                            to={`/agences/edit/${agence.id}`}
                            className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-all"
                        >
                            Modifier
                        </Link>
                    )}
                </div>
            </div>

            <div className="bg-white shadow-sm sm:rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-6 sm:p-8 bg-slate-50 border-b border-slate-200">
                    <h3 className="text-2xl font-bold text-slate-900">{agence.nom}</h3>
                    <p className="text-slate-500 font-medium">Code: {agence.code}</p>
                </div>

                <div className="px-6 py-6 sm:p-8">
                    <h4 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">Details</h4>
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                        <div>
                            <dt className="text-sm font-medium text-slate-500">ID</dt>
                            <dd className="mt-1 text-sm text-slate-900 bg-slate-50 p-2 rounded border border-slate-100 font-mono">#{agence.id}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-slate-500">Ville</dt>
                            <dd className="mt-1 text-sm text-slate-900 bg-slate-50 p-2 rounded border border-slate-100">{renderValue(agence.ville)}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-slate-500">Adresse</dt>
                            <dd className="mt-1 text-sm text-slate-900 bg-slate-50 p-2 rounded border border-slate-100">{renderValue(agence.adresse)}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-slate-500">Telephone</dt>
                            <dd className="mt-1 text-sm text-slate-900 bg-slate-50 p-2 rounded border border-slate-100">{renderValue(agence.telephone)}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-slate-500">Email</dt>
                            <dd className="mt-1 text-sm text-slate-900 bg-slate-50 p-2 rounded border border-slate-100">{renderValue(agence.email)}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-slate-500">Responsable</dt>
                            <dd className="mt-1 text-sm text-slate-900 bg-slate-50 p-2 rounded border border-slate-100">{renderValue(agence.responsable_nom)}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-slate-500">Heure ouverture</dt>
                            <dd className="mt-1 text-sm text-slate-900 bg-slate-50 p-2 rounded border border-slate-100">{renderValue(agence.heure_ouverture)}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-slate-500">Heure fermeture</dt>
                            <dd className="mt-1 text-sm text-slate-900 bg-slate-50 p-2 rounded border border-slate-100">{renderValue(agence.heure_fermeture)}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-slate-500">Capacite max vehicules</dt>
                            <dd className="mt-1 text-sm text-slate-900 bg-slate-50 p-2 rounded border border-slate-100">{renderValue(agence.capacite_max_vehicules)}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-slate-500">Supprimee (soft delete)</dt>
                            <dd className="mt-1 text-sm text-slate-900 bg-slate-50 p-2 rounded border border-slate-100">
                                {agence.deleted_at ? 'Oui' : 'Non'}
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>
    );
};

export default AgenceDetail;
