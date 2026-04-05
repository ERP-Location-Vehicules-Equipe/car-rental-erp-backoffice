import { useEffect, useState } from 'react'
import api from '../services/api'
import { TrendingUp, TrendingDown, FileText, Landmark, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts'

const fmt = (n) =>
  Number(n || 0).toLocaleString('fr-MA', {
    style: 'currency',
    currency: 'MAD'
  })

// ================= KPI CARD =================
function KpiCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {label}
          </div>

          <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>
            {value}
          </div>

          {sub && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {sub}
            </div>
          )}
        </div>

        <Icon size={20} color={color} />
      </div>
    </div>
  )
}

// ================= BUILD CHART =================
const buildChartData = (paiements, charges) => {
  const months = [
    'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
    'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
  ]

  return months.map((m, index) => {

    const revenus = paiements
      .filter(p => new Date(p.date_paiement).getMonth() === index)
      .reduce((acc, p) => acc + Number(p.montant || 0), 0)

    const totalCharges = charges
      .filter(c => new Date(c.date_charge).getMonth() === index)
      .reduce((acc, c) => acc + Number(c.montant || 0), 0)

    return {
      name: m,
      revenus,
      charges: totalCharges
    }
  })
}

// ================= DASHBOARD =================
export default function Dashboard() {

  const [stats, setStats] = useState(null)
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {

        const [paiementsRes, chargesRes, comptesRes, facturesRes] = await Promise.all([
          api.get('/paiements/'),
          api.get('/charges/'),
          api.get('/comptes/'),
          api.get('/factures/')
        ])

        const paiements = paiementsRes.data.paiements || []
        const charges = chargesRes.data.charges || []
        const comptes = comptesRes.data.comptes || []
        const factures = facturesRes.data.factures || []

        // ================= KPI =================
        const totalPaiements = paiements.reduce((acc, p) => acc + Number(p.montant || 0), 0)
        const totalCharges = charges.reduce((acc, c) => acc + Number(c.montant || 0), 0)

        const soldeTresorerie = comptes.reduce(
          (acc, c) => acc + Number(c.solde_actuel),
          0
        )

        const facturesPayees = factures.filter(f => f.statut === 'payée').length
        const facturesNonPayees = factures.filter(f => f.statut !== 'payée').length

        setStats({
          chiffre_affaires: totalPaiements,
          total_charges: totalCharges,
          resultat_net: totalPaiements - totalCharges,
          solde_tresorerie: soldeTresorerie,
          total_factures: factures.length,
          factures_payees: facturesPayees,
          factures_non_payees: facturesNonPayees
        })

        // ================= CHART =================
        const chart = buildChartData(paiements, charges)
        setChartData(chart)

      } catch (err) {
        toast.error('Erreur chargement')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <div style={{ padding: '2rem' }}>Chargement...</div>
  if (!stats) return <div style={{ padding: '2rem' }}>Erreur</div>

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>

      {/* HEADER */}
      <div className="page-header">
        <h1>Dashboard Financier</h1>
      </div>

      {/* KPI */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <KpiCard label="Chiffre d'affaires" value={fmt(stats.chiffre_affaires)} icon={TrendingUp} color="green" />
        <KpiCard label="Charges" value={fmt(stats.total_charges)} icon={TrendingDown} color="red" />
        <KpiCard label="Résultat" value={fmt(stats.resultat_net)} icon={TrendingUp} color="blue" />
        <KpiCard label="Trésorerie" value={fmt(stats.solde_tresorerie)} icon={Landmark} color="purple" />
        <KpiCard label="Factures" value={stats.total_factures} icon={FileText} color="black" sub={`${stats.factures_payees} payées`} />
        <KpiCard label="Impayées" value={stats.factures_non_payees} icon={XCircle} color="orange" />
      </div>

      {/* CHART */}
      <div className="card">
        <h3>📈 Évolution financière</h3>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />

            <Line
              type="monotone"
              dataKey="revenus"
              stroke="#16a34a"
              strokeWidth={3}
            />

            <Line
              type="monotone"
              dataKey="charges"
              stroke="#dc2626"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}