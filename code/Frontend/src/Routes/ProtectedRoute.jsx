import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authService from '../Services/authService';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
    const isAuthenticated = authService.isAuthenticated();
    const isAdmin = authService.isAdmin();
    const location = useLocation();

    if (!isAuthenticated) {
        // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
        // en gardant l'historique de la page demandée
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requireAdmin && !isAdmin) {
        // Rediriger l'utilisateur standard vers le tableau de bord s'il essaye d'accéder à une page admin
        return <Navigate to="/dashboard" replace />;
    }

    // Si tout est ok, afficher le composant enfant
    return children;
};

export default ProtectedRoute;
