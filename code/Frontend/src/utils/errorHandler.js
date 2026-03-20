/**
 * utilitaire global pour traiter, traduire en français et sécuriser l'affichage
 * des erreurs en provenance du backend FastAPI, sans utiliser les logs console.
 */
export const getErrorMessage = (error, defaultMessage = "Une erreur est survenue. Veuillez réessayer.") => {
    // Bloquer ou ignorer si l'erreur n'a pas de détails (erreur réseau par exemple)
    if (!error.response) {
        return "Erreur réseau : le serveur est injoignable ou la connexion a échoué.";
    }

    // Intercepter les erreurs de validation / d'auth du backend
    if (error.response.data && error.response.data.detail) {
        const detail = error.response.data.detail;

        if (typeof detail === 'string') {
            const lowerDetail = detail.toLowerCase();

            if (lowerDetail.includes('email already exists') || lowerDetail.includes('already registered')) {
                return "Cette adresse email est déjà utilisée par un autre compte.";
            }
            if (lowerDetail.includes('invalid credentials') || lowerDetail.includes('incorrect')) {
                return "Adresse email ou mot de passe incorrect.";
            }
            if (lowerDetail.includes('user not found')) {
                return "Cet utilisateur est introuvable.";
            }
            if (lowerDetail.includes('invalid refresh token') || lowerDetail.includes('expired')) {
                return "Votre session est expirée ou invalide. Veuillez vous reconnecter.";
            }
            if (lowerDetail.includes('not enough permissions') || lowerDetail.includes('admin')) {
                return "Accès refusé. Vous n'avez pas les droits d'administration nécessaires.";
            }

            // Si le texte de l'erreur n'est pas reconnu mais est propre, on l'affiche
            return detail;
        } else if (Array.isArray(detail)) {
            // Erreurs Pydantic FastAPI
            const messages = detail.map(d => {
                if (d.msg.includes('value is not a valid email')) return 'Adresse email invalide';
                if (d.msg.includes('field required')) return 'Un champ obligatoire est manquant';
                return d.msg;
            });
            return "Erreurs de validation : " + messages.join(', ');
        }

        return "Erreur de validation des données.";
    }
    if (error.response.status === 400) {
        return "Erreur de validation des données.";
    }
    if (error.response.status === 403) {
        return "Action non autorisée.";
    }
    if (error.response.status === 404) {
        return "La ressource demandée n'existe pas.";
    }
    if (error.response.status >= 500) {
        return "Erreur interne du serveur. Nos équipes ont été notifiées.";
    }

    return defaultMessage;
};
