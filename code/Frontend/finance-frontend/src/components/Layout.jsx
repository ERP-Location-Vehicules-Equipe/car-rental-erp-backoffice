import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FileText, CreditCard, Landmark, TrendingDown, BarChart2, LogOut } from 'lucide-react'
import logo from '../assets/logo.png'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/factures',  icon: FileText,        label: 'Factures' },
  { to: '/paiements', icon: CreditCard,      label: 'Paiements' },
  { to: '/comptes',   icon: Landmark,        label: 'Trésorerie' },
  { to: '/charges',   icon: TrendingDown,    label: 'Charges' },
  { to: '/rapports',  icon: BarChart2,       label: 'Rapports' },
]

export default function Layout() {

  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    navigate("/login")
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* Top Navbar */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0 1.5rem',
        height: 60,
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 100,
      }}>

        {/* Logo + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1.5rem' }}>
          <img src={logo} alt="logo" style={{ width: 60, height: 60 }} />
          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
            Finance Service
          </span>
        </div>

        {/* Nav Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1 }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: 500,
                color: isActive ? '#fff' : 'var(--text-muted)',
                background: isActive ? 'var(--primary)' : 'transparent',
                whiteSpace: 'nowrap',
              })}
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.9rem',
            borderRadius: '8px',
            border: 'none',
            background: '#ef4444',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          <LogOut size={15} />
          Déconnexion
        </button>

      </header>

      {/* Main Content */}
      <main style={{ marginTop: 60, flex: 1, padding: '2rem' }}>
        <Outlet />
      </main>

    </div>
  )
}
