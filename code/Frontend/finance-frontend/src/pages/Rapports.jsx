import { useEffect, useState } from 'react'
import api from '../services/api'
import { Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { jsPDF } from "jspdf"
import logo from '../assets/logo.png'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell
} from 'recharts'

const fmt = (n) =>
  Number(n || 0).toLocaleString('fr-MA', {
    style: 'currency',
    currency: 'MAD'
  })

export default function Rapports() {

  const [data, setData] = useState({
    factures: [],
    paiements: [],
    charges: []
  })

  const [type, setType] = useState('mensuel')
  const [date, setDate] = useState('')
  const [result, setResult] = useState(null)

  // ================= LOAD =================
  useEffect(() => {
    Promise.all([
      api.get('/factures/'),
      api.get('/paiements/'),
      api.get('/charges/')
    ])
      .then(([fRes, pRes, cRes]) => {
        setData({
          factures: fRes.data.factures || [],
          paiements: pRes.data.paiements || [],
          charges: cRes.data.charges || []
        })
      })
      .catch(() => toast.error('Erreur chargement'))
  }, [])

  // ================= GENERATE =================
  const generateRapport = () => {

    if (!date) return toast.error("Choisir une date")

    let { factures, paiements, charges } = data

    if (type === 'mensuel') {

      factures = factures.filter(f =>
        new Date(f.date_emission).toISOString().slice(0,7) === date
      )

      paiements = paiements.filter(p =>
        new Date(p.date_paiement).toISOString().slice(0,7) === date
      )

      charges = charges.filter(c =>
        new Date(c.date_charge).toISOString().slice(0,7) === date
      )

    } else {

      // 🔥 FIX FINAL ANNUEL
      const year = date.trim()

      factures = factures.filter(f =>
        f.date_emission?.slice(0, 4) === year
      )

      paiements = paiements.filter(p =>
        p.date_paiement?.slice(0, 4) === year
      )

      charges = charges.filter(c =>
        c.date_charge?.slice(0, 4) === year
      )

      // debug
      console.log("Year:", year)
      console.log("Factures:", factures)
    }

    const totalFactures = factures.reduce((acc, f) => acc + Number(f.montant_ttc || 0), 0)
    const totalPaiements = paiements.reduce((acc, p) => acc + Number(p.montant || 0), 0)
    const totalCharges = charges.reduce((acc, c) => acc + Number(c.montant || 0), 0)

    setResult({
      totalFactures,
      totalPaiements,
      totalCharges,
      solde: totalPaiements - totalCharges,
      count: factures.length
    })

    if (factures.length === 0 && type === "annuel") {
      toast("Aucune donnée pour cette année")
    }
  }

  // ================= PDF =================
 const downloadPDF = () => {

  if (!result) return toast.error("Générer d'abord")

  const doc = new jsPDF()

  // ================= LOGO =================
  const img = new Image()
  img.src = logo

  img.onload = () => {

    doc.addImage(img, 'PNG', 15, 10, 30, 30)

    // ================= HEADER =================
    doc.setFontSize(20)
    doc.setTextColor(40)
    doc.text("RAPPORT FINANCIER", 60, 25)

    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text("ERP Location de Véhicules", 60, 32)

    // ================= LINE =================
    doc.setDrawColor(0)
    doc.line(10, 45, 200, 45)

    // ================= INFOS =================
    doc.setFontSize(12)
    doc.setTextColor(0)

    doc.text(`Type: ${type}`, 15, 55)
    doc.text(`Date: ${date}`, 15, 63)

    // ================= BOX =================
    doc.setDrawColor(200)
    doc.rect(10, 70, 190, 70)

    // ================= DATA =================
    doc.setFontSize(12)

    doc.text(`Total Factures :`, 20, 85)
    doc.text(fmt(result.totalFactures), 140, 85)

    doc.text(`Total Paiements :`, 20, 95)
    doc.text(fmt(result.totalPaiements), 140, 95)

    doc.text(`Total Charges :`, 20, 105)
    doc.text(fmt(result.totalCharges), 140, 105)

    // ================= RESULT =================
    doc.setFontSize(14)

    if (result.solde >= 0) {
      doc.setTextColor(0, 150, 0)
    } else {
      doc.setTextColor(200, 0, 0)
    }

    doc.text(`Résultat Net : ${fmt(result.solde)}`, 20, 125)

    // ================= FOOTER =================
    doc.setTextColor(120)
    doc.setFontSize(9)
    doc.text("Finance Service - ERP", 15, 150)
    doc.text(`Généré le: ${new Date().toLocaleDateString()}`, 140, 150)

    doc.save(`rapport-${type}-${date}.pdf`)
  }
}

  // ================= CHART =================
  const chartData = result
    ? [
        { name: 'Factures', value: result.totalFactures },
        { name: 'Paiements', value: result.totalPaiements },
        { name: 'Charges', value: result.totalCharges },
        { name: 'Résultat', value: result.solde }
      ]
    : []

  const colors = ['#0004ff', '#07a140', '#fa0000', '#de910b']

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>

      <div className="page-header">
        <h1>Rapports Financiers</h1>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3>📊 Générer un rapport</h3>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>

          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="mensuel">Mensuel</option>
            <option value="annuel">Annuel</option>
          </select>

          {type === 'mensuel' ? (
            <input type="month" value={date} onChange={e => setDate(e.target.value)} />
          ) : (
            <input type="number" placeholder="2026" value={date} onChange={e => setDate(e.target.value)} />
          )}

          <button className="btn btn-primary" onClick={generateRapport}>
            Générer
          </button>

          <button className="btn btn-success" onClick={downloadPDF}>
            <Download size={14} /> PDF
          </button>

        </div>
      </div>

      {result && (
        <div className="card">
          <h3>📊 Analyse</h3>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />

              <Bar dataKey="value">
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={colors[index]} />
                ))}
              </Bar>

            </BarChart>
          </ResponsiveContainer>

        </div>
      )}

    </div>
  )
}