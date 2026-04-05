import { useEffect, useState } from 'react'
import { chargeAPI } from '../services/api'
import { Plus, Trash2, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES = [
  'maintenance', 'reparation', 'assurance', 'credit',
  'personnel', 'loyer', 'telephone', 'CNSS', 'TVA', 'impots', 'dons', 'autres'
]

const CAT_COLORS = {
  maintenance: 'badge badge-warning', reparation: 'badge badge-danger',
  assurance: 'badge badge-info', personnel: 'badge badge-success',
  loyer: 'badge badge-warning', autre: 'badge badge-info',
}

export default function Charges() {
  const [charges, setCharges] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ type: 'vehicule', vehicule_id: '', agence_id: '', categorie_charge: 'maintenance', montant: '', description: '' })
  const [loading, setLoading] = useState(false)

  const load = () => 
    chargeAPI.getAll()
      .then(r => setCharges(r.data.charges))
      .catch(() => toast.error('Erreur chargement'))

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm({ type: 'vehicule', vehicule_id: '', agence_id: '', categorie_charge: 'maintenance', montant: '', description: '' }); setShowModal(true) }
  const openEdit = (c) => {
    setEditing(c)
    setForm({ type: c.type, vehicule_id: c.vehicule_id || '', agence_id: c.agence_id || '', categorie_charge: c.categorie_charge, montant: String(c.montant), description: c.description || '' })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        type: form.type,
        vehicule_id: form.vehicule_id ? Number(form.vehicule_id) : null,
        agence_id: form.agence_id ? Number(form.agence_id) : null,
        categorie_charge: form.categorie_charge,
        montant: Number(form.montant),
        description: form.description || null,
      }
      if (editing) {
        await chargeAPI.update(editing.id, { categorie_charge: payload.categorie_charge, montant: payload.montant, description: payload.description })
        toast.success('Charge mise à jour')
      } else {
        await chargeAPI.create(payload)
        toast.success('Charge enregistrée')
      }
      setShowModal(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette charge ?')) return
    try {
      await chargeAPI.delete(id)
      toast.success('Charge supprimée')
      load()
    } catch { toast.error('Erreur suppression') }
  }

  const fmt = (n) => Number(n || 0).toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })
  const totalCharges = charges.reduce((acc, c) => acc + Number(c.montant), 0)

  return (
    <div>
      <div className="page-header">
        <h1>Charges</h1>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Nouvelle charge</button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total charges</div>
        <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--danger)' }}>{fmt(totalCharges)}</div>
      </div>

      <div className="card">
        {charges.length === 0 ? (
          <div className="empty-state">Aucune charge enregistrée</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th><th>Catégorie</th><th>Véhicule</th><th>Agence</th><th>Montant</th><th>Date</th><th>Description</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {charges.map(c => (
                <tr key={c.id}>
                  <td><span className={c.type === 'vehicule' ? 'badge badge-info' : 'badge badge-warning'}>{c.type}</span></td>
                  <td><span className={CAT_COLORS[c.categorie_charge] || 'badge badge-info'}>{c.categorie_charge}</span></td>
                  <td style={{ color: 'var(--text-muted)' }}>{c.vehicule_id ? `#${c.vehicule_id}` : '—'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{c.agence_id ? `#${c.agence_id}` : '—'}</td>
                  <td style={{ fontWeight: 600, color: 'var(--danger)' }}>{fmt(c.montant)}</td>
                  <td>{new Date(c.date_charge).toLocaleDateString('fr-MA')}</td>
                  <td style={{ color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description || '—'}</td>
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn" style={{ padding: '0.3rem 0.6rem', background: 'var(--bg-input)', color: 'var(--text-muted)' }} onClick={() => openEdit(c)}><Pencil size={14} /></button>
                    <button className="btn btn-danger" style={{ padding: '0.3rem 0.6rem' }} onClick={() => handleDelete(c.id)}><Trash2 size={14} /></button>
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
            <h3>{editing ? 'Modifier la charge' : 'Nouvelle Charge'}</h3>
            <form onSubmit={handleSubmit}>
              {!editing && (
                <>
                  <div className="form-group">
                    <label>Type de charge</label>
                    <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                      <option value="vehicule">Véhicule</option>
                      <option value="societe">Société</option>
                    </select>
                  </div>
                  {form.type === 'vehicule' && (
                    <div className="form-group">
                      <label>ID Véhicule</label>
                      <input type="number" value={form.vehicule_id} onChange={e => setForm({...form, vehicule_id: e.target.value})} placeholder="Ex: 5" />
                    </div>
                  )}
                  <div className="form-group">
                    <label>ID Agence</label>
                    <input type="number" value={form.agence_id} onChange={e => setForm({...form, agence_id: e.target.value})} placeholder="Ex: 1" />
                  </div>
                </>
              )}
              <div className="form-group">
                <label>Catégorie</label>
                <select value={form.categorie_charge} onChange={e => setForm({...form, categorie_charge: e.target.value})}>
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Montant (MAD)</label>
                <input type="number" step="0.01" required value={form.montant} onChange={e => setForm({...form, montant: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Détails optionnels..." style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }} onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? '...' : editing ? 'Modifier' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}