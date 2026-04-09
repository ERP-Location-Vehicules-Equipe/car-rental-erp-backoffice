import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useNavigate } from 'react-router-dom';

import authService from './Services/authService';
import userService from './Services/userService';

import MainLayout from './Layouts/MainLayout';
import ProtectedRoute from './Routes/ProtectedRoute';
import PublicRoute from './Routes/PublicRoute';

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
import TransferListPage from './Pages/TransferListPage';
import TransferCreatePage from './Pages/TransferCreatePage';
import FleetManagement from './Pages/Fleet/FleetManagement';
import LocationsManagement from './Pages/Locations/LocationsManagement';

function TransferListRoute() {
    const navigate = useNavigate();
    return <TransferListPage onCreateClick={() => navigate('/transferts/create')} />;
}

function TransferCreateRoute() {
    const navigate = useNavigate();
    return (
        <TransferCreatePage
            onBackToList={() => navigate('/transferts')}
            onCreated={() => navigate('/transferts')}
        />
    );
}

function App() {
    const [isInitializing, setIsInitializing] = useState(true);

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
                <Route
                    path="/login"
                    element={(
                        <PublicRoute>
                            <Login />
                        </PublicRoute>
                    )}
                />

                <Route
                    element={(
                        <ProtectedRoute>
                            <MainLayout />
                        </ProtectedRoute>
                    )}
                >
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />

                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/agences" element={<AgencesList />} />
                    <Route path="/agences/:id" element={<AgenceDetail />} />
                    <Route path="/fleet" element={<FleetManagement />} />
                    <Route path="/locations" element={<LocationsManagement />} />
                    <Route path="/transferts" element={<TransferListRoute />} />
                    <Route path="/transferts/create" element={<TransferCreateRoute />} />

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
