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
import AgencesList from './Pages/Agences/AgencesList';
import CreateAgence from './Pages/Agences/CreateAgence';
import EditAgence from './Pages/Agences/EditAgence';
import AgenceDetail from './Pages/Agences/AgenceDetail';

function App() {
  const [isInitializing, setIsInitializing] = useState(true);

  // Validation du token a l'ouverture de l'application
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          // On valide le token aupres du backend
          // Si invalide, l'intercepteur catchera le 401 et nettoiera le storage
          await userService.getProfile();
        } catch (error) {
          // Si l'appel echoue pour d'autres raisons (token expire gere par intercepteur)
          // On force la deconnexion par securite de l'interface
          if (error?.response?.status !== 401) {
            authService.logout();
          }
        }
      }
      setIsInitializing(false);
    };

    checkAuthStatus();
  }, []);

  // Ecran de chargement pour empecher le clignotement des pages protegees
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 border-t-2 border-t-transparent shadow-sm"></div>
          <p className="text-slate-500 font-medium animate-pulse">Verification des acces au systeme ERP...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Route publique - Page de connexion protegee contre les utilisateurs deja connectes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Routes protegees avec le Layout principal (Navbar etc.) */}
        {/* On englobe TOUT le Layout dans un ProtectedRoute pour qu'il ne flash jamais sans token */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          {/* Redirection depuis la racine vers le tableau de bord */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard, profil et agences: accessibles a tous les utilisateurs connectes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/agences" element={<AgencesList />} />
          <Route path="/agences/:id" element={<AgenceDetail />} />

          {/* Routes d'administration: reservees aux admins */}
          <Route
            path="/agences/create"
            element={
              <ProtectedRoute requireAdmin={true}>
                <CreateAgence />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agences/edit/:id"
            element={
              <ProtectedRoute requireAdmin={true}>
                <EditAgence />
              </ProtectedRoute>
            }
          />
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
