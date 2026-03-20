import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import authService from './Services/authService';
import userService from './Services/userService';

// Layouts & Protection
import MainLayout from './Layouts/MainLayout';
import ProtectedRoute from './Routes/ProtectedRoute';
import PublicRoute from './Routes/PublicRoute';

// Pages
import Login from './Pages/Auth/Login';
import Dashboard from './Pages/Dashboard/Dashboard';
import Profile from './Pages/Profile/Profile';
import UsersList from './Pages/Users/UsersList';
import CreateUser from './Pages/Users/CreateUser';
import EditUser from './Pages/Users/EditUser';
import UserDetail from './Pages/Users/UserDetail';

function App() {
  const [isInitializing, setIsInitializing] = useState(true);

  // Validation du token à l'ouverture de l'application
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          // On valide le token auprès du backend
          // Si invalide, l'intercepteur catchera le 401 et nettoiera le storage
          await userService.getProfile();
        } catch (error) {
          // Si l'appel échoue pour d'autres raisons (token expiré géré par intercepteur)
          // On force la déconnexion par sécurité de l'interface
          if (error?.response?.status !== 401) {
            authService.logout();
          }
        }
      }
      setIsInitializing(false);
    };

    checkAuthStatus();
  }, []);

  // Écran de chargement pour empêcher le clignotement des pages protégées
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 border-t-2 border-t-transparent shadow-sm"></div>
          <p className="text-slate-500 font-medium animate-pulse">Vérification des accès au système ERP...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Route publique - Page de connexion protégée contre les utilisateurs déjà connectés */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Routes protégées avec le Layout principal (Navbar etc.) */}
        {/* On englobe TOUT le Layout dans un ProtectedRoute pour qu'il ne 'flash' jamais sans token ! */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          {/* Redirection depuis la racine vers le tableau de bord */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard et Profil: accessibles à TOUS les utilisateurs connectés */}
          <Route
            path="/dashboard"
            element={
              <Dashboard />
            }
          />
          <Route
            path="/profile"
            element={
              <Profile />
            }
          />

          {/* Routes d'administration: réservées aux admins */}
          <Route
            path="/users"
            element={
              <ProtectedRoute requireAdmin={true}>
                <UsersList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/create"
            element={
              <ProtectedRoute requireAdmin={true}>
                <CreateUser />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/:id"
            element={
              <ProtectedRoute requireAdmin={true}>
                <UserDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/edit/:id"
            element={
              <ProtectedRoute requireAdmin={true}>
                <EditUser />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Route 404 - Redirection vers accueil si la route n'existe pas */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
