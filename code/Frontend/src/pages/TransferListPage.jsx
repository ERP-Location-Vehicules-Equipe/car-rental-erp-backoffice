import { useEffect, useState } from 'react'
import {
  getTransfers,
  updateTransferStatus,
  cancelTransfer,
} from '../services/transferApi'

const ETAT_OPTIONS = ['PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED']
const badgeClass = {
  PENDING: 'badge badge-pending',
  IN_TRANSIT: 'badge badge-intransit',
  COMPLETED: 'badge badge-completed',
  CANCELLED: 'badge badge-cancelled',
}

const actionRowStyle = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  flexWrap: 'wrap',
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

function TransferListPage({ onCreateClick }) {
  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [actionId, setActionId] = useState(null)
  const [etatFilter, setEtatFilter] = useState('ALL')
  const [vehiculeSearch, setVehiculeSearch] = useState('')

  const loadTransfers = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await getTransfers()
      setTransfers(data)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(detail || 'Echec du chargement des transferts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTransfers()
  }, [])

  const filteredTransfers = transfers.filter((t) => {
    const matchesEtat = etatFilter === 'ALL' ? true : t.etat === etatFilter
    const matchesVehicule =
      vehiculeSearch.trim() === ''
        ? true
        : String(t.vehicule_id).includes(vehiculeSearch.trim())
    return matchesEtat && matchesVehicule
  })
  const handleStatusChange = async (id, newEtat) => {
    setActionId(id)
    setMessage('')
    setError('')
    try {
      await updateTransferStatus(id, newEtat)
      setMessage(`Etat mis a jour : ${newEtat}`)
      await loadTransfers()
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        const messages = detail
          .map((d) => d.msg || d.detail || d.loc?.join('.') || 'Erreur de validation')
          .join('; ')
        setError(messages)
      } else {
        setError(detail || 'Mise a jour impossible')
      }
    } finally {
      setActionId(null)
    }
  }

  const handleCancel = async (id) => {
    const confirmCancel = window.confirm(
      "Confirmez-vous l'annulation de ce transfert ?",
    )
    if (!confirmCancel) return
    setActionId(id)
    setMessage('')
    setError('')
    try {
      await cancelTransfer(id)
      setMessage('Transfert annule')
      await loadTransfers()
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        const messages = detail
          .map((d) => d.msg || d.detail || d.loc?.join('.') || 'Erreur de validation')
          .join('; ')
        setError(messages)
      } else {
        setError(detail || 'Annulation impossible')
      }
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="app-card">
      <div className="toolbar">
        <div>
          <h1 className="page-title">Transferts</h1>
          <p className="page-subtitle">Consulter, mettre a jour l etat ou annuler un transfert.</p>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-ghost" type="button" onClick={loadTransfers} disabled={loading}>
            {loading ? 'Rafraichissement...' : 'Rafraichir'}
          </button>
          <button className="btn btn-primary" type="button" onClick={onCreateClick}>
            + Nouveau transfert
          </button>
        </div>
      </div>

      <div className="filters">
        <div>
          <label>Filtrer par etat</label>
          <select
            className="select"
            value={etatFilter}
            onChange={(e) => setEtatFilter(e.target.value)}
          >
            <option value="ALL">ALL</option>
            {ETAT_OPTIONS.map((etat) => (
              <option key={etat} value={etat}>
                {etat}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Recherche par ID vehicule</label>
          <input
            className="input"
            type="text"
            value={vehiculeSearch}
            onChange={(e) => setVehiculeSearch(e.target.value)}
            placeholder="ex : 12"
          />
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      {loading && filteredTransfers.length === 0 ? (
        <p>Chargement des transferts...</p>
      ) : filteredTransfers.length === 0 ? (
        <p style={{ marginTop: '16px' }}>Aucun transfert trouve.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Vehicule</th>
              <th>Agence source</th>
              <th>Agence destination</th>
              <th>Etat</th>
              <th>Date depart</th>
              <th>Arrivee prevue</th>
              <th>Arrivee reelle</th>
              <th>Cree par</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransfers.map((transfer) => (
              <tr key={transfer.id}>
                <td>{transfer.id}</td>
                <td>{transfer.vehicule_id}</td>
                <td>{transfer.agence_source_id}</td>
                <td>{transfer.agence_destination_id}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={badgeClass[transfer.etat] || 'badge'}>
                      {transfer.etat}
                    </span>
                    <select
                      className="select"
                      value={transfer.etat}
                      onChange={(e) => handleStatusChange(transfer.id, e.target.value)}
                      disabled={
                        actionId === transfer.id ||
                        transfer.etat === 'CANCELLED' ||
                        transfer.etat === 'COMPLETED'
                      }
                    >
                      {ETAT_OPTIONS.map((etat) => (
                        <option key={etat} value={etat}>
                          {etat}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td>{formatDate(transfer.date_depart)}</td>
                <td>{formatDate(transfer.date_arrivee_prevue)}</td>
                <td>{formatDate(transfer.date_arrivee_reelle)}</td>
                <td>{transfer.created_by}</td>
                <td>
                  <div style={actionRowStyle}>
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => handleCancel(transfer.id)}
                      disabled={
                        actionId === transfer.id ||
                        transfer.etat === 'CANCELLED' ||
                        transfer.etat === 'COMPLETED'
                      }
                    >
                      Annuler
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default TransferListPage
