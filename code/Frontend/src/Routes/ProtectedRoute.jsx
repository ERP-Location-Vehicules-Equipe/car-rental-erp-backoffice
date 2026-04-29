import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authService from '../Services/authService';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const isAuthenticated = authService.isAuthenticated();
    const currentUser = authService.getCurrentUser();
    const location = useLocation();

    if (!isAuthenticated) {
        // Redirection vers /login en conservant la route demandee.
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
        const hasAccess = allowedRoles.includes(currentUser?.role);
        if (!hasAccess) {
            // Utilisateur connecte mais sans role autorise sur la route.
            return <Navigate to="/dashboard" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
