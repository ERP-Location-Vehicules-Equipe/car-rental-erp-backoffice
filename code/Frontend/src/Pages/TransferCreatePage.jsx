import { useState } from 'react'
import { createTransfer } from '../Services/transferApi'

const initialForm = {
  vehicule_id: '',
  agence_source_id: '',
  agence_destination_id: '',
  date_depart: '',
  reason: '',
  notes: '',
  created_by: '',
}

function TransferCreatePage({ onBackToList, onCreated }) {
  const [formData, setFormData] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setMessage('')
    // quick client-side guard to avoid FastAPI 422
    if (
      !formData.vehicule_id ||
      !formData.agence_source_id ||
      !formData.agence_destination_id ||
      !formData.reason ||
      !formData.created_by
    ) {
      setError('Merci de remplir les champs obligatoires (IDs, motif, cree par).')
      setSubmitting(false)
      return
    }
    try {
      const payload = {
        vehicule_id: Number(formData.vehicule_id),
        agence_source_id: Number(formData.agence_source_id),
        agence_destination_id: Number(formData.agence_destination_id),
        date_depart: formData.date_depart || null,
        reason: formData.reason,
        notes: formData.notes || null,
        created_by: formData.created_by,
      }
      const { data } = await createTransfer(payload)
      setMessage(`Transfert #${data.id} cree`)
      setFormData(initialForm)
      if (onCreated) {
        onCreated(data)
      }
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        // FastAPI validation errors array
        const messages = detail
          .map((d) => d.msg || d.detail || d.loc?.join('.') || 'Erreur de validation')
          .join('; ')
        setError(messages)
      } else if (detail) {
        setError(detail)
      } else {
        setError('Echec de creation du transfert')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-card" style={{ maxWidth: '760px', margin: '0 auto' }}>
      <div className="toolbar">
        <div>
          <h1 className="page-title">Creer un transfert</h1>
          <p className="page-subtitle">Renseignez les informations ci-dessous.</p>
        </div>
        <button className="btn btn-ghost" type="button" onClick={onBackToList}>
          Retour a la liste
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <form onSubmit={handleSubmit} style={{ marginTop: '12px' }}>
        <label htmlFor="vehicule_id">ID Vehicule</label>
        <input
          className="input"
          type="number"
          id="vehicule_id"
          name="vehicule_id"
          value={formData.vehicule_id}
          onChange={handleChange}
          required
          min="0"
        />

        <label htmlFor="agence_source_id">ID Agence source</label>
        <input
          className="input"
          type="number"
          id="agence_source_id"
          name="agence_source_id"
          value={formData.agence_source_id}
          onChange={handleChange}
          required
          min="0"
        />

        <label htmlFor="agence_destination_id">ID Agence destination</label>
        <input
          className="input"
          type="number"
          id="agence_destination_id"
          name="agence_destination_id"
          value={formData.agence_destination_id}
          onChange={handleChange}
          required
          min="0"
        />

        <label htmlFor="date_depart">Date de depart</label>
        <input
          className="input"
          type="date"
          id="date_depart"
          name="date_depart"
          value={formData.date_depart}
          onChange={handleChange}
        />

        <label htmlFor="reason">Motif</label>
        <input
          className="input"
          type="text"
          id="reason"
          name="reason"
          value={formData.reason}
          onChange={handleChange}
          required
          minLength={3}
          maxLength={255}
          placeholder="Pourquoi ce transfert ?"
        />

        <label htmlFor="notes">Notes (optionnel)</label>
        <textarea
          className="textarea"
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          maxLength={500}
          placeholder="Extra context"
        />

        <label htmlFor="created_by">Cree par</label>
        <input
          className="input"
          type="text"
          id="created_by"
          name="created_by"
          value={formData.created_by}
          onChange={handleChange}
          required
          minLength={2}
          maxLength={100}
          placeholder="Votre nom"
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Creation...' : 'Creer le transfert'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default TransferCreatePage
