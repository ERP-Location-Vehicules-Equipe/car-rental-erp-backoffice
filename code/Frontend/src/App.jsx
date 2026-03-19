import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Layouts & Protection
import MainLayout from './Layouts/MainLayout';
import ProtectedRoute from './Routes/ProtectedRoute';

// Pages
import Login from './Pages/Auth/Login';
import Dashboard from './Pages/Dashboard/Dashboard';
import Profile from './Pages/Profile/Profile';
import UsersList from './Pages/Users/UsersList';
import CreateUser from './Pages/Users/CreateUser';
import EditUser from './Pages/Users/EditUser';

function App() {
  return (
    <Router>
      <Routes>
        {/* Route publique - Page de connexion */}
        <Route path="/login" element={<Login />} />

        {/* Routes protégées avec le Layout principal (Navbar etc.) */}
        <Route element={<MainLayout />}>
          {/* Redirection depuis la racine vers le tableau de bord */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard et Profil: accessibles à TOUS les utilisateurs connectés */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
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
