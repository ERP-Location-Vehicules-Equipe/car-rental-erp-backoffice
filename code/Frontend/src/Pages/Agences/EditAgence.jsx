import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import agenceService from '../../Services/agenceService';
import { getErrorMessage, getFieldErrors } from '../../utils/errorHandler';

const normalizeOptionalText = (value) => {
    const trimmed = (value || '').trim();
    return trimmed === '' ? null : trimmed;
};

const EditAgence = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [formData, setFormData] = useState({
        nom: '',
        code: '',
        ville: '',
        adresse: '',
        telephone: '',
        email: '',
        responsable_nom: '',
        heure_ouverture: '',
        heure_fermeture: '',
        capacite_max_vehicules: '',
    });

    const getInputClass = (fieldName) => (
        `shadow-sm block w-full sm:text-sm rounded-lg py-2 px-3 border ${fieldErrors[fieldName]
            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
            : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
        }`
    );

    const clearFieldError = (fieldName) => {
        setFieldErrors((prev) => {
            if (!prev[fieldName]) {
                return prev;
            }
            const next = { ...prev };
            delete next[fieldName];
            return next;
        });
    };

    const renderFieldError = (fieldName) => (
        fieldErrors[fieldName] ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors[fieldName]}</p>
        ) : null
    );

    useEffect(() => {
        const fetchAgence = async () => {
            try {
                const agence = await agenceService.getAgenceById(id);
                setFormData({
                    nom: agence.nom || '',
                    code: agence.code || '',
                    ville: agence.ville || '',
                    adresse: agence.adresse || '',
                    telephone: agence.telephone || '',
                    email: agence.email || '',
                    responsable_nom: agence.responsable_nom || '',
                    heure_ouverture: agence.heure_ouverture || '',
                    heure_fermeture: agence.heure_fermeture || '',
                    capacite_max_vehicules: agence.capacite_max_vehicules ?? '',
                });
            } catch (err) {
                setError(getErrorMessage(err, "Impossible de recuperer l'agence."));
            } finally {
                setLoading(false);
            }
        };

        fetchAgence();
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        clearFieldError(name);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setFieldErrors({});

        const payload = {
            nom: formData.nom.trim(),
            code: formData.code.trim(),
            ville: formData.ville.trim(),
            adresse: normalizeOptionalText(formData.adresse),
            telephone: normalizeOptionalText(formData.telephone),
            email: normalizeOptionalText(formData.email),
            responsable_nom: normalizeOptionalText(formData.responsable_nom),
            heure_ouverture: normalizeOptionalText(formData.heure_ouverture),
            heure_fermeture: normalizeOptionalText(formData.heure_fermeture),
            capacite_max_vehicules: formData.capacite_max_vehicules === ''
                ? null
                : parseInt(formData.capacite_max_vehicules, 10),
        };

        try {
            await agenceService.updateAgence(id, payload);
            navigate('/agences');
        } catch (err) {
            const apiFieldErrors = getFieldErrors(err);
            if (Object.keys(apiFieldErrors).length > 0) {
                setFieldErrors(apiFieldErrors);
            }
            setError(getErrorMessage(err, "Erreur lors de la mise a jour de l'agence."));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Editer agence</h2>
                    <p className="mt-1 text-sm text-slate-500">Mettez a jour les informations de l'agence.</p>
                </div>
                <Link
                    to="/agences"
                    className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                >
                    Retour a la liste
                </Link>
            </div>

            <div className="bg-white shadow-sm sm:rounded-xl border border-slate-200">
                <div className="px-4 py-5 sm:p-6">
                    {error && (
                        <div className="mb-4 bg-red-50 p-4 rounded-md border border-red-200">
                            <p className="text-sm font-medium text-red-700">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label htmlFor="nom" className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                                <input id="nom" name="nom" required value={formData.nom} onChange={handleChange} className={getInputClass('nom')} />
                                {renderFieldError('nom')}
                            </div>

                            <div>
                                <label htmlFor="code" className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                                <input id="code" name="code" required value={formData.code} onChange={handleChange} className={getInputClass('code')} />
                                {renderFieldError('code')}
                            </div>

                            <div>
                                <label htmlFor="ville" className="block text-sm font-medium text-slate-700 mb-1">Ville</label>
                                <input id="ville" name="ville" required value={formData.ville} onChange={handleChange} className={getInputClass('ville')} />
                                {renderFieldError('ville')}
                            </div>

                            <div className="sm:col-span-2">
                                <label htmlFor="adresse" className="block text-sm font-medium text-slate-700 mb-1">Adresse</label>
                                <input id="adresse" name="adresse" value={formData.adresse} onChange={handleChange} className={getInputClass('adresse')} />
                                {renderFieldError('adresse')}
                            </div>

                            <div>
                                <label htmlFor="telephone" className="block text-sm font-medium text-slate-700 mb-1">Telephone</label>
                                <input id="telephone" name="telephone" value={formData.telephone} onChange={handleChange} className={getInputClass('telephone')} />
                                {renderFieldError('telephone')}
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className={getInputClass('email')} />
                                {renderFieldError('email')}
                            </div>

                            <div>
                                <label htmlFor="responsable_nom" className="block text-sm font-medium text-slate-700 mb-1">Responsable</label>
                                <input id="responsable_nom" name="responsable_nom" value={formData.responsable_nom} onChange={handleChange} className={getInputClass('responsable_nom')} />
                                {renderFieldError('responsable_nom')}
                            </div>

                            <div>
                                <label htmlFor="capacite_max_vehicules" className="block text-sm font-medium text-slate-700 mb-1">Capacite max vehicules</label>
                                <input id="capacite_max_vehicules" name="capacite_max_vehicules" type="number" min="0" value={formData.capacite_max_vehicules} onChange={handleChange} className={getInputClass('capacite_max_vehicules')} />
                                {renderFieldError('capacite_max_vehicules')}
                            </div>

                            <div>
                                <label htmlFor="heure_ouverture" className="block text-sm font-medium text-slate-700 mb-1">Heure ouverture</label>
                                <input id="heure_ouverture" name="heure_ouverture" placeholder="08:00" value={formData.heure_ouverture} onChange={handleChange} className={getInputClass('heure_ouverture')} />
                                {renderFieldError('heure_ouverture')}
                            </div>

                            <div>
                                <label htmlFor="heure_fermeture" className="block text-sm font-medium text-slate-700 mb-1">Heure fermeture</label>
                                <input id="heure_fermeture" name="heure_fermeture" placeholder="18:00" value={formData.heure_fermeture} onChange={handleChange} className={getInputClass('heure_fermeture')} />
                                {renderFieldError('heure_fermeture')}
                            </div>
                        </div>

                        <div className="pt-6 flex justify-end space-x-3 border-t border-slate-100">
                            <button type="button" onClick={() => navigate('/agences')} className="bg-white py-2 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50">
                                Annuler
                            </button>
                            <button type="submit" disabled={saving} className="inline-flex justify-center py-2 px-6 border border-transparent shadow-md text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700">
                                {saving ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditAgence;
