import { useEffect, useState } from 'react'
import { factureAPI } from '../services/api'
import { Plus, Trash2, FileDown, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { jsPDF } from "jspdf"
import logo from '../assets/logo.png'

const STATUT_BADGE = {
  payée: 'badge badge-success',
  en_attente: 'badge badge-warning'
}

const STATUT_LABEL = {
  payée: 'Payée',
  en_attente: 'En attente'
}

export default function Factures() {

  const [factures, setFactures] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)

  const [form, setForm] = useState({
    location_id: '',
    montant_ht: '',
    tva: '20'
  })

  const [loading, setLoading] = useState(false)

  // ================= LOAD =================
  const load = () => {
    const req = showDeleted
      ? factureAPI.getDeleted()
      : factureAPI.getAll()

    req
      .then(r => setFactures(r.data.factures))
      .catch(() => toast.error('Erreur chargement'))
  }

  useEffect(() => { load() }, [showDeleted])

  // ================= CREATE =================
  const handleCreate = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await factureAPI.create({
        location_id: Number(form.location_id),
        montant_ht: Number(form.montant_ht),
        tva: Number(form.tva)
      })

      toast.success('Facture créée')
      setShowModal(false)
      setForm({ location_id: '', montant_ht: '', tva: '20' })
      load()

    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  // ================= DELETE =================
  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette facture ?')) return

    try {
      await factureAPI.delete(id)
      toast.success('Facture supprimée')
      load()
    } catch {
      toast.error('Erreur suppression')
    }
  }

  // ================= RESTORE =================
  const handleRestore = async (id) => {
    try {
      await factureAPI.restore(id)
      toast.success('Facture restaurée')
      load()
    } catch {
      toast.error('Erreur restauration')
    }
  }

  // ================= PDF =================
  const generatePDF = (f) => {

    const doc = new jsPDF()
    const img = new Image()
    img.src = logo

    img.onload = () => {

      doc.addImage(img, 'PNG', 15, 10, 30, 30)

      doc.setFontSize(20)
      doc.text("FACTURE", 60, 25)

      doc.setFontSize(10)
      doc.text("ERP Location de Véhicules", 60, 32)

      doc.line(10, 45, 200, 45)

      doc.setFontSize(12)

      doc.text(`Numéro: ${f.numero}`, 15, 55)
      doc.text(`Date: ${new Date(f.date_emission).toLocaleDateString()}`, 15, 63)
      doc.text(`Location ID: #${f.location_id}`, 15, 71)

      doc.rect(10, 80, 190, 70)

      doc.text(`Montant HT :`, 20, 95)
      doc.text(`${f.montant_ht} MAD`, 140, 95)

      doc.text(`TVA (${f.tva}%) :`, 20, 105)
      doc.text(`${(f.montant_ht * f.tva / 100).toFixed(2)} MAD`, 140, 105)

      doc.text(`Montant TTC :`, 20, 115)
      doc.text(`${f.montant_ttc} MAD`, 140, 115)

      if (f.statut === "payée") {
        doc.setTextColor(0, 150, 0)
      } else {
        doc.setTextColor(200, 0, 0)
      }

      doc.text(`Statut : ${STATUT_LABEL[f.statut]}`, 20, 135)

      doc.setTextColor(120)
      doc.setFontSize(9)

      doc.text("Finance Service - ERP", 15, 155)
      doc.text(`Généré le: ${new Date().toLocaleDateString()}`, 140, 155)

      doc.save(`facture-${f.numero}.pdf`)
    }
  }

  const fmt = (n) =>
    Number(n || 0).toLocaleString('fr-MA', {
      style: 'currency',
      currency: 'MAD'
    })

  return (
    <div>

      {/* HEADER */}
      <div className="page-header">
        <h1>Factures</h1>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn" onClick={() => setShowDeleted(!showDeleted)}>
            {showDeleted ? "Factures actives" : "Factures supprimées"}
          </button>

          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Nouvelle facture
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="card">

        {factures.length === 0 ? (
          <div className="empty-state">Aucune facture trouvée</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Location ID</th>
                <th>Montant HT</th>
                <th>TVA %</th>
                <th>Montant TTC</th>
                <th>Date émission</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {factures.map(f => (
                <tr key={f.id}>

                  <td>{f.numero}</td>
                  <td>#{f.location_id}</td>
                  <td>{fmt(f.montant_ht)}</td>
                  <td>{f.tva}%</td>
                  <td>{fmt(f.montant_ttc)}</td>
                  <td>{new Date(f.date_emission).toLocaleDateString('fr-MA')}</td>

                  <td>
                    <span className={STATUT_BADGE[f.statut]}>
                      {STATUT_LABEL[f.statut]}
                    </span>
                  </td>

                  <td style={{ display: 'flex', gap: '0.4rem' }}>

                    {!showDeleted && (
                      <>
                        <button onClick={() => generatePDF(f)}>
                          <FileDown size={14} />
                        </button>

                        <button onClick={() => handleDelete(f.id)}>
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}

                    {showDeleted && (
                      <button
                        onClick={() => handleRestore(f.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.3rem 0.7rem',
                          backgroundColor: '#22c55e',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: '500'
                        }}
                      >
                        <RotateCcw size={13} /> Restaurer
                      </button>
                    )}

                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        )}

      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>

            <h3>Nouvelle Facture</h3>

            <form onSubmit={handleCreate}>

              <div className="form-group">
                <label>Location ID</label>
                <input
                  type="number"
                  required
                  placeholder="Ex: 1"
                  value={form.location_id}
                  onChange={e => setForm({...form, location_id: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Montant HT (MAD)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Ex: 1500.00"
                  value={form.montant_ht}
                  onChange={e => setForm({...form, montant_ht: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>TVA (%)</label>
                <input
                  type="number"
                  required
                  placeholder="Ex: 20"
                  value={form.tva}
                  onChange={e => setForm({...form, tva: e.target.value})}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}
                  onClick={() => setShowModal(false)}
                >
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? '...' : 'Créer'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  )
}