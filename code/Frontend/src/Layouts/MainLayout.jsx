import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import authService from '../Services/authService';

const MainLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const canManageUsers = authService.canManageUsers();

    const handleLogout = () => {
        authService.logout();
        navigate('/login');
    };

    const menuItems = [
        { name: 'Tableau de bord', path: '/dashboard' },
        { name: 'Agences', path: '/agences' },
        { name: 'Gestion Parc', path: '/fleet' },
        { name: 'Profil', path: '/profile' },
    ];

    // Le menu utilisateurs est visible pour admin et super_admin.
    if (canManageUsers) {
        menuItems.splice(2, 0, { name: 'Utilisateurs', path: '/users' });
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <nav className="bg-white shadow border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <img
                                    className="h-8 w-auto object-contain"
                                    src="/src/images/logo.png"
                                    alt="Logo ERP"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://ui-avatars.com/api/?name=ERP&background=0284c7&color=fff&rounded=true';
                                    }}
                                />
                                <span className="ml-3 font-bold text-xl text-slate-800 tracking-tight">ERP Auto</span>
                            </div>
                            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                                {menuItems.map((item) => {
                                    const isActive = location.pathname.startsWith(item.path);
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            className={`${isActive
                                                ? 'border-blue-600 text-slate-900'
                                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                                            } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-150`}
                                        >
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex items-center">
                            <button
                                onClick={handleLogout}
                                className="ml-8 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors duration-150"
                            >
                                Deconnexion
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="flex-1 w-full mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-7xl">
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;
