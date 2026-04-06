import { useEffect, useState } from 'react'
import { getVehicles } from '../api/vehicleApi'
import {
  getEntretiens,
  createEntretienRecord,
  updateEntretienRecord,
  deleteEntretienRecord,
} from '../api/entretienApi'
import './Maintenance.css'

const initialForm = {
  vehicle_id: '',
  type_entretien: 'preventive',
  description: '',
  date_debut: '',
  date_fin: '',
  cout: '',
  prestataire: '',
  statut: 'planifiee',
}

const entretienTypeOptions = [
  { value: 'preventive', label: 'Preventive' },
  { value: 'corrective', label: 'Corrective' },
]

const entretienStatusOptions = [
  { value: 'planifiee', label: 'Planifiee' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'terminee', label: 'Terminee' },
  { value: 'annulee', label: 'Annulee' },
]

const statCards = [
  ['total', 'Entretiens', 'Tous les entretiens consolides depuis fleet-service'],
  ['open', 'Actifs', 'Planifies ou en cours'],
  ['completed', 'Termines', 'Entretiens clotures et archivables'],
  ['cost', 'Budget total', 'Somme des couts visibles dans le tableau'],
]

const normalizeEntretien = (record) => ({
  id: record.id ?? '',
  vehicle_id: record.vehicle_id ?? '',
  type_entretien: record.type_entretien ?? 'preventive',
  description: record.description ?? '',
  date_debut: record.date_debut ?? '',
  date_fin: record.date_fin ?? '',
  cout: record.cout ?? 0,
  prestataire: record.prestataire ?? '',
  statut: record.statut ?? 'planifiee',
  created_at: record.created_at ?? '',
})

const toDateTimeLocalValue = (value) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  const timezoneOffset = parsed.getTimezoneOffset() * 60000
  return new Date(parsed.getTime() - timezoneOffset).toISOString().slice(0, 16)
}

const toIsoString = (value) => (value ? new Date(value).toISOString() : null)

const formatDateTime = (value) => {
  if (!value) return '--'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '--'
  return parsed.toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)

const Maintenance = () => {
  const [records, setRecords] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const loadEntretienDashboard = async () => {
    setLoading(true)
    setError('')

    try {
      const [entretienData, vehicleData] = await Promise.all([
        getEntretiens(),
        getVehicles().catch(() => []),
      ])

      setRecords(Array.isArray(entretienData) ? entretienData.map(normalizeEntretien) : [])
      setVehicles(Array.isArray(vehicleData) ? vehicleData : [])
    } catch (err) {
      setError('Erreur de recuperation des entretiens : ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEntretienDashboard()
  }, [])

  const clearForm = () => {
    setEditId(null)
    setForm(initialForm)
  }

  const handleFieldChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const validateForm = () => {
    if (
      !form.vehicle_id ||
      !form.type_entretien ||
      !form.description.trim() ||
      !form.date_debut ||
      !form.statut
    ) {
      return 'Veuillez remplir tous les champs obligatoires.'
    }

    if (form.date_fin && new Date(form.date_fin) < new Date(form.date_debut)) {
      return 'La date de fin doit etre superieure ou egale a la date de debut.'
    }

    if (Number(form.cout || 0) < 0) {
      return 'Le cout doit etre positif.'
    }

    return ''
  }

  const buildPayload = () => ({
    vehicle_id: Number(form.vehicle_id),
    type_entretien: form.type_entretien,
    description: form.description.trim(),
    date_debut: toIsoString(form.date_debut),
    date_fin: toIsoString(form.date_fin),
    cout: Number(form.cout || 0),
    prestataire: form.prestataire.trim() || null,
    statut: form.statut,
  })

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      setSuccess('')
      return
    }

    try {
      setError('')
      const payload = buildPayload()

      if (editId != null) {
        await updateEntretienRecord(editId, payload)
        setSuccess('Entretien mis a jour avec succes.')
      } else {
        await createEntretienRecord(payload)
        setSuccess('Entretien ajoute avec succes.')
      }

      await loadEntretienDashboard()
      clearForm()
    } catch (err) {
      setError("Erreur lors de l'envoi du formulaire : " + err.message)
      setSuccess('')
    }
  }

  const handleEdit = (record) => {
    setEditId(record.id || null)
    setSuccess('')
    setForm({
      vehicle_id: String(record.vehicle_id ?? ''),
      type_entretien: record.type_entretien ?? 'preventive',
      description: record.description ?? '',
      date_debut: toDateTimeLocalValue(record.date_debut),
      date_fin: toDateTimeLocalValue(record.date_fin),
      cout: String(record.cout ?? ''),
      prestataire: record.prestataire ?? '',
      statut: record.statut ?? 'planifiee',
    })
  }

  const handleDelete = async (id) => {
    const ok = window.confirm('Confirmer la suppression de cet entretien ?')
    if (!ok) return

    try {
      setError('')
      await deleteEntretienRecord(id)
      setSuccess('Entretien supprime avec succes.')
      await loadEntretienDashboard()
    } catch (err) {
      setError('Erreur de suppression : ' + err.message)
      setSuccess('')
    }
  }

  const getVehicleLabel = (vehicleId) => {
    const vehicle = vehicles.find((item) => Number(item.id) === Number(vehicleId))
    return vehicle ? `#${vehicle.id} - ${vehicle.immatriculation}` : `#${vehicleId}`
  }

  const filteredRecords = records.filter((record) => {
    const matchesStatus = statusFilter === 'all' || record.statut === statusFilter
    const query = search.trim().toLowerCase()
    const haystack = [
      record.id,
      record.vehicle_id,
      getVehicleLabel(record.vehicle_id),
      record.type_entretien,
      record.description,
      record.prestataire,
      record.statut,
    ]
      .join(' ')
      .toLowerCase()

    return matchesStatus && (!query || haystack.includes(query))
  })

  const stats = {
    total: records.length,
    open: records.filter((record) => ['planifiee', 'en_cours'].includes(record.statut)).length,
    completed: records.filter((record) => record.statut === 'terminee').length,
    cost: records.reduce((sum, record) => sum + Number(record.cout || 0), 0),
  }

  return (
    <section className="maintenance-page">
      <div className="maintenance-hero">
        <div className="maintenance-hero-copy">
          <div className="maintenance-eyebrow">Workshop Intelligence</div>
          <h1>Track every entretien, cost and status shift.</h1>
          <p>
            Cette page suit maintenant le modele `VehicleEntretien` du backend avec
            `vehicle_id` dans le body, `type_entretien`, `description`, `date_debut`,
            `date_fin`, `cout`, `prestataire` et `statut`.
          </p>
          <div className="maintenance-hero-actions">
            <div className="maintenance-pill">
              <strong>{stats.total}</strong> entretiens regroupes
            </div>
            <div className="maintenance-pill">
              Budget suivi <strong>{formatCurrency(stats.cost)}</strong>
            </div>
          </div>
        </div>

        <div className="maintenance-hero-side">
          <div className="maintenance-feature-card">
            <strong>CRUD aligne sur les endpoints reels</strong>
            <span>
              Creation directe sur `/entretiens/`, edition et suppression par identifiant,
              sans obligation de passer par une route imbriquee sous `vehicles`.
            </span>
          </div>

          <div className="maintenance-mini-grid">
            <div className="maintenance-mini-card">
              <span>Actifs</span>
              <strong>{stats.open}</strong>
            </div>
            <div className="maintenance-mini-card">
              <span>Vehicules visibles</span>
              <strong>{vehicles.length}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="maintenance-stats">
        {statCards.map(([key, label, description]) => (
          <article key={key} className="maintenance-stat-card">
            <span>{label}</span>
            <strong>{key === 'cost' ? formatCurrency(stats[key]) : stats[key]}</strong>
            <p>{description}</p>
          </article>
        ))}
      </div>

      <div className="maintenance-layout">
        <div className="maintenance-panel">
          <div className="maintenance-panel-header">
            <div className="maintenance-panel-title">
              <h2>{editId ? 'Modifier un entretien' : 'Ajouter un entretien'}</h2>
              <p>
                Le formulaire suit le backend actuel. `id` et `created_at`
                restent automatiques cote service.
              </p>
            </div>
            {editId && <div className="maintenance-edit-chip">Edition #{editId}</div>}
          </div>

          {error && <div className="maintenance-alert maintenance-alert-error">{error}</div>}
          {!error && success && (
            <div className="maintenance-alert maintenance-alert-success">{success}</div>
          )}

          <form className="maintenance-form" onSubmit={handleSubmit}>
            <div className="maintenance-form-grid">
              <div className="maintenance-field">
                <label htmlFor="vehicle_id">Vehicule ID</label>
                <input
                  id="vehicle_id"
                  type="number"
                  min="1"
                  value={form.vehicle_id}
                  onChange={(event) => handleFieldChange('vehicle_id', event.target.value)}
                  list="vehicle-suggestions"
                />
                <datalist id="vehicle-suggestions">
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.immatriculation}
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="maintenance-field">
                <label htmlFor="type_entretien">Type</label>
                <select
                  id="type_entretien"
                  value={form.type_entretien}
                  onChange={(event) =>
                    handleFieldChange('type_entretien', event.target.value)
                  }
                >
                  {entretienTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="maintenance-field maintenance-field-full">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={form.description}
                  onChange={(event) => handleFieldChange('description', event.target.value)}
                  placeholder="Ex: remplacement de pneus, vidange, freinage..."
                />
              </div>

              <div className="maintenance-field">
                <label htmlFor="date_debut">Date debut</label>
                <input
                  id="date_debut"
                  type="datetime-local"
                  value={form.date_debut}
                  onChange={(event) => handleFieldChange('date_debut', event.target.value)}
                />
              </div>

              <div className="maintenance-field">
                <label htmlFor="date_fin">Date fin</label>
                <input
                  id="date_fin"
                  type="datetime-local"
                  value={form.date_fin}
                  onChange={(event) => handleFieldChange('date_fin', event.target.value)}
                />
              </div>

              <div className="maintenance-field">
                <label htmlFor="cout">Cout</label>
                <input
                  id="cout"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cout}
                  onChange={(event) => handleFieldChange('cout', event.target.value)}
                />
              </div>

              <div className="maintenance-field">
                <label htmlFor="statut">Statut</label>
                <select
                  id="statut"
                  value={form.statut}
                  onChange={(event) => handleFieldChange('statut', event.target.value)}
                >
                  {entretienStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="maintenance-field maintenance-field-full">
                <label htmlFor="prestataire">Prestataire</label>
                <input
                  id="prestataire"
                  value={form.prestataire}
                  onChange={(event) => handleFieldChange('prestataire', event.target.value)}
                  placeholder="Garage central, fournisseur externe..."
                />
              </div>
            </div>

            <div className="maintenance-form-actions">
              <button className="maintenance-button maintenance-button-primary" type="submit">
                {editId ? 'Enregistrer les modifications' : 'Ajouter entretien'}
              </button>
              <button
                className="maintenance-button maintenance-button-secondary"
                type="button"
                onClick={clearForm}
              >
                Vider le formulaire
              </button>
            </div>
          </form>
        </div>

        <div className="maintenance-table-panel">
          <div className="maintenance-table-header">
            <div className="maintenance-table-title">
              <h2>Tableau des entretiens</h2>
              <p>
                Vue consolidee de tous les entretiens, avec recherche textuelle et filtre d&apos;etat.
              </p>
            </div>
          </div>

          <div className="maintenance-toolbar">
            <div className="maintenance-filters">
              <div className="maintenance-search">
                <input
                  type="search"
                  placeholder="Chercher: vehicule, type, prestataire..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="maintenance-filter">
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">Tous les statuts</option>
                  {entretienStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              className="maintenance-button maintenance-button-ghost"
              type="button"
              onClick={loadEntretienDashboard}
            >
              Rafraichir
            </button>
          </div>

          <div className="maintenance-table-wrap">
            {loading ? (
              <div className="maintenance-empty">Chargement des entretiens...</div>
            ) : filteredRecords.length === 0 ? (
              <div className="maintenance-empty">Aucun entretien ne correspond aux filtres.</div>
            ) : (
              <table className="maintenance-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Vehicule</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Debut</th>
                    <th>Fin</th>
                    <th>Prestataire</th>
                    <th>Statut</th>
                    <th>Cout</th>
                    <th>Cree le</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="maintenance-id">#{record.id}</td>
                      <td>{getVehicleLabel(record.vehicle_id)}</td>
                      <td>
                        {entretienTypeOptions.find((item) => item.value === record.type_entretien)
                          ?.label || record.type_entretien}
                      </td>
                      <td>{record.description}</td>
                      <td>{formatDateTime(record.date_debut)}</td>
                      <td>{formatDateTime(record.date_fin)}</td>
                      <td>{record.prestataire || '--'}</td>
                      <td>
                        <span className={`maintenance-status-badge maintenance-status-${record.statut}`}>
                          {entretienStatusOptions.find((item) => item.value === record.statut)?.label ||
                            record.statut}
                        </span>
                      </td>
                      <td>{formatCurrency(record.cout)}</td>
                      <td>{formatDateTime(record.created_at)}</td>
                      <td>
                        <div className="maintenance-inline-actions">
                          <button
                            className="maintenance-link-button"
                            type="button"
                            onClick={() => handleEdit(record)}
                          >
                            Modifier
                          </button>
                          <button
                            className="maintenance-link-button"
                            type="button"
                            onClick={() => handleDelete(record.id)}
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Maintenance
