/**
 * Extrait les erreurs backend au format:
 * { errors: [{ field: "code", message: "..." }] }
 */
export const getFieldErrors = (error) => {
    if (!error?.response?.data) {
        return {};
    }

    const backendErrors = error.response.data.errors;
    if (!Array.isArray(backendErrors)) {
        return {};
    }

    return backendErrors.reduce((acc, item) => {
        const field = item?.field || item?.path;
        const message = item?.message;

        if (
            typeof field === 'string' &&
            field.trim() !== '' &&
            typeof message === 'string' &&
            message.trim() !== ''
        ) {
            acc[field] = message;
        }

        return acc;
    }, {});
};

/**
 * Utilitaire global pour traiter et afficher proprement les erreurs backend.
 */
export const getErrorMessage = (error, defaultMessage = "Une erreur est survenue. Veuillez reessayer.") => {
    if (!error.response) {
        return "Erreur reseau : le serveur est injoignable ou la connexion a echoue.";
    }

    const data = error.response.data;
    const detail = data?.detail;
    const message = data?.message;
    const fieldErrors = getFieldErrors(error);

    if (Object.keys(fieldErrors).length > 0) {
        return "Veuillez corriger les erreurs du formulaire.";
    }

    if (typeof detail === 'string') {
        const lowerDetail = detail.toLowerCase();

        if (lowerDetail.includes('email already exists') || lowerDetail.includes('already registered')) {
            return "Cette adresse email est deja utilisee par un autre compte.";
        }
        if (lowerDetail.includes('invalid credentials') || lowerDetail.includes('incorrect')) {
            return "Adresse email ou mot de passe incorrect.";
        }
        if (lowerDetail.includes('account is inactive') || lowerDetail.includes('inactive account')) {
            return "Votre compte n'est pas actif. Merci de contacter votre administrateur.";
        }
        if (lowerDetail.includes('user not found')) {
            return "Cet utilisateur est introuvable.";
        }
        if (lowerDetail.includes('invalid refresh token') || lowerDetail.includes('expired')) {
            return "Votre session est expiree ou invalide. Veuillez vous reconnecter.";
        }
        if (lowerDetail.includes('not enough permissions') || lowerDetail.includes('admin')) {
            return "Acces refuse. Vous n'avez pas les droits d'administration necessaires.";
        }
        if (lowerDetail.includes('agence not found')) {
            return 'Agence not found';
        }

        return detail;
    }

    if (Array.isArray(detail)) {
        const messages = detail.map((d) => {
            if (d.msg.includes('value is not a valid email')) return 'Adresse email invalide';
            if (d.msg.includes('field required')) return 'Un champ obligatoire est manquant';
            return d.msg;
        });
        return "Erreurs de validation : " + messages.join(', ');
    }

    if (typeof message === 'string' && message.trim() !== '') {
        if (message.toLowerCase().includes('agence not found')) {
            return 'Agence not found';
        }
        return message;
    }

    if (error.response.status === 400) {
        return "Erreur de validation des donnees.";
    }
    if (error.response.status === 403) {
        return "Action non autorisee.";
    }
    if (error.response.status === 404) {
        return "La ressource demandee n'existe pas.";
    }
    if (error.response.status >= 500) {
        return "Erreur interne du serveur.";
    }

    return defaultMessage;
};
