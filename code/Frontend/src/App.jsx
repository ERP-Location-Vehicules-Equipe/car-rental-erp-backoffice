import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';

import authService from './Services/authService';
import userService from './Services/userService';

// Layouts & protection
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

    // Validation du token au demarrage.
    useEffect(() => {
        const checkAuthStatus = async () => {
            const token = localStorage.getItem('access_token');
            if (token) {
                try {
                    await userService.getProfile();
                } catch (error) {
                    if (error?.response?.status !== 401) {
                        authService.logout();
                    }
                }
            }
            setIsInitializing(false);
        };

        checkAuthStatus();
    }, []);

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
                {/* Route publique */}
                <Route
                    path="/login"
                    element={(
                        <PublicRoute>
                            <Login />
                        </PublicRoute>
                    )}
                />

                {/* Routes protegees avec layout principal */}
                <Route
                    element={(
                        <ProtectedRoute>
                            <MainLayout />
                        </ProtectedRoute>
                    )}
                >
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />

                    {/* Routes accessibles a tout utilisateur authentifie */}
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/agences" element={<AgencesList />} />
                    <Route path="/agences/:id" element={<AgenceDetail />} />

                    {/* Gestion agences: super_admin uniquement */}
                    <Route
                        path="/agences/create"
                        element={(
                            <ProtectedRoute allowedRoles={[authService.ROLE_SUPER_ADMIN]}>
                                <CreateAgence />
                            </ProtectedRoute>
                        )}
                    />
                    <Route
                        path="/agences/edit/:id"
                        element={(
                            <ProtectedRoute allowedRoles={[authService.ROLE_SUPER_ADMIN]}>
                                <EditAgence />
                            </ProtectedRoute>
                        )}
                    />

                    {/* Gestion users: admin + super_admin */}
                    <Route
                        path="/users"
                        element={(
                            <ProtectedRoute allowedRoles={[authService.ROLE_ADMIN, authService.ROLE_SUPER_ADMIN]}>
                                <UsersList />
                            </ProtectedRoute>
                        )}
                    />
                    <Route
                        path="/users/create"
                        element={(
                            <ProtectedRoute allowedRoles={[authService.ROLE_ADMIN, authService.ROLE_SUPER_ADMIN]}>
                                <CreateUser />
                            </ProtectedRoute>
                        )}
                    />
                    <Route
                        path="/users/:id"
                        element={(
                            <ProtectedRoute allowedRoles={[authService.ROLE_ADMIN, authService.ROLE_SUPER_ADMIN]}>
                                <UserDetail />
                            </ProtectedRoute>
                        )}
                    />
                    <Route
                        path="/users/edit/:id"
                        element={(
                            <ProtectedRoute allowedRoles={[authService.ROLE_ADMIN, authService.ROLE_SUPER_ADMIN]}>
                                <EditUser />
                            </ProtectedRoute>
                        )}
                    />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
