import React from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../Services/authService';

const PublicRoute = ({ children }) => {
    // Si l'utilisateur est déjà connecté, on l'empêche d'aller sur /login et autres pages publiques
    if (authService.isAuthenticated()) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default PublicRoute;
