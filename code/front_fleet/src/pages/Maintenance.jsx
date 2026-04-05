import { useEffect, useState } from 'react'
import { getVehicles } from '../api/vehicleApi'
import {
  getVehicleMaintenances,
  createMaintenanceRecord,
  updateMaintenanceRecord,
  deleteMaintenanceRecord,
} from '../api/maintenanceApi'
import './Maintenance.css'

const initialForm = {
  vehicle_id: '',
  type_maintenance: 'preventive',
  description: '',
  date_debut: '',
  date_fin: '',
  cout: '',
  prestataire: '',
  statut: 'planifiee',
}

const maintenanceTypeOptions = [
  { value: 'preventive', label: 'Preventive' },
  { value: 'corrective', label: 'Corrective' },
]

const maintenanceStatusOptions = [
  { value: 'planifiee', label: 'Planifiee' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'terminee', label: 'Terminee' },
  { value: 'annulee', label: 'Annulee' },
]

const statCards = [
  ['total', 'Interventions', 'Toutes les maintenances consolidees depuis la flotte'],
  ['open', 'Actives', 'Planifiees ou en cours sur les vehicules'],
  ['completed', 'Terminees', 'Interventions cloturees et archivables'],
  ['cost', 'Budget total', 'Somme des couts visibles dans le tableau'],
]

const normalizeMaintenance = (record) => ({
  id: record.id ?? '',
  vehicle_id: record.vehicle_id ?? '',
  type_maintenance: record.type_maintenance ?? 'preventive',
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

  const loadMaintenanceDashboard = async () => {
    setLoading(true)
    setError('')

    try {
      const vehicleData = await getVehicles()
      const normalizedVehicles = Array.isArray(vehicleData) ? vehicleData : []
      setVehicles(normalizedVehicles)

      const maintenanceGroups = await Promise.all(
        normalizedVehicles.map(async (vehicle) => {
          try {
            const data = await getVehicleMaintenances(vehicle.id)
            return Array.isArray(data) ? data : []
          } catch {
            return []
          }
        }),
      )

      const mergedRecords = maintenanceGroups
        .flat()
        .map(normalizeMaintenance)
        .sort((a, b) => new Date(b.date_debut) - new Date(a.date_debut))

      setRecords(mergedRecords)
    } catch (err) {
      setError('Erreur de recuperation des maintenances : ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMaintenanceDashboard()
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
      !form.type_maintenance ||
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
    type_maintenance: form.type_maintenance,
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
        await updateMaintenanceRecord(editId, payload)
        setSuccess('Maintenance mise a jour avec succes.')
      } else {
        await createMaintenanceRecord(form.vehicle_id, payload)
        setSuccess('Maintenance ajoutee avec succes.')
      }

      await loadMaintenanceDashboard()
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
      type_maintenance: record.type_maintenance ?? 'preventive',
      description: record.description ?? '',
      date_debut: toDateTimeLocalValue(record.date_debut),
      date_fin: toDateTimeLocalValue(record.date_fin),
      cout: String(record.cout ?? ''),
      prestataire: record.prestataire ?? '',
      statut: record.statut ?? 'planifiee',
    })
  }

  const handleDelete = async (id) => {
    const ok = window.confirm('Confirmer la suppression de cette maintenance ?')
    if (!ok) return

    try {
      setError('')
      await deleteMaintenanceRecord(id)
      setSuccess('Maintenance supprimee avec succes.')
      await loadMaintenanceDashboard()
    } catch (err) {
      setError('Erreur de suppression : ' + err.message)
      setSuccess('')
    }
  }

  const filteredRecords = records.filter((record) => {
    const matchesStatus = statusFilter === 'all' || record.statut === statusFilter
    const query = search.trim().toLowerCase()
    const haystack = [
      record.id,
      record.vehicle_id,
      record.type_maintenance,
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
          <h1>Track every intervention, cost and status shift.</h1>
          <p>
            Cette page suit le modele `VehicleMaintenance` du backend avec `vehicle_id`,
            `type_maintenance`, `description`, `date_debut`, `date_fin`, `cout`,
            `prestataire` et `statut`, puis consolide les interventions de tous les vehicules.
          </p>
          <div className="maintenance-hero-actions">
            <div className="maintenance-pill">
              <strong>{stats.total}</strong> maintenances regroupees
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
              Creation par vehicule, edition par identifiant de maintenance et
              synchronisation des statuts atelier.
            </span>
          </div>

          <div className="maintenance-mini-grid">
            <div className="maintenance-mini-card">
              <span>En cours</span>
              <strong>{stats.open}</strong>
            </div>
            <div className="maintenance-mini-card">
              <span>Vehicules lies</span>
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
              <h2>{editId ? 'Modifier une maintenance' : 'Ajouter une maintenance'}</h2>
              <p>
                Formulaire base sur `maintenance.py`. `id` et `created_at`
                restent automatiques cote backend.
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
                <label htmlFor="vehicle_id">Vehicule</label>
                <select
                  id="vehicle_id"
                  value={form.vehicle_id}
                  onChange={(event) => handleFieldChange('vehicle_id', event.target.value)}
                >
                  <option value="">Selectionner un vehicule</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      #{vehicle.id} - {vehicle.immatriculation}
                    </option>
                  ))}
                </select>
              </div>

              <div className="maintenance-field">
                <label htmlFor="type_maintenance">Type</label>
                <select
                  id="type_maintenance"
                  value={form.type_maintenance}
                  onChange={(event) =>
                    handleFieldChange('type_maintenance', event.target.value)
                  }
                >
                  {maintenanceTypeOptions.map((option) => (
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
                  {maintenanceStatusOptions.map((option) => (
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
                {editId ? 'Enregistrer les modifications' : 'Ajouter intervention'}
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
              <h2>Tableau des maintenances</h2>
              <p>
                Vue consolidee de toutes les maintenances, avec recherche textuelle et filtre d&apos;etat.
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
                  {maintenanceStatusOptions.map((option) => (
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
              onClick={loadMaintenanceDashboard}
            >
              Rafraichir
            </button>
          </div>

          <div className="maintenance-table-wrap">
            {loading ? (
              <div className="maintenance-empty">Chargement des maintenances...</div>
            ) : filteredRecords.length === 0 ? (
              <div className="maintenance-empty">Aucune maintenance ne correspond aux filtres.</div>
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
                      <td>#{record.vehicle_id}</td>
                      <td>
                        {maintenanceTypeOptions.find((item) => item.value === record.type_maintenance)
                          ?.label || record.type_maintenance}
                      </td>
                      <td>{record.description}</td>
                      <td>{formatDateTime(record.date_debut)}</td>
                      <td>{formatDateTime(record.date_fin)}</td>
                      <td>{record.prestataire || '--'}</td>
                      <td>
                        <span className={`maintenance-status-badge maintenance-status-${record.statut}`}>
                          {maintenanceStatusOptions.find((item) => item.value === record.statut)?.label ||
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
