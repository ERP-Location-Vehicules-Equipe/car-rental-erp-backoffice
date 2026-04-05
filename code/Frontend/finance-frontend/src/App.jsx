import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

// Layout
import Layout from './components/Layout'

// Pages
import Dashboard from './pages/Dashboard'
import Factures from './pages/Factures'
import Paiements from './pages/Paiements'
import Comptes from './pages/Comptes'
import Charges from './pages/Charges'
import Rapports from './pages/Rapports'
import Login from './pages/Login'

// 🔐 Protected Route
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("access_token")

  if (!token) {
    return <Navigate to="/login" />
  }

  return children
}

export default function App() {
  return (
    <BrowserRouter>

      <Toaster position="top-right" />

      <Routes>

        {/* 🔓 Login */}
        <Route path="/login" element={<Login />} />

        {/* 🔒 Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="factures" element={<Factures />} />
          <Route path="paiements" element={<Paiements />} />
          <Route path="comptes" element={<Comptes />} />
          <Route path="charges" element={<Charges />} />
          <Route path="rapports" element={<Rapports />} />
        </Route>

        {/* fallback */}
        <Route path="*" element={<Navigate to="/login" />} />

      </Routes>

    </BrowserRouter>
  )
}