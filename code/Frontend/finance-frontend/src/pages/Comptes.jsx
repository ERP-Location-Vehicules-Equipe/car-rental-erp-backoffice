import { useEffect, useState } from 'react'
import { compteAPI } from '../services/api'
import { Plus, Trash2, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'

const TYPE_BADGE = { banque: 'badge badge-info', caisse: 'badge badge-success' }

export default function Comptes() {
  const [comptes, setComptes] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ nom: '', type: 'banque', solde_actuel: '0' })
  const [loading, setLoading] = useState(false)

  const load = () => 
    compteAPI.getAll()
      .then(r => setComptes(r.data.comptes))
      .catch(() => toast.error('Erreur'))

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm({ nom: '', type: 'banque', solde_actuel: '0' }); setShowModal(true) }
  const openEdit = (c) => { setEditing(c); setForm({ nom: c.nom, type: c.type, solde_actuel: String(c.solde_actuel) }); setShowModal(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { nom: form.nom, type: form.type, solde_actuel: Number(form.solde_actuel) }
      if (editing) {
        await compteAPI.update(editing.id, payload)
        toast.success('Compte mis à jour')
      } else {
        await compteAPI.create(payload)
        toast.success('Compte créé')
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
    if (!confirm('Supprimer ce compte ?')) return
    try {
      await compteAPI.delete(id)
      toast.success('Compte supprimé')
      load()
    } catch { toast.error('Erreur suppression') }
  }

  const fmt = (n) => Number(n || 0).toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })
  const totalSolde = comptes.reduce((acc, c) => acc + Number(c.solde_actuel), 0)

  return (
    <div>
      <div className="page-header">
        <h1>Comptes de Trésorerie</h1>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Nouveau compte</button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Solde total trésorerie</div>
        <div style={{ fontSize: '1.8rem', fontWeight: 700, color: totalSolde >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmt(totalSolde)}</div>
      </div>

      <div className="card">
        {comptes.length === 0 ? (
          <div className="empty-state">Aucun compte enregistré</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th><th>Type</th><th>Solde actuel</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {comptes.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.nom}</td>
                  <td><span className={TYPE_BADGE[c.type] || 'badge badge-info'}>{c.type}</span></td>
                  <td style={{ fontWeight: 600, color: Number(c.solde_actuel) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmt(c.solde_actuel)}</td>
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
            <h3>{editing ? 'Modifier le compte' : 'Nouveau compte'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nom du compte</label>
                <input required value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} placeholder="Ex: Caisse Casablanca" />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                  <option value="banque">Banque</option>
                  <option value="caisse">Caisse</option>
                </select>
              </div>
              <div className="form-group">
                <label>Solde initial (MAD)</label>
                <input type="number" step="0.01" value={form.solde_actuel} onChange={e => setForm({...form, solde_actuel: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }} onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? '...' : editing ? 'Modifier' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}