import { useEffect, useState } from 'react'
import {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from '../api/vehicleApi'
import { getCategories, getMarques, getModeles } from '../api/referenceApi'
import './Vehicle.css'

const initialForm = {
  agence_id: '',
  modele_id: '',
  categorie_id: '',
  immatriculation: '',
  date_mise_en_circulation: '',
  kilometrage: '',
  nombre_places: '',
  statut: 'disponible',
  photo_url: '',
  prix_location: '',
  valeur_achat: '',
}

const statusOptions = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'loue', label: 'Loue' },
  { value: 'entretien', label: 'Entretien' },
  { value: 'hors_service', label: 'Hors service' },
]

const statCards = [
  ['total', 'Flotte totale', 'Toutes les fiches recuperees depuis fleet-service'],
  ['disponible', 'Disponibles', 'Vehicules prets pour une nouvelle reservation'],
  ['entretien', 'Entretiens', 'Elements qui demandent un suivi atelier'],
  ['value', 'Valeur flotte', "Somme de valeur_achat des lignes visibles"],
]

const normalizeVehicle = (vehicle) => ({
  id: vehicle.id ?? '',
  agence_id: vehicle.agence_id ?? '',
  modele_id: vehicle.modele_id ?? '',
  categorie_id: vehicle.categorie_id ?? '',
  immatriculation: vehicle.immatriculation ?? '',
  date_mise_en_circulation: vehicle.date_mise_en_circulation ?? '',
  kilometrage: vehicle.kilometrage ?? '',
  nombre_places: vehicle.nombre_places ?? '',
  statut: vehicle.statut ?? 'disponible',
  photo_url: vehicle.photo_url ?? '',
  prix_location: vehicle.prix_location ?? '',
  valeur_achat: vehicle.valeur_achat ?? '',
  created_at: vehicle.created_at ?? '',
})

const toDateInputValue = (value) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

const formatDate = (value) => {
  if (!value) return '--'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '--'
  return parsed.toLocaleDateString('fr-FR')
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)

const Vehicle = () => {
  const [vehicles, setVehicles] = useState([])
  const [categories, setCategories] = useState([])
  const [marques, setMarques] = useState([])
  const [modeles, setModeles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const loadPageData = async () => {
    setLoading(true)
    setError('')

    try {
      const [vehicleData, categoryData, marqueData, modeleData] = await Promise.all([
        getVehicles(),
        getCategories(),
        getMarques(),
        getModeles(),
      ])

      setVehicles(Array.isArray(vehicleData) ? vehicleData.map(normalizeVehicle) : [])
      setCategories(Array.isArray(categoryData) ? categoryData : [])
      setMarques(Array.isArray(marqueData) ? marqueData : [])
      setModeles(Array.isArray(modeleData) ? modeleData : [])
    } catch (err) {
      setError('Erreur de recuperation des donnees : ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPageData()
  }, [])

  const clearForm = () => {
    setEditId(null)
    setForm(initialForm)
  }

  const handleFieldChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const validateForm = () => {
    const missingRequired = Object.entries(form).some(([key, value]) => {
      if (key === 'date_mise_en_circulation') return false
      return value === '' || value == null
    })

    if (missingRequired) {
      return 'Veuillez remplir tous les champs obligatoires du formulaire.'
    }

    if (
      Number(form.kilometrage) < 0 ||
      Number(form.prix_location) < 0 ||
      Number(form.valeur_achat) < 0
    ) {
      return 'Les valeurs numeriques doivent etre positives.'
    }

    return ''
  }

  const buildPayload = () => ({
    agence_id: Number(form.agence_id),
    modele_id: Number(form.modele_id),
    categorie_id: Number(form.categorie_id),
    immatriculation: form.immatriculation.trim().toUpperCase(),
    date_mise_en_circulation: form.date_mise_en_circulation
      ? new Date(`${form.date_mise_en_circulation}T00:00:00`).toISOString()
      : null,
    kilometrage: Number(form.kilometrage),
    nombre_places: Number(form.nombre_places),
    statut: form.statut,
    photo_url: form.photo_url.trim() || null,
    prix_location: Number(form.prix_location),
    valeur_achat: Number(form.valeur_achat),
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
        await updateVehicle(editId, payload)
        setSuccess('Vehicule mis a jour avec succes.')
      } else {
        await createVehicle(payload)
        setSuccess('Vehicule ajoute avec succes.')
      }

      await loadPageData()
      clearForm()
    } catch (err) {
      setError("Erreur lors de l'envoi du formulaire : " + err.message)
      setSuccess('')
    }
  }

  const handleEdit = (vehicle) => {
    setEditId(vehicle.id || null)
    setSuccess('')
    setForm({
      agence_id: String(vehicle.agence_id ?? ''),
      modele_id: String(vehicle.modele_id ?? ''),
      categorie_id: String(vehicle.categorie_id ?? ''),
      immatriculation: vehicle.immatriculation ?? '',
      date_mise_en_circulation: toDateInputValue(vehicle.date_mise_en_circulation),
      kilometrage: String(vehicle.kilometrage ?? ''),
      nombre_places: String(vehicle.nombre_places ?? ''),
      statut: vehicle.statut ?? 'disponible',
      photo_url: vehicle.photo_url ?? '',
      prix_location: String(vehicle.prix_location ?? ''),
      valeur_achat: String(vehicle.valeur_achat ?? ''),
    })
  }

  const handleDelete = async (id) => {
    const ok = window.confirm('Confirmer la suppression du vehicule ?')
    if (!ok) return

    try {
      setError('')
      await deleteVehicle(id)
      setSuccess('Vehicule supprime avec succes.')
      await loadPageData()
    } catch (err) {
      setError('Erreur de suppression : ' + err.message)
      setSuccess('')
    }
  }

  const getCategorieLabel = (categorieId) =>
    categories.find((item) => Number(item.id) === Number(categorieId))?.libelle || categorieId

  const getMarqueLabel = (marqueId) =>
    marques.find((item) => Number(item.id) === Number(marqueId))?.nom || marqueId

  const getModeleLabel = (modeleId) => {
    const modele = modeles.find((item) => Number(item.id) === Number(modeleId))
    if (!modele) return modeleId
    const marque = modele.marque_id ? getMarqueLabel(modele.marque_id) : null
    return marque ? `${modele.nom} (${marque})` : modele.nom
  }

  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesStatus = statusFilter === 'all' || vehicle.statut === statusFilter
    const query = search.trim().toLowerCase()
    const haystack = [
      vehicle.id,
      vehicle.immatriculation,
      vehicle.agence_id,
      getModeleLabel(vehicle.modele_id),
      getCategorieLabel(vehicle.categorie_id),
      vehicle.statut,
    ]
      .join(' ')
      .toLowerCase()

    return matchesStatus && (!query || haystack.includes(query))
  })

  const stats = {
    total: vehicles.length,
    disponible: vehicles.filter((vehicle) => vehicle.statut === 'disponible').length,
    entretien: vehicles.filter((vehicle) => vehicle.statut === 'entretien').length,
    value: vehicles.reduce((sum, vehicle) => sum + Number(vehicle.valeur_achat || 0), 0),
  }

  const averageDailyPrice =
    vehicles.length > 0
      ? Math.round(
          vehicles.reduce((sum, vehicle) => sum + Number(vehicle.prix_location || 0), 0) /
            vehicles.length,
        )
      : 0

  return (
    <section className="vehicle-page">
      <div className="vehicle-hero">
        <div className="vehicle-hero-copy">
          <div className="vehicle-eyebrow">Fleet Control Center</div>
          <h1>Vehicles aligned with the new fleet service.</h1>
          <p>
            Cette page consomme le backend via le proxy Vite sur `8001`, avec les nouveaux
            statuts et les references `categories`, `marques` et `modeles`.
          </p>
          <div className="vehicle-hero-actions">
            <div className="vehicle-pill">
              <strong>{stats.total}</strong> fiches synchronisees
            </div>
            <div className="vehicle-pill">
              Prix moyen journalier <strong>{formatCurrency(averageDailyPrice)}</strong>
            </div>
          </div>
        </div>

        <div className="vehicle-hero-side">
          <div className="vehicle-feature-card">
            <strong>Formulaire aligne sur le backend actuel</strong>
            <span>
              Les champs suivent `VehicleCreate` du service fleet, avec statut `entretien`
              et references chargees en lecture depuis les endpoints metier.
            </span>
          </div>

          <div className="vehicle-mini-grid">
            <div className="vehicle-mini-card">
              <span>Disponible</span>
              <strong>{stats.disponible}</strong>
            </div>
            <div className="vehicle-mini-card">
              <span>Entretien</span>
              <strong>{stats.entretien}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="vehicle-stats">
        {statCards.map(([key, label, description]) => (
          <article key={key} className="vehicle-stat-card">
            <span>{label}</span>
            <strong>{key === 'value' ? formatCurrency(stats[key]) : stats[key]}</strong>
            <p>{description}</p>
          </article>
        ))}
      </div>

      <div className="vehicle-layout">
        <div className="vehicle-panel">
          <div className="vehicle-panel-header">
            <div className="vehicle-panel-title">
              <h2>{editId ? 'Modifier un vehicule' : 'Ajouter un vehicule'}</h2>
              <p>
                Remplis tous les champs du modele backend sauf `id` et `created_at`
                qui sont generes automatiquement.
              </p>
            </div>
            {editId && <div className="vehicle-edit-chip">Edition #{editId}</div>}
          </div>

          {error && <div className="vehicle-alert vehicle-alert-error">{error}</div>}
          {!error && success && <div className="vehicle-alert vehicle-alert-success">{success}</div>}

          <form className="vehicle-form" onSubmit={handleSubmit}>
            <div className="vehicle-form-grid">
              <div className="vehicle-field">
                <label htmlFor="agence_id">Agence ID</label>
                <input
                  id="agence_id"
                  type="number"
                  min="1"
                  value={form.agence_id}
                  onChange={(event) => handleFieldChange('agence_id', event.target.value)}
                />
              </div>

              <div className="vehicle-field">
                <label htmlFor="modele_id">Modele</label>
                <select
                  id="modele_id"
                  value={form.modele_id}
                  onChange={(event) => handleFieldChange('modele_id', event.target.value)}
                >
                  <option value="">Selectionner un modele</option>
                  {modeles.map((modele) => (
                    <option key={modele.id} value={modele.id}>
                      {getModeleLabel(modele.id)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="vehicle-field">
                <label htmlFor="categorie_id">Categorie</label>
                <select
                  id="categorie_id"
                  value={form.categorie_id}
                  onChange={(event) => handleFieldChange('categorie_id', event.target.value)}
                >
                  <option value="">Selectionner une categorie</option>
                  {categories.map((categorie) => (
                    <option key={categorie.id} value={categorie.id}>
                      {categorie.libelle}
                    </option>
                  ))}
                </select>
              </div>

              <div className="vehicle-field">
                <label htmlFor="nombre_places">Nombre de places</label>
                <input
                  id="nombre_places"
                  type="number"
                  min="1"
                  value={form.nombre_places}
                  onChange={(event) => handleFieldChange('nombre_places', event.target.value)}
                />
              </div>

              <div className="vehicle-field vehicle-field-full">
                <label htmlFor="immatriculation">Immatriculation</label>
                <input
                  id="immatriculation"
                  value={form.immatriculation}
                  onChange={(event) =>
                    handleFieldChange('immatriculation', event.target.value.toUpperCase())
                  }
                  placeholder="Ex: 12345-A-6"
                />
              </div>

              <div className="vehicle-field">
                <label htmlFor="date_mise_en_circulation">Date de mise en circulation</label>
                <input
                  id="date_mise_en_circulation"
                  type="date"
                  value={form.date_mise_en_circulation}
                  onChange={(event) =>
                    handleFieldChange('date_mise_en_circulation', event.target.value)
                  }
                />
                <small>Optionnel cote backend.</small>
              </div>

              <div className="vehicle-field">
                <label htmlFor="statut">Statut</label>
                <select
                  id="statut"
                  value={form.statut}
                  onChange={(event) => handleFieldChange('statut', event.target.value)}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="vehicle-field vehicle-field-full">
                <label htmlFor="photo_url">Photo URL</label>
                <input
                  id="photo_url"
                  type="url"
                  value={form.photo_url}
                  onChange={(event) => handleFieldChange('photo_url', event.target.value)}
                  placeholder="https://example.com/car.jpg"
                />
              </div>

              <div className="vehicle-field">
                <label htmlFor="kilometrage">Kilometrage</label>
                <input
                  id="kilometrage"
                  type="number"
                  min="0"
                  value={form.kilometrage}
                  onChange={(event) => handleFieldChange('kilometrage', event.target.value)}
                />
              </div>

              <div className="vehicle-field">
                <label htmlFor="prix_location">Prix location / jour</label>
                <input
                  id="prix_location"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.prix_location}
                  onChange={(event) => handleFieldChange('prix_location', event.target.value)}
                />
              </div>

              <div className="vehicle-field vehicle-field-full">
                <label htmlFor="valeur_achat">Valeur d&apos;achat</label>
                <input
                  id="valeur_achat"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valeur_achat}
                  onChange={(event) => handleFieldChange('valeur_achat', event.target.value)}
                />
              </div>
            </div>

            <div className="vehicle-form-actions">
              <button className="vehicle-button vehicle-button-primary" type="submit">
                {editId ? 'Enregistrer les modifications' : 'Ajouter au parc'}
              </button>
              <button
                className="vehicle-button vehicle-button-secondary"
                type="button"
                onClick={clearForm}
              >
                Vider le formulaire
              </button>
            </div>
          </form>
        </div>

        <div className="vehicle-table-panel">
          <div className="vehicle-table-header">
            <div className="vehicle-table-title">
              <h2>Tableau des vehicules</h2>
              <p>
                Recherche instantanee par immatriculation, statut, agence, modele ou categorie.
              </p>
            </div>
          </div>

          <div className="vehicle-toolbar">
            <div className="vehicle-filters">
              <div className="vehicle-search">
                <input
                  type="search"
                  placeholder="Chercher: immatriculation, modele, categorie..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="vehicle-filter">
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">Tous les statuts</option>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button className="vehicle-button vehicle-button-ghost" type="button" onClick={loadPageData}>
              Rafraichir
            </button>
          </div>

          <div className="vehicle-table-wrap">
            {loading ? (
              <div className="vehicle-empty">Chargement des vehicules...</div>
            ) : filteredVehicles.length === 0 ? (
              <div className="vehicle-empty">Aucun vehicule ne correspond aux filtres actuels.</div>
            ) : (
              <table className="vehicle-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Immatriculation</th>
                    <th>Photo</th>
                    <th>Agence</th>
                    <th>Modele</th>
                    <th>Categorie</th>
                    <th>Statut</th>
                    <th>Kilometrage</th>
                    <th>Places</th>
                    <th>Prix/jour</th>
                    <th>Valeur</th>
                    <th>Mise en circulation</th>
                    <th>Cree le</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map((vehicle) => (
                    <tr key={vehicle.id}>
                      <td className="vehicle-id">#{vehicle.id}</td>
                      <td>{vehicle.immatriculation || '--'}</td>
                      <td>{vehicle.photo_url ? 'Disponible' : '--'}</td>
                      <td>{vehicle.agence_id}</td>
                      <td>{getModeleLabel(vehicle.modele_id)}</td>
                      <td>{getCategorieLabel(vehicle.categorie_id)}</td>
                      <td>
                        <span className={`vehicle-status-badge vehicle-status-${vehicle.statut}`}>
                          {statusOptions.find((option) => option.value === vehicle.statut)?.label ||
                            vehicle.statut}
                        </span>
                      </td>
                      <td>{Number(vehicle.kilometrage || 0).toLocaleString('fr-FR')} km</td>
                      <td>{vehicle.nombre_places}</td>
                      <td>{formatCurrency(vehicle.prix_location)}</td>
                      <td>{formatCurrency(vehicle.valeur_achat)}</td>
                      <td>{formatDate(vehicle.date_mise_en_circulation)}</td>
                      <td>{formatDate(vehicle.created_at)}</td>
                      <td>
                        <div className="vehicle-inline-actions">
                          <button
                            className="vehicle-link-button"
                            type="button"
                            onClick={() => handleEdit(vehicle)}
                          >
                            Modifier
                          </button>
                          <button
                            className="vehicle-link-button"
                            type="button"
                            onClick={() => handleDelete(vehicle.id)}
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

export default Vehicle
