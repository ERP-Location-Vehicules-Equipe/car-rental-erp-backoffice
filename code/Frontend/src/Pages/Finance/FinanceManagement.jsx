import React, { useCallback, useEffect, useMemo, useState } from 'react';
import authService from '../../Services/authService';
import fleetService from '../../Services/fleetService';
import financeService from '../../Services/financeService';
import locationService from '../../Services/locationService';
import { getAgencesCachedSafe } from '../../Services/agenceLookupService';
import { getErrorMessage } from '../../utils/errorHandler';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const TABS = [
    { id: 'overview', label: 'Apercu' },
    { id: 'factures', label: 'Factures' },
    { id: 'paiements', label: 'Paiements' },
    { id: 'comptes', label: 'Comptes' },
    { id: 'charges', label: 'Charges' },
];

const CHARGE_TYPES = ['carburant', 'entretien', 'assurance', 'autre'];

const toIsoOrNull = (value) => {
    if (!value) {
        return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed.toISOString();
};

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

const FinanceManagement = () => {
    const currentUser = authService.getCurrentUser();
    const isSuperAdmin = currentUser?.role === authService.ROLE_SUPER_ADMIN;
    const isAdmin = currentUser?.role === authService.ROLE_ADMIN;
    const isEmploye = currentUser?.role === authService.ROLE_EMPLOYE;
    const userAgenceId = currentUser?.agence_id;

    const canWrite = isSuperAdmin || isAdmin || isEmploye;
    const canAdmin = isSuperAdmin || isAdmin;

    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const [factures, setFactures] = useState([]);
    const [deletedFactures, setDeletedFactures] = useState([]);
    const [locations, setLocations] = useState([]);
    const [paiements, setPaiements] = useState([]);
    const [comptes, setComptes] = useState([]);
    const [charges, setCharges] = useState([]);
    const [rapport, setRapport] = useState(null);
    const [dashboardStats, setDashboardStats] = useState(null);
    const [agences, setAgences] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [modeles, setModeles] = useState([]);
    const [marques, setMarques] = useState([]);
    const [agenceWarning, setAgenceWarning] = useState('');
    const [fleetWarning, setFleetWarning] = useState('');
    const [showDeletedHistory, setShowDeletedHistory] = useState(false);
    const [editingFactureId, setEditingFactureId] = useState(null);
    const [factureEditForm, setFactureEditForm] = useState({
        location_id: '',
        montant_ht: '',
        tva: '',
        statut: 'en_attente',
    });
    const [editingChargeId, setEditingChargeId] = useState(null);
    const [chargeEditForm, setChargeEditForm] = useState({
        type: 'autre',
        montant: '',
        categorie_charge: '',
        description: '',
    });

    const [factureForm, setFactureForm] = useState({
        location_id: '',
        montant_ht: '',
        tva: '20',
    });

    const [paiementForm, setPaiementForm] = useState({
        facture_id: '',
        compte_id: '',
        montant: '',
        mode: 'virement',
        reference: '',
    });

    const [compteForm, setCompteForm] = useState({
        nom: '',
        type: 'banque',
        solde_actuel: '0',
    });
    const [editingCompteId, setEditingCompteId] = useState(null);
    const [compteEditForm, setCompteEditForm] = useState({
        nom: '',
        type: 'banque',
        solde_actuel: '',
    });

    const [chargeForm, setChargeForm] = useState({
        type: 'autre',
        vehicule_id: '',
        agence_id: isSuperAdmin ? '' : String(userAgenceId || ''),
        categorie_charge: '',
        montant: '',
        date_charge: '',
        description: '',
    });
    const [deleteDialog, setDeleteDialog] = useState({
        open: false,
        entity: null,
        id: null,
        label: '',
        loading: false,
    });
    const [factureFilters, setFactureFilters] = useState({
        search: '',
        from: '',
        to: '',
    });
    const [paiementFilters, setPaiementFilters] = useState({
        search: '',
        from: '',
        to: '',
    });
    const [compteSearch, setCompteSearch] = useState('');
    const [chargeFilters, setChargeFilters] = useState({
        search: '',
        from: '',
        to: '',
    });

    const roleBadge = useMemo(() => {
        if (isSuperAdmin) {
            return { label: 'SUPER ADMIN', className: 'bg-amber-100 text-amber-800 border border-amber-200' };
        }
        if (isAdmin) {
            return { label: 'ADMIN', className: 'bg-indigo-100 text-indigo-800 border border-indigo-200' };
        }
        return { label: 'EMPLOYE', className: 'bg-emerald-100 text-emerald-800 border border-emerald-200' };
    }, [isAdmin, isSuperAdmin]);

    const agenceById = useMemo(() => {
        return agences.reduce((acc, agence) => {
            acc[Number(agence.id)] = agence.nom;
            return acc;
        }, {});
    }, [agences]);

    const scopeAgences = useMemo(() => {
        if (isSuperAdmin) {
            return agences;
        }
        return agences.filter((agence) => Number(agence.id) === Number(userAgenceId));
    }, [agences, isSuperAdmin, userAgenceId]);

    const modeleById = useMemo(() => {
        return modeles.reduce((acc, modele) => {
            acc[Number(modele.id)] = modele;
            return acc;
        }, {});
    }, [modeles]);

    const marqueById = useMemo(() => {
        return marques.reduce((acc, marque) => {
            acc[Number(marque.id)] = marque.nom;
            return acc;
        }, {});
    }, [marques]);

    const vehicleLabelById = useMemo(() => {
        return vehicles.reduce((acc, vehicle) => {
            const modele = modeleById[Number(vehicle.modele_id)];
            const marqueNom = modele ? marqueById[Number(modele.marque_id)] : '';
            const modeleNom = modele?.nom || '';
            const base = `${marqueNom || ''} ${modeleNom || ''}`.trim();
            acc[Number(vehicle.id)] = base
                ? `${base} (${vehicle.immatriculation})`
                : (vehicle.immatriculation || 'Vehicule inconnu');
            return acc;
        }, {});
    }, [marqueById, modeleById, vehicles]);

    const scopeVehicles = useMemo(() => {
        if (isSuperAdmin) {
            return vehicles;
        }
        return vehicles.filter((vehicle) => Number(vehicle.agence_id) === Number(userAgenceId));
    }, [isSuperAdmin, userAgenceId, vehicles]);

    const locationOptions = useMemo(() => {
        const list = Array.isArray(locations) ? [...locations] : [];
        list.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
        return list;
    }, [locations]);

    const locationLabelById = useMemo(() => {
        return locationOptions.reduce((acc, location) => {
            const vehicleLabel = vehicleLabelById[Number(location.vehicle_id)] || `Vehicule #${location.vehicle_id}`;
            const agenceLabel = agenceById[Number(location.agence_depart_id)] || "Pas d'agence";
            const periode = formatDateTime(location.date_debut);
            acc[Number(location.id)] = `Location #${location.id} - ${vehicleLabel} - ${agenceLabel} - ${periode}`;
            return acc;
        }, {});
    }, [agenceById, locationOptions, vehicleLabelById]);

    const filteredFactures = useMemo(() => {
        const query = factureFilters.search.trim().toLowerCase();
        const from = factureFilters.from;
        const to = factureFilters.to;

        return factures.filter((facture) => {
            const dateOnly = toDateOnly(facture.date_emission);
            const matchFrom = !from || (dateOnly && dateOnly >= from);
            const matchTo = !to || (dateOnly && dateOnly <= to);
            if (!matchFrom || !matchTo) {
                return false;
            }
            if (!query) {
                return true;
            }

            const locationLabel = locationLabelById[Number(facture.location_id)] || String(facture.location_id || '');
            return [
                facture.numero,
                facture.statut,
                locationLabel,
                facture.location_id,
                facture.montant_ttc,
            ].some((value) => String(value || '').toLowerCase().includes(query));
        });
    }, [factureFilters.from, factureFilters.search, factureFilters.to, factures, locationLabelById]);

    const filteredPaiements = useMemo(() => {
        const query = paiementFilters.search.trim().toLowerCase();
        const from = paiementFilters.from;
        const to = paiementFilters.to;

        return paiements.filter((paiement) => {
            const dateOnly = toDateOnly(paiement.date_paiement);
            const matchFrom = !from || (dateOnly && dateOnly >= from);
            const matchTo = !to || (dateOnly && dateOnly <= to);
            if (!matchFrom || !matchTo) {
                return false;
            }
            if (!query) {
                return true;
            }
            return [
                paiement.id,
                paiement.facture_id,
                paiement.compte_id,
                paiement.mode,
                paiement.reference,
                paiement.montant,
            ].some((value) => String(value || '').toLowerCase().includes(query));
        });
    }, [paiementFilters.from, paiementFilters.search, paiementFilters.to, paiements]);

    const filteredComptes = useMemo(() => {
        const query = compteSearch.trim().toLowerCase();
        if (!query) {
            return comptes;
        }
        return comptes.filter((compte) => {
            return [compte.nom, compte.type, compte.solde_actuel]
                .some((value) => String(value || '').toLowerCase().includes(query));
        });
    }, [compteSearch, comptes]);

    const filteredCharges = useMemo(() => {
        const query = chargeFilters.search.trim().toLowerCase();
        const from = chargeFilters.from;
        const to = chargeFilters.to;

        return charges.filter((charge) => {
            const dateOnly = toDateOnly(charge.date_charge);
            const matchFrom = !from || (dateOnly && dateOnly >= from);
            const matchTo = !to || (dateOnly && dateOnly <= to);
            if (!matchFrom || !matchTo) {
                return false;
            }
            if (!query) {
                return true;
            }
            return [
                charge.type,
                charge.categorie_charge,
                charge.description,
                vehicleLabelById[Number(charge.vehicule_id)] || '',
                agenceById[Number(charge.agence_id)] || '',
                charge.montant,
            ].some((value) => String(value || '').toLowerCase().includes(query));
        });
    }, [agenceById, chargeFilters.from, chargeFilters.search, chargeFilters.to, charges, vehicleLabelById]);

    const loadAll = useCallback(async (silent = false) => {
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            setError('');
            const requests = [
                financeService.getFactures(),
                financeService.getPaiements(),
                financeService.getComptes(),
                financeService.getCharges(),
                financeService.getRapport(),
                financeService.getDashboardStats(),
                getAgencesCachedSafe(),
                locationService.getLocations(),
            ];

            if (canAdmin) {
                requests.push(financeService.getDeletedFactures());
            }

            const results = await Promise.all(requests);
            const [
                facturesRes,
                paiementsRes,
                comptesRes,
                chargesRes,
                rapportRes,
                dashboardRes,
                agencesRes,
                locationsRes,
                deletedRes,
            ] = results;

            setFactures(Array.isArray(facturesRes?.factures) ? facturesRes.factures : []);
            setPaiements(Array.isArray(paiementsRes?.paiements) ? paiementsRes.paiements : []);
            setComptes(Array.isArray(comptesRes?.comptes) ? comptesRes.comptes : []);
            setCharges(Array.isArray(chargesRes?.charges) ? chargesRes.charges : []);
            setRapport(rapportRes || null);
            setDashboardStats(dashboardRes || null);
            setAgences(Array.isArray(agencesRes?.agences) ? agencesRes.agences : []);
            setLocations(Array.isArray(locationsRes) ? locationsRes : []);
            setAgenceWarning(
                agencesRes?.available
                    ? ''
                    : "Service Agence indisponible. Les noms d'agences peuvent etre incomplets.",
            );
            setDeletedFactures(canAdmin && Array.isArray(deletedRes?.factures) ? deletedRes.factures : []);

            try {
                const [vehiclesData, modelesData, marquesData] = await Promise.all([
                    fleetService.getVehicles(),
                    fleetService.getModeles(),
                    fleetService.getMarques(),
                ]);
                setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
                setModeles(Array.isArray(modelesData) ? modelesData : []);
                setMarques(Array.isArray(marquesData) ? marquesData : []);
                setFleetWarning('');
            } catch {
                setVehicles([]);
                setModeles([]);
                setMarques([]);
                setFleetWarning("Service Fleet indisponible. Les labels des vehicules peuvent etre incomplets.");
            }
        } catch (loadError) {
            setError(getErrorMessage(loadError, 'Erreur lors du chargement du service finance.'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [canAdmin]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    useEffect(() => {
        if (isSuperAdmin) {
            return;
        }
        setChargeForm((prev) => ({
            ...prev,
            agence_id: String(userAgenceId || ''),
        }));
    }, [isSuperAdmin, userAgenceId]);

    const runAction = async (fn, successMessage, fallbackError, onSuccess) => {
        setError('');
        setNotice('');
        try {
            await fn();
            if (successMessage) {
                setNotice(successMessage);
            }
            await loadAll(true);
            if (typeof onSuccess === 'function') {
                onSuccess();
            }
        } catch (actionError) {
            setError(getErrorMessage(actionError, fallbackError));
        }
    };

    const handleCreateFacture = async (event) => {
        event.preventDefault();
        const payload = {
            location_id: Number(factureForm.location_id),
            montant_ht: Number(factureForm.montant_ht),
            tva: Number(factureForm.tva),
        };

        if (Number.isNaN(payload.location_id) || Number.isNaN(payload.montant_ht) || Number.isNaN(payload.tva)) {
            setError('Veuillez renseigner des valeurs valides pour creer la facture.');
            return;
        }

        await runAction(
            () => financeService.createFacture(payload),
            'Facture creee avec succes.',
            'Impossible de creer la facture.',
            () => setFactureForm({ location_id: '', montant_ht: '', tva: '20' }),
        );
    };

    const startEditFacture = (facture) => {
        setEditingFactureId(facture.id);
        setFactureEditForm({
            location_id: String(facture.location_id || ''),
            montant_ht: String(facture.montant_ht ?? ''),
            tva: String(facture.tva ?? ''),
            statut: facture.statut || 'en_attente',
        });
    };

    const cancelEditFacture = () => {
        setEditingFactureId(null);
        setFactureEditForm({
            location_id: '',
            montant_ht: '',
            tva: '',
            statut: 'en_attente',
        });
    };

    const saveEditFacture = async (factureId) => {
        const payload = {
            location_id: Number(factureEditForm.location_id),
            montant_ht: Number(factureEditForm.montant_ht),
            tva: Number(factureEditForm.tva),
            statut: factureEditForm.statut,
        };
        if (
            Number.isNaN(payload.location_id) ||
            Number.isNaN(payload.montant_ht) ||
            Number.isNaN(payload.tva) ||
            !payload.statut
        ) {
            setError('Valeurs invalides pour la facture.');
            return;
        }
        await runAction(
            () => financeService.updateFacture(factureId, payload),
            'Facture mise a jour.',
            'Impossible de mettre a jour la facture.',
            cancelEditFacture,
        );
    };

    const handleRestoreFacture = async (factureId) => {
        await runAction(
            () => financeService.restoreFacture(factureId),
            'Facture restauree.',
            'Impossible de restaurer la facture.',
        );
    };
    const handleCreatePaiement = async (event) => {
        event.preventDefault();
        const payload = {
            facture_id: Number(paiementForm.facture_id),
            compte_id: paiementForm.compte_id ? Number(paiementForm.compte_id) : null,
            montant: Number(paiementForm.montant),
            mode: paiementForm.mode,
            reference: paiementForm.reference.trim() || null,
        };

        if (
            Number.isNaN(payload.facture_id) ||
            Number.isNaN(payload.montant) ||
            (payload.compte_id !== null && Number.isNaN(payload.compte_id))
        ) {
            setError('Veuillez renseigner des valeurs valides pour creer le paiement.');
            return;
        }

        await runAction(
            () => financeService.createPaiement(payload),
            'Paiement cree avec succes.',
            'Impossible de creer le paiement.',
            () => setPaiementForm({ facture_id: '', compte_id: '', montant: '', mode: 'virement', reference: '' }),
        );
    };

    const handleDeletePaiement = async (paiementId) => {
        await runAction(
            () => financeService.deletePaiement(paiementId),
            'Paiement supprime.',
            'Impossible de supprimer le paiement.',
        );
    };

    const handleCreateCompte = async (event) => {
        event.preventDefault();
        const payload = {
            nom: compteForm.nom.trim(),
            type: compteForm.type,
            solde_actuel: Number(compteForm.solde_actuel),
        };

        if (!payload.nom || Number.isNaN(payload.solde_actuel)) {
            setError('Veuillez renseigner des valeurs valides pour creer le compte.');
            return;
        }

        await runAction(
            () => financeService.createCompte(payload),
            'Compte cree avec succes.',
            'Impossible de creer le compte.',
            () => setCompteForm({ nom: '', type: 'banque', solde_actuel: '0' }),
        );
    };

    const startEditCompte = (compte) => {
        setEditingCompteId(compte.id);
        setCompteEditForm({
            nom: compte.nom || '',
            type: compte.type || 'banque',
            solde_actuel: String(compte.solde_actuel ?? ''),
        });
    };

    const cancelEditCompte = () => {
        setEditingCompteId(null);
        setCompteEditForm({
            nom: '',
            type: 'banque',
            solde_actuel: '',
        });
    };

    const saveEditCompte = async (compteId) => {
        const solde = Number(compteEditForm.solde_actuel);
        if (!compteEditForm.nom.trim() || Number.isNaN(solde)) {
            setError('Valeurs invalides pour le compte.');
            return;
        }
        await runAction(
            () => financeService.updateCompte(compteId, {
                nom: compteEditForm.nom.trim(),
                type: compteEditForm.type,
                solde_actuel: solde,
            }),
            'Compte mis a jour.',
            'Impossible de mettre a jour le compte.',
            cancelEditCompte,
        );
    };

    const handleDeleteCompte = async (compteId) => {
        await runAction(
            () => financeService.deleteCompte(compteId),
            'Compte supprime.',
            'Impossible de supprimer le compte.',
        );
    };

    const handleCreateCharge = async (event) => {
        event.preventDefault();
        const agenceId = isSuperAdmin
            ? (chargeForm.agence_id ? Number(chargeForm.agence_id) : null)
            : Number(userAgenceId);

        const payload = {
            type: chargeForm.type,
            vehicule_id: chargeForm.vehicule_id ? Number(chargeForm.vehicule_id) : null,
            agence_id: agenceId,
            categorie_charge: chargeForm.categorie_charge.trim() || null,
            montant: Number(chargeForm.montant),
            date_charge: toIsoOrNull(chargeForm.date_charge),
            description: chargeForm.description.trim() || null,
        };

        if (
            Number.isNaN(payload.montant) ||
            (payload.vehicule_id !== null && Number.isNaN(payload.vehicule_id)) ||
            (payload.agence_id !== null && Number.isNaN(payload.agence_id))
        ) {
            setError('Veuillez renseigner des valeurs valides pour creer la charge.');
            return;
        }

        if (isSuperAdmin && (payload.agence_id === null || payload.agence_id <= 0)) {
            setError('Selectionnez une agence pour creer la charge.');
            return;
        }

        await runAction(
            () => financeService.createCharge(payload),
            'Charge creee avec succes.',
            'Impossible de creer la charge.',
            () => setChargeForm({
                type: 'autre',
                vehicule_id: '',
                agence_id: isSuperAdmin ? '' : String(userAgenceId || ''),
                categorie_charge: '',
                montant: '',
                date_charge: '',
                description: '',
            }),
        );
    };

    const startEditCharge = (charge) => {
        setEditingChargeId(charge.id);
        setChargeEditForm({
            type: charge.type || 'autre',
            montant: String(charge.montant ?? ''),
            categorie_charge: charge.categorie_charge || '',
            description: charge.description || '',
        });
    };

    const cancelEditCharge = () => {
        setEditingChargeId(null);
        setChargeEditForm({
            type: 'autre',
            montant: '',
            categorie_charge: '',
            description: '',
        });
    };

    const saveEditCharge = async (chargeId) => {
        const montant = Number(chargeEditForm.montant);
        if (Number.isNaN(montant) || montant < 0) {
            setError('Montant invalide.');
            return;
        }

        await runAction(
            () => financeService.updateCharge(chargeId, {
                type: chargeEditForm.type,
                montant,
                categorie_charge: chargeEditForm.categorie_charge.trim() || null,
                description: chargeEditForm.description.trim() || null,
            }),
            'Charge mise a jour.',
            'Impossible de mettre a jour la charge.',
            cancelEditCharge,
        );
    };

    const handleDownloadFacturePdf = async (factureId) => {
        setError('');
        try {
            const pdfBlob = await financeService.downloadFacturePdf(factureId);
            const url = window.URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `facture_${factureId}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (downloadError) {
            setError(getErrorMessage(downloadError, 'Impossible de telecharger le PDF de la facture.'));
        }
    };

    const handleDeleteCharge = async (chargeId) => {
        await runAction(
            () => financeService.deleteCharge(chargeId),
            'Charge supprimee.',
            'Impossible de supprimer la charge.',
        );
    };

    const requestDelete = (entity, id, label) => {
        setDeleteDialog({
            open: true,
            entity,
            id,
            label,
            loading: false,
        });
    };

    const closeDeleteDialog = () => {
        if (deleteDialog.loading) {
            return;
        }
        setDeleteDialog((prev) => ({ ...prev, open: false }));
    };

    const confirmDelete = async () => {
        if (!deleteDialog.open || !deleteDialog.entity || deleteDialog.id == null) {
            return;
        }
        setDeleteDialog((prev) => ({ ...prev, loading: true }));
        try {
            if (deleteDialog.entity === 'facture') {
                await handleDeleteFacture(deleteDialog.id);
            } else if (deleteDialog.entity === 'paiement') {
                await handleDeletePaiement(deleteDialog.id);
            } else if (deleteDialog.entity === 'compte') {
                await handleDeleteCompte(deleteDialog.id);
            } else if (deleteDialog.entity === 'charge') {
                await handleDeleteCharge(deleteDialog.id);
            }
            setDeleteDialog({
                open: false,
                entity: null,
                id: null,
                label: '',
                loading: false,
            });
        } catch {
            setDeleteDialog((prev) => ({ ...prev, loading: false }));
        }
    };

    const handleDeleteFacture = async (factureId) => {
        await runAction(
            () => financeService.deleteFacture(factureId),
            'Facture supprimee.',
            'Impossible de supprimer la facture.',
        );
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Gestion Finance</h2>
                        <p className="mt-1 text-sm text-slate-500">Factures, paiements, comptes de tresorerie, charges et rapports.</p>
                        <div className="mt-3">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${roleBadge.className}`}>
                                {roleBadge.label}
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => loadAll(true)}
                        className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
                        disabled={refreshing}
                    >
                        {refreshing ? 'Actualisation...' : 'Rafraichir'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 p-4 rounded-md border border-red-200">
                    <p className="text-sm font-medium text-red-700">{error}</p>
                </div>
            )}
            {notice && (
                <div className="bg-emerald-50 p-4 rounded-md border border-emerald-200">
                    <p className="text-sm font-medium text-emerald-700">{notice}</p>
                </div>
            )}
            {agenceWarning && (
                <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
                    <p className="text-sm font-medium text-amber-700">{agenceWarning}</p>
                </div>
            )}
            {fleetWarning && (
                <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
                    <p className="text-sm font-medium text-amber-700">{fleetWarning}</p>
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                            activeTab === tab.id
                                ? 'bg-slate-800 text-white'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            {activeTab === 'overview' && (
                <section className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase">Total factures</p>
                            <p className="text-2xl font-bold text-slate-900">{Number(rapport?.total_factures || 0).toFixed(2)}</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase">Total paiements</p>
                            <p className="text-2xl font-bold text-emerald-700">{Number(rapport?.total_paiements || 0).toFixed(2)}</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase">Total charges</p>
                            <p className="text-2xl font-bold text-rose-700">{Number(rapport?.total_charges || 0).toFixed(2)}</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase">Solde net</p>
                            <p className="text-2xl font-bold text-blue-700">{Number(rapport?.solde_net || 0).toFixed(2)}</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase">Factures en attente</p>
                            <p className="text-2xl font-bold text-amber-700">{Number(rapport?.factures_en_attente || 0)}</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                            <p className="text-xs font-semibold text-slate-500 uppercase">Factures payees</p>
                            <p className="text-2xl font-bold text-emerald-700">{Number(rapport?.factures_payees || 0)}</p>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                        <h3 className="text-lg font-bold text-slate-900 mb-3">Dashboard rapide</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                            <div><span className="font-semibold text-slate-700">Revenu Total:</span> {Number(dashboardStats?.revenu_total || 0).toFixed(2)}</div>
                            <div><span className="font-semibold text-slate-700">Charges Totales:</span> {Number(dashboardStats?.charges_total || 0).toFixed(2)}</div>
                            <div><span className="font-semibold text-slate-700">Benefice:</span> {Number(dashboardStats?.benefice || 0).toFixed(2)}</div>
                            <div><span className="font-semibold text-slate-700">Nombre de Factures:</span> {Number(dashboardStats?.nb_factures || 0)}</div>
                        </div>
                    </div>
                </section>
            )}

            {activeTab === 'factures' && (
                <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
                    <h3 className="text-lg font-bold text-slate-900">Factures</h3>

                    {canWrite && (
                        <form onSubmit={handleCreateFacture} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <label className="text-xs font-semibold text-slate-600">
                                Location
                                <select
                                    value={factureForm.location_id}
                                    onChange={(event) => setFactureForm((prev) => ({ ...prev, location_id: event.target.value }))}
                                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                    required
                                >
                                    <option value="">Selectionner</option>
                                    {locationOptions.map((location) => (
                                        <option key={location.id} value={location.id}>
                                            {locationLabelById[Number(location.id)] || `Location #${location.id}`}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="text-xs font-semibold text-slate-600">
                                Montant HT
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={factureForm.montant_ht}
                                    onChange={(event) => setFactureForm((prev) => ({ ...prev, montant_ht: event.target.value }))}
                                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                    required
                                />
                            </label>
                            <label className="text-xs font-semibold text-slate-600">
                                TVA
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={factureForm.tva}
                                    onChange={(event) => setFactureForm((prev) => ({ ...prev, tva: event.target.value }))}
                                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                    required
                                />
                            </label>
                            <div className="flex items-end">
                                <button type="submit" className="px-3 py-2 text-sm font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700">
                                    Ajouter facture
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <label className="text-xs font-semibold text-slate-600">
                            Recherche
                            <input
                                value={factureFilters.search}
                                onChange={(event) => setFactureFilters((prev) => ({ ...prev, search: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                placeholder="Numero, statut, location..."
                            />
                        </label>
                        <label className="text-xs font-semibold text-slate-600">
                            Date emission du
                            <input
                                type="date"
                                value={factureFilters.from}
                                onChange={(event) => setFactureFilters((prev) => ({ ...prev, from: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            />
                        </label>
                        <label className="text-xs font-semibold text-slate-600">
                            Date emission au
                            <input
                                type="date"
                                value={factureFilters.to}
                                onChange={(event) => setFactureFilters((prev) => ({ ...prev, to: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            />
                        </label>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">ID</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Location</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Numero</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">HT</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">TTC</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Statut</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                                    {(canWrite || canAdmin) && <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredFactures.map((facture) => (
                                    <tr key={facture.id}>
                                        <td className="px-4 py-2 text-sm text-slate-700">{facture.id}</td>
                                        <td className="px-4 py-2 text-sm text-slate-700">
                                            {editingFactureId === facture.id ? (
                                                <select
                                                    value={factureEditForm.location_id}
                                                    onChange={(event) => setFactureEditForm((prev) => ({ ...prev, location_id: event.target.value }))}
                                                    className="w-full px-2 py-1 border border-slate-300 rounded-md text-sm"
                                                >
                                                    <option value="">Selectionner</option>
                                                    {locationOptions.map((location) => (
                                                        <option key={location.id} value={location.id}>
                                                            {locationLabelById[Number(location.id)] || `Location #${location.id}`}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                locationLabelById[Number(facture.location_id)] || `Location #${facture.location_id}`
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-slate-700">{facture.numero}</td>
                                        <td className="px-4 py-2 text-sm text-slate-700">
                                            {editingFactureId === facture.id ? (
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={factureEditForm.montant_ht}
                                                    onChange={(event) => setFactureEditForm((prev) => ({ ...prev, montant_ht: event.target.value }))}
                                                    className="w-full px-2 py-1 border border-slate-300 rounded-md text-sm"
                                                />
                                            ) : (
                                                facture.montant_ht
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-slate-700">{facture.montant_ttc}</td>
                                        <td className="px-4 py-2 text-sm text-slate-700">
                                            {editingFactureId === facture.id ? (
                                                <select
                                                    value={factureEditForm.statut}
                                                    onChange={(event) => setFactureEditForm((prev) => ({ ...prev, statut: event.target.value }))}
                                                    className="w-full px-2 py-1 border border-slate-300 rounded-md text-sm"
                                                >
                                                    <option value="en_attente">en_attente</option>
                                                    <option value="payee">payee</option>
                                                    <option value="annulee">annulee</option>
                                                </select>
                                            ) : (
                                                facture.statut
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-slate-700">{formatDateTime(facture.date_emission)}</td>
                                        {(canWrite || canAdmin) && (
                                            <td className="px-4 py-2 text-right text-sm space-x-3">
                                                <button type="button" onClick={() => handleDownloadFacturePdf(facture.id)} className="text-slate-700 hover:text-slate-900">
                                                    PDF
                                                </button>
                                                {canWrite && editingFactureId !== facture.id && (
                                                    <button type="button" onClick={() => startEditFacture(facture)} className="text-blue-600 hover:text-blue-800">
                                                        Modifier
                                                    </button>
                                                )}
                                                {canWrite && editingFactureId === facture.id && (
                                                    <>
                                                        <button type="button" onClick={() => saveEditFacture(facture.id)} className="text-emerald-600 hover:text-emerald-800">
                                                            Enregistrer
                                                        </button>
                                                        <button type="button" onClick={cancelEditFacture} className="text-slate-600 hover:text-slate-800">
                                                            Annuler
                                                        </button>
                                                    </>
                                                )}
                                                {canAdmin && (
                                                    <button
                                                        type="button"
                                                        onClick={() => requestDelete('facture', facture.id, facture.numero || `Facture #${facture.id}`)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        Supprimer
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {filteredFactures.length === 0 && (
                                    <tr>
                                        <td colSpan={(canWrite || canAdmin) ? 8 : 7} className="px-4 py-6 text-center text-sm text-slate-500">
                                            Aucune facture trouvee.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {canAdmin && (
                        <div className="pt-2 space-y-3">
                            <button
                                type="button"
                                onClick={() => setShowDeletedHistory((prev) => !prev)}
                                className="px-3 py-2 text-sm font-semibold rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                            >
                                {showDeletedHistory ? 'Masquer historique de suppression' : 'Voir historique de suppression'}
                            </button>

                            {showDeletedHistory && (
                                <>
                                    <h4 className="text-base font-bold text-slate-900">Factures supprimees</h4>
                            <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">ID</th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Numero</th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Montant TTC</th>
                                            <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {deletedFactures.map((facture) => (
                                            <tr key={facture.id}>
                                                <td className="px-4 py-2 text-sm text-slate-700">{facture.id}</td>
                                                <td className="px-4 py-2 text-sm text-slate-700">{facture.numero}</td>
                                                <td className="px-4 py-2 text-sm text-slate-700">{facture.montant_ttc}</td>
                                                <td className="px-4 py-2 text-right text-sm">
                                                    <button type="button" onClick={() => handleRestoreFacture(facture.id)} className="text-emerald-600 hover:text-emerald-800">
                                                        Restaurer
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {deletedFactures.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                                                    Aucune facture supprimee.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                                </>
                            )}
                        </div>
                    )}
                </section>
            )}
            {activeTab === 'paiements' && (
                <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
                    <h3 className="text-lg font-bold text-slate-900">Paiements</h3>

                    {canWrite && (
                        <form onSubmit={handleCreatePaiement} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                            <label className="text-xs font-semibold text-slate-600">
                                Facture
                                <select
                                    value={paiementForm.facture_id}
                                    onChange={(event) => setPaiementForm((prev) => ({ ...prev, facture_id: event.target.value }))}
                                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                    required
                                >
                                    <option value="">Selectionner</option>
                                    {factures
                                        .slice()
                                        .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
                                        .map((facture) => (
                                            <option key={facture.id} value={facture.id}>
                                                {facture.numero} - {locationLabelById[Number(facture.location_id)] || `Location #${facture.location_id}`}
                                            </option>
                                        ))}
                                </select>
                            </label>
                            <label className="text-xs font-semibold text-slate-600">
                                Compte
                                <select
                                    value={paiementForm.compte_id}
                                    onChange={(event) => setPaiementForm((prev) => ({ ...prev, compte_id: event.target.value }))}
                                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                >
                                    <option value="">Aucun</option>
                                    {comptes.map((compte) => (
                                        <option key={compte.id} value={compte.id}>
                                            {compte.nom} ({compte.type})
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="text-xs font-semibold text-slate-600">
                                Montant
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={paiementForm.montant}
                                    onChange={(event) => setPaiementForm((prev) => ({ ...prev, montant: event.target.value }))}
                                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                    required
                                />
                            </label>
                            <label className="text-xs font-semibold text-slate-600">
                                Mode
                                <select
                                    value={paiementForm.mode}
                                    onChange={(event) => setPaiementForm((prev) => ({ ...prev, mode: event.target.value }))}
                                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                >
                                    <option value="virement">virement</option>
                                    <option value="carte">carte</option>
                                    <option value="especes">especes</option>
                                    <option value="cheque">cheque</option>
                                </select>
                            </label>
                            <label className="text-xs font-semibold text-slate-600">
                                Reference
                                <input
                                    value={paiementForm.reference}
                                    onChange={(event) => setPaiementForm((prev) => ({ ...prev, reference: event.target.value }))}
                                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                />
                            </label>
                            <div className="md:col-span-5">
                                <button type="submit" className="px-3 py-2 text-sm font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700">
                                    Ajouter paiement
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <label className="text-xs font-semibold text-slate-600">
                            Recherche
                            <input
                                value={paiementFilters.search}
                                onChange={(event) => setPaiementFilters((prev) => ({ ...prev, search: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                placeholder="Facture, mode, reference..."
                            />
                        </label>
                        <label className="text-xs font-semibold text-slate-600">
                            Date paiement du
                            <input
                                type="date"
                                value={paiementFilters.from}
                                onChange={(event) => setPaiementFilters((prev) => ({ ...prev, from: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            />
                        </label>
                        <label className="text-xs font-semibold text-slate-600">
                            Date paiement au
                            <input
                                type="date"
                                value={paiementFilters.to}
                                onChange={(event) => setPaiementFilters((prev) => ({ ...prev, to: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            />
                        </label>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">ID</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Facture</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Compte</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Montant</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Mode</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Reference</th>
                                    {canAdmin && <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredPaiements.map((paiement) => (
                                    <tr key={paiement.id}>
                                        <td className="px-4 py-2 text-sm text-slate-700">{paiement.id}</td>
                                        <td className="px-4 py-2 text-sm text-slate-700">{paiement.facture_id}</td>
                                        <td className="px-4 py-2 text-sm text-slate-700">{paiement.compte_id || '-'}</td>
                                        <td className="px-4 py-2 text-sm text-slate-700">{paiement.montant}</td>
                                        <td className="px-4 py-2 text-sm text-slate-700">{paiement.mode}</td>
                                        <td className="px-4 py-2 text-sm text-slate-700">{formatDateTime(paiement.date_paiement)}</td>
                                        <td className="px-4 py-2 text-sm text-slate-700">{paiement.reference || '-'}</td>
                                        {canAdmin && (
                                            <td className="px-4 py-2 text-right text-sm">
                                                <button
                                                    type="button"
                                                    onClick={() => requestDelete('paiement', paiement.id, `Paiement #${paiement.id}`)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    Supprimer
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {filteredPaiements.length === 0 && (
                                    <tr>
                                        <td colSpan={canAdmin ? 8 : 7} className="px-4 py-6 text-center text-sm text-slate-500">
                                            Aucun paiement trouve.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {activeTab === 'comptes' && (
                <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
                    <h3 className="text-lg font-bold text-slate-900">Comptes de tresorerie</h3>

                    {canWrite && (
                        <form onSubmit={handleCreateCompte} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <label className="text-xs font-semibold text-slate-600">
                                Nom
                                <input
                                    value={compteForm.nom}
                                    onChange={(event) => setCompteForm((prev) => ({ ...prev, nom: event.target.value }))}
                                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                    required
                                />
                            </label>
                            <label className="text-xs font-semibold text-slate-600">
                                Type
                                <select
                                    value={compteForm.type}
                                    onChange={(event) => setCompteForm((prev) => ({ ...prev, type: event.target.value }))}
                                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                >
                                    <option value="banque">banque</option>
                                    <option value="caisse">caisse</option>
                                </select>
                            </label>
                            <label className="text-xs font-semibold text-slate-600">
                                Solde actuel
                                <input
                                    type="number"
                                    step="0.01"
                                    value={compteForm.solde_actuel}
                                    onChange={(event) => setCompteForm((prev) => ({ ...prev, solde_actuel: event.target.value }))}
                                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                    required
                                />
                            </label>
                            <div className="flex items-end">
                                <button type="submit" className="px-3 py-2 text-sm font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700">
                                    Ajouter compte
                                </button>
                            </div>
                        </form>
                    )}

                    <label className="block text-xs font-semibold text-slate-600">
                        Recherche
                        <input
                            value={compteSearch}
                            onChange={(event) => setCompteSearch(event.target.value)}
                            className="mt-1 w-full md:max-w-sm px-3 py-2 border border-slate-300 rounded-md text-sm"
                            placeholder="Nom, type, solde..."
                        />
                    </label>

                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">ID</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Nom</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Solde</th>
                                    {(canWrite || canAdmin) && <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredComptes.map((compte) => (
                                    <tr key={compte.id}>
                                        <td className="px-4 py-2 text-sm text-slate-700">{compte.id}</td>
                                        <td className="px-4 py-2 text-sm text-slate-700">
                                            {editingCompteId === compte.id ? (
                                                <input
                                                    value={compteEditForm.nom}
                                                    onChange={(event) => setCompteEditForm((prev) => ({ ...prev, nom: event.target.value }))}
                                                    className="w-full px-2 py-1 border border-slate-300 rounded-md text-sm"
                                                />
                                            ) : (
                                                compte.nom
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-slate-700">
                                            {editingCompteId === compte.id ? (
                                                <select
                                                    value={compteEditForm.type}
                                                    onChange={(event) => setCompteEditForm((prev) => ({ ...prev, type: event.target.value }))}
                                                    className="w-full px-2 py-1 border border-slate-300 rounded-md text-sm"
                                                >
                                                    <option value="banque">banque</option>
                                                    <option value="caisse">caisse</option>
                                                </select>
                                            ) : (
                                                compte.type
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-slate-700">
                                            {editingCompteId === compte.id ? (
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={compteEditForm.solde_actuel}
                                                    onChange={(event) => setCompteEditForm((prev) => ({ ...prev, solde_actuel: event.target.value }))}
                                                    className="w-full px-2 py-1 border border-slate-300 rounded-md text-sm"
                                                />
                                            ) : (
                                                compte.solde_actuel
                                            )}
                                        </td>
                                        {(canWrite || canAdmin) && (
                                            <td className="px-4 py-2 text-right text-sm space-x-3">
                                                {canWrite && editingCompteId !== compte.id && (
                                                    <button type="button" onClick={() => startEditCompte(compte)} className="text-blue-600 hover:text-blue-800">
                                                        Modifier
                                                    </button>
                                                )}
                                                {canWrite && editingCompteId === compte.id && (
                                                    <>
                                                        <button type="button" onClick={() => saveEditCompte(compte.id)} className="text-emerald-600 hover:text-emerald-800">
                                                            Enregistrer
                                                        </button>
                                                        <button type="button" onClick={cancelEditCompte} className="text-slate-600 hover:text-slate-800">
                                                            Annuler
                                                        </button>
                                                    </>
                                                )}
                                                {canAdmin && (
                                                    <button
                                                        type="button"
                                                        onClick={() => requestDelete('compte', compte.id, compte.nom)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        Supprimer
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {filteredComptes.length === 0 && (
                                    <tr>
                                        <td colSpan={(canWrite || canAdmin) ? 5 : 4} className="px-4 py-6 text-center text-sm text-slate-500">
                                            Aucun compte trouve.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {activeTab === 'charges' && (
                <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
                    <h3 className="text-lg font-bold text-slate-900">Charges</h3>

                    {canWrite && (
                        <form onSubmit={handleCreateCharge} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <label className="text-xs font-semibold text-slate-600">
                                Type
                                <select
                                    value={chargeForm.type}
                                    onChange={(event) => setChargeForm((prev) => ({ ...prev, type: event.target.value }))}
                                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                >
                                    {CHARGE_TYPES.map((type) => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="text-xs font-semibold text-slate-600">
                                Vehicule
                                <select
                                    value={chargeForm.vehicule_id}
                                    onChange={(event) => setChargeForm((prev) => ({ ...prev, vehicule_id: event.target.value }))}
                                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                >
                                    <option value="">Aucun</option>
                                    {scopeVehicles.map((vehicle) => (
                                        <option key={vehicle.id} value={vehicle.id}>
                                            {vehicleLabelById[Number(vehicle.id)] || 'Vehicule inconnu'}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            {isSuperAdmin ? (
                                <label className="text-xs font-semibold text-slate-600">
                                    Agence
                                    <select
                                        value={chargeForm.agence_id}
                                        onChange={(event) => setChargeForm((prev) => ({ ...prev, agence_id: event.target.value }))}
                                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                        required
                                    >
                                        <option value="">Selectionner</option>
                                        {scopeAgences.map((agence) => (
                                            <option key={agence.id} value={agence.id}>{agence.nom}</option>
                                        ))}
                                    </select>
                                </label>
                            ) : (
                                <label className="text-xs font-semibold text-slate-600">
                                    Agence
                                    <input
                                        value={agenceById[Number(userAgenceId)] || "Pas d'agence"}
                                        className="mt-1 w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-md text-sm"
                                        disabled
                                    />
                                </label>
                            )}
                            <label className="text-xs font-semibold text-slate-600">
                                Categorie
                                <input
                                    value={chargeForm.categorie_charge}
                                    onChange={(event) => setChargeForm((prev) => ({ ...prev, categorie_charge: event.target.value }))}
                                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                />
                            </label>
                            <label className="text-xs font-semibold text-slate-600">
                                Montant
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={chargeForm.montant}
                                    onChange={(event) => setChargeForm((prev) => ({ ...prev, montant: event.target.value }))}
                                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                    required
                                />
                            </label>
                            <label className="text-xs font-semibold text-slate-600">
                                Date charge
                                <input
                                    type="datetime-local"
                                    value={chargeForm.date_charge}
                                    onChange={(event) => setChargeForm((prev) => ({ ...prev, date_charge: event.target.value }))}
                                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                />
                            </label>
                            <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                                Description
                                <input
                                    value={chargeForm.description}
                                    onChange={(event) => setChargeForm((prev) => ({ ...prev, description: event.target.value }))}
                                    className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                />
                            </label>
                            <div className="md:col-span-4">
                                <button type="submit" className="px-3 py-2 text-sm font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700">
                                    Ajouter charge
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <label className="text-xs font-semibold text-slate-600">
                            Recherche
                            <input
                                value={chargeFilters.search}
                                onChange={(event) => setChargeFilters((prev) => ({ ...prev, search: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                placeholder="Type, vehicule, categorie, agence..."
                            />
                        </label>
                        <label className="text-xs font-semibold text-slate-600">
                            Date charge du
                            <input
                                type="date"
                                value={chargeFilters.from}
                                onChange={(event) => setChargeFilters((prev) => ({ ...prev, from: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            />
                        </label>
                        <label className="text-xs font-semibold text-slate-600">
                            Date charge au
                            <input
                                type="date"
                                value={chargeFilters.to}
                                onChange={(event) => setChargeFilters((prev) => ({ ...prev, to: event.target.value }))}
                                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                            />
                        </label>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">ID</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Vehicule</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Agence</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Categorie</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Montant</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                                    {(canWrite || canAdmin) && <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredCharges.map((charge) => (
                                    <tr key={charge.id}>
                                        <td className="px-4 py-2 text-sm text-slate-700">{charge.id}</td>
                                        <td className="px-4 py-2 text-sm text-slate-700">
                                            {editingChargeId === charge.id ? (
                                                <select
                                                    value={chargeEditForm.type}
                                                    onChange={(event) => setChargeEditForm((prev) => ({ ...prev, type: event.target.value }))}
                                                    className="w-full px-2 py-1 border border-slate-300 rounded-md text-sm"
                                                >
                                                    {CHARGE_TYPES.map((type) => (
                                                        <option key={type} value={type}>{type}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                charge.type
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-slate-700">
                                            {charge.vehicule_id ? (vehicleLabelById[Number(charge.vehicule_id)] || 'Vehicule inconnu') : '-'}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-slate-700">{agenceById[Number(charge.agence_id)] || "Pas d'agence"}</td>
                                        <td className="px-4 py-2 text-sm text-slate-700">
                                            {editingChargeId === charge.id ? (
                                                <input
                                                    value={chargeEditForm.categorie_charge}
                                                    onChange={(event) => setChargeEditForm((prev) => ({ ...prev, categorie_charge: event.target.value }))}
                                                    className="w-full px-2 py-1 border border-slate-300 rounded-md text-sm"
                                                />
                                            ) : (
                                                charge.categorie_charge || '-'
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-slate-700">
                                            {editingChargeId === charge.id ? (
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={chargeEditForm.montant}
                                                    onChange={(event) => setChargeEditForm((prev) => ({ ...prev, montant: event.target.value }))}
                                                    className="w-full px-2 py-1 border border-slate-300 rounded-md text-sm"
                                                />
                                            ) : (
                                                charge.montant
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-slate-700">{formatDateTime(charge.date_charge)}</td>
                                        {(canWrite || canAdmin) && (
                                            <td className="px-4 py-2 text-right text-sm space-x-3">
                                                {canWrite && editingChargeId !== charge.id && (
                                                    <button type="button" onClick={() => startEditCharge(charge)} className="text-blue-600 hover:text-blue-800">
                                                        Modifier
                                                    </button>
                                                )}
                                                {canWrite && editingChargeId === charge.id && (
                                                    <>
                                                        <button type="button" onClick={() => saveEditCharge(charge.id)} className="text-emerald-600 hover:text-emerald-800">
                                                            Enregistrer
                                                        </button>
                                                        <button type="button" onClick={cancelEditCharge} className="text-slate-600 hover:text-slate-800">
                                                            Annuler
                                                        </button>
                                                    </>
                                                )}
                                                {canAdmin && (
                                                    <button
                                                        type="button"
                                                        onClick={() => requestDelete('charge', charge.id, `Charge #${charge.id}`)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        Supprimer
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {filteredCharges.length === 0 && (
                                    <tr>
                                        <td colSpan={(canWrite || canAdmin) ? 8 : 7} className="px-4 py-6 text-center text-sm text-slate-500">
                                            Aucune charge trouvee.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
            <ConfirmDialog
                open={deleteDialog.open}
                title="Confirmation de suppression"
                message={deleteDialog.label ? `Supprimer ${deleteDialog.label} ?` : 'Confirmer la suppression ?'}
                confirmLabel="Supprimer"
                confirmClassName="bg-rose-600 hover:bg-rose-700"
                loading={deleteDialog.loading}
                onCancel={closeDeleteDialog}
                onConfirm={confirmDelete}
            />
        </div>
    );
};

export default FinanceManagement;
