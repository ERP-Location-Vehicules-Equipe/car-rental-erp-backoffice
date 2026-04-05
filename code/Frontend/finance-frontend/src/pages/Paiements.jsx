import { useEffect, useState } from 'react'
import { paiementAPI, compteAPI } from '../services/api'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const MODES = ['especes', 'virement', 'cheque']
const MODE_BADGE = { especes: 'badge badge-success', virement: 'badge badge-info', cheque: 'badge badge-warning' }

export default function Paiements() {
  const [paiements, setPaiements] = useState([])
  const [comptes, setComptes] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ facture_id: '', compte_id: '', montant: '', mode: 'especes', reference: '' })
  const [loading, setLoading] = useState(false)

  const load = () => {
    paiementAPI.getAll()
      .then(r => setPaiements(r.data.paiements))
      .catch(() => toast.error('Erreur chargement paiements'))
    compteAPI.getAll()
      .then(r => setComptes(r.data.comptes))
      .catch(() => {})
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await paiementAPI.create({
        facture_id: Number(form.facture_id),
        compte_id: Number(form.compte_id),
        montant: Number(form.montant),
        mode: form.mode,
        reference: form.reference || null,
      })
      toast.success('Paiement enregistré')
      setShowModal(false)
      setForm({ facture_id: '', compte_id: '', montant: '', mode: 'especes', reference: '' })
      window.location.href = "/factures"
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur création')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce paiement ?')) return
    try {
      await paiementAPI.delete(id)
      toast.success('Paiement supprimé')
      load()
    } catch { toast.error('Erreur suppression') }
  }

  const fmt = (n) => Number(n || 0).toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })

  return (
    <div>
      <div className="page-header">
        <h1>Paiements</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Nouveau paiement
        </button>
      </div>

      <div className="card">
        {paiements.length === 0 ? (
          <div className="empty-state">Aucun paiement enregistré</div>
        ) : (
           <table className="data-table">
            <thead>
              <tr>
                <th>ID</th><th>Facture</th><th>Compte</th><th>Montant</th><th>Mode</th><th>Référence</th><th>Date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paiements.map(p => (
                <tr key={p.id}>
                  <td>#{p.id}</td>
                  <td>Facture #{p.facture_id}</td>
                  <td>
  {comptes.find(c => c.id === p.compte_id)?.nom || `Compte #${p.compte_id}`}
</td>
                  <td style={{ fontWeight: 600 }}>{fmt(p.montant)}</td>
                  <td><span className={MODE_BADGE[p.mode] || 'badge badge-info'}>{p.mode}</span></td>
                  <td style={{ color: 'var(--text-muted)' }}>{p.reference || '—'}</td>
                  <td>{new Date(p.date_paiement).toLocaleDateString('fr-MA')}</td>
                  <td>
                    <button className="btn btn-danger" style={{ padding: '0.3rem 0.6rem' }} onClick={() => handleDelete(p.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Nouveau Paiement</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>ID Facture</label>
                <input type="number" required value={form.facture_id} onChange={e => setForm({...form, facture_id: e.target.value})} placeholder="Ex: 1" />
              </div>
              <div className="form-group">
                <label>Compte de trésorerie</label>
                <select required value={form.compte_id} onChange={e => setForm({...form, compte_id: e.target.value})}>
                  <option value="">Sélectionner un compte</option>
                  {comptes.map(c => <option key={c.id} value={c.id}>{c.nom} ({c.type})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Montant (MAD)</label>
                <input type="number" step="0.01" required value={form.montant} onChange={e => setForm({...form, montant: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Mode de paiement</label>
                <select value={form.mode} onChange={e => setForm({...form, mode: e.target.value})}>
                  {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Référence (optionnel)</label>
                <input value={form.reference} onChange={e => setForm({...form, reference: e.target.value})} placeholder="Ex: VIR-2025-001" />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }} onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? '...' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}