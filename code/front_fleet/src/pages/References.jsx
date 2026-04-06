import { useEffect, useState } from 'react'
import {
  createCategory,
  createMarque,
  createModele,
  deleteCategory,
  deleteMarque,
  deleteModele,
  getCategories,
  getMarques,
  getModeles,
  updateCategory,
  updateMarque,
  updateModele,
} from '../api/referenceApi'
import './References.css'

const initialCategoryForm = {
  libelle: '',
  tarif_jour_base: '',
}

const initialMarqueForm = {
  nom: '',
}

const initialModeleForm = {
  nom: '',
  marque_id: '',
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)

const References = () => {
  const [categories, setCategories] = useState([])
  const [marques, setMarques] = useState([])
  const [modeles, setModeles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [categoryForm, setCategoryForm] = useState(initialCategoryForm)
  const [marqueForm, setMarqueForm] = useState(initialMarqueForm)
  const [modeleForm, setModeleForm] = useState(initialModeleForm)
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [editingMarqueId, setEditingMarqueId] = useState(null)
  const [editingModeleId, setEditingModeleId] = useState(null)

  const loadReferences = async () => {
    setLoading(true)
    setError('')

    try {
      const [categoryData, marqueData, modeleData] = await Promise.all([
        getCategories(),
        getMarques(),
        getModeles(),
      ])

      setCategories(Array.isArray(categoryData) ? categoryData : [])
      setMarques(Array.isArray(marqueData) ? marqueData : [])
      setModeles(Array.isArray(modeleData) ? modeleData : [])
    } catch (err) {
      setError('Erreur de recuperation des references : ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReferences()
  }, [])

  const getMarqueLabel = (marqueId) =>
    marques.find((item) => Number(item.id) === Number(marqueId))?.nom || 'Sans marque'

  const resetCategoryForm = () => {
    setEditingCategoryId(null)
    setCategoryForm(initialCategoryForm)
  }

  const resetMarqueForm = () => {
    setEditingMarqueId(null)
    setMarqueForm(initialMarqueForm)
  }

  const resetModeleForm = () => {
    setEditingModeleId(null)
    setModeleForm(initialModeleForm)
  }

  const handleCategorySubmit = async (event) => {
    event.preventDefault()

    if (!categoryForm.libelle.trim() || categoryForm.tarif_jour_base === '') {
      setError('La categorie demande un libelle et un tarif journalier.')
      setSuccess('')
      return
    }

    if (Number(categoryForm.tarif_jour_base) < 0) {
      setError('Le tarif journalier doit etre positif.')
      setSuccess('')
      return
    }

    try {
      setError('')
      const payload = {
        libelle: categoryForm.libelle.trim(),
        tarif_jour_base: Number(categoryForm.tarif_jour_base),
      }

      if (editingCategoryId != null) {
        await updateCategory(editingCategoryId, payload)
        setSuccess('Categorie mise a jour avec succes.')
      } else {
        await createCategory(payload)
        setSuccess('Categorie ajoutee avec succes.')
      }

      await loadReferences()
      resetCategoryForm()
    } catch (err) {
      setError('Erreur categorie : ' + err.message)
      setSuccess('')
    }
  }

  const handleMarqueSubmit = async (event) => {
    event.preventDefault()

    if (!marqueForm.nom.trim()) {
      setError('La marque demande un nom.')
      setSuccess('')
      return
    }

    try {
      setError('')
      const payload = { nom: marqueForm.nom.trim() }

      if (editingMarqueId != null) {
        await updateMarque(editingMarqueId, payload)
        setSuccess('Marque mise a jour avec succes.')
      } else {
        await createMarque(payload)
        setSuccess('Marque ajoutee avec succes.')
      }

      await loadReferences()
      resetMarqueForm()
    } catch (err) {
      setError('Erreur marque : ' + err.message)
      setSuccess('')
    }
  }

  const handleModeleSubmit = async (event) => {
    event.preventDefault()

    if (!modeleForm.nom.trim()) {
      setError('Le modele demande au minimum un nom.')
      setSuccess('')
      return
    }

    try {
      setError('')
      const payload = {
        nom: modeleForm.nom.trim(),
        marque_id: modeleForm.marque_id ? Number(modeleForm.marque_id) : null,
      }

      if (editingModeleId != null) {
        await updateModele(editingModeleId, payload)
        setSuccess('Modele mis a jour avec succes.')
      } else {
        await createModele(payload)
        setSuccess('Modele ajoute avec succes.')
      }

      await loadReferences()
      resetModeleForm()
    } catch (err) {
      setError('Erreur modele : ' + err.message)
      setSuccess('')
    }
  }

  const handleCategoryDelete = async (categoryId) => {
    const ok = window.confirm('Confirmer la suppression de cette categorie ?')
    if (!ok) return

    try {
      setError('')
      await deleteCategory(categoryId)
      setSuccess('Categorie supprimee avec succes.')
      await loadReferences()
      if (editingCategoryId === categoryId) {
        resetCategoryForm()
      }
    } catch (err) {
      setError('Erreur suppression categorie : ' + err.message)
      setSuccess('')
    }
  }

  const handleMarqueDelete = async (marqueId) => {
    const ok = window.confirm('Confirmer la suppression de cette marque ?')
    if (!ok) return

    try {
      setError('')
      await deleteMarque(marqueId)
      setSuccess('Marque supprimee avec succes.')
      await loadReferences()
      if (editingMarqueId === marqueId) {
        resetMarqueForm()
      }
    } catch (err) {
      setError('Erreur suppression marque : ' + err.message)
      setSuccess('')
    }
  }

  const handleModeleDelete = async (modeleId) => {
    const ok = window.confirm('Confirmer la suppression de ce modele ?')
    if (!ok) return

    try {
      setError('')
      await deleteModele(modeleId)
      setSuccess('Modele supprime avec succes.')
      await loadReferences()
      if (editingModeleId === modeleId) {
        resetModeleForm()
      }
    } catch (err) {
      setError('Erreur suppression modele : ' + err.message)
      setSuccess('')
    }
  }

  return (
    <section className="references-page">
      <div className="references-hero">
        <div className="references-hero-copy">
          <div className="references-eyebrow">Fleet Reference Studio</div>
          <h1>Categories, marques et modeles relies au backend actuel.</h1>
          <p>
            Cette page couvre le nouveau CRUD de reference expose par `fleet-service`
            pour garder les formulaires vehicules alignes avec les donnees metier.
          </p>
          <div className="references-hero-actions">
            <div className="references-pill">
              <strong>{categories.length}</strong> categories
            </div>
            <div className="references-pill">
              <strong>{marques.length}</strong> marques
            </div>
            <div className="references-pill">
              <strong>{modeles.length}</strong> modeles
            </div>
          </div>
        </div>

        <div className="references-hero-side">
          <div className="references-feature-card">
            <strong>Source unique pour les listes du front</strong>
            <span>
              Les pages `vehicles` et `entretiens` peuvent maintenant se baser sur des
              references gerees directement depuis l&apos;interface.
            </span>
          </div>
        </div>
      </div>

      {error && <div className="references-alert references-alert-error">{error}</div>}
      {!error && success && (
        <div className="references-alert references-alert-success">{success}</div>
      )}

      <div className="references-toolbar">
        <button className="references-button references-button-ghost" type="button" onClick={loadReferences}>
          Rafraichir
        </button>
      </div>

      <div className="references-grid">
        <article className="references-panel">
          <div className="references-panel-header">
            <div>
              <h2>{editingCategoryId ? 'Modifier une categorie' : 'Ajouter une categorie'}</h2>
              <p>Backend: `/categories/` avec `libelle` et `tarif_jour_base`.</p>
            </div>
          </div>

          <form className="references-form" onSubmit={handleCategorySubmit}>
            <div className="references-field">
              <label htmlFor="categorie_libelle">Libelle</label>
              <input
                id="categorie_libelle"
                value={categoryForm.libelle}
                onChange={(event) =>
                  setCategoryForm((current) => ({ ...current, libelle: event.target.value }))
                }
                placeholder="SUV, citadine, premium..."
              />
            </div>

            <div className="references-field">
              <label htmlFor="categorie_tarif">Tarif jour base</label>
              <input
                id="categorie_tarif"
                type="number"
                min="0"
                step="0.01"
                value={categoryForm.tarif_jour_base}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    tarif_jour_base: event.target.value,
                  }))
                }
              />
            </div>

            <div className="references-form-actions">
              <button className="references-button references-button-primary" type="submit">
                {editingCategoryId ? 'Enregistrer' : 'Ajouter'}
              </button>
              <button
                className="references-button references-button-secondary"
                type="button"
                onClick={resetCategoryForm}
              >
                Vider
              </button>
            </div>
          </form>

          <div className="references-list">
            {loading ? (
              <div className="references-empty">Chargement...</div>
            ) : categories.length === 0 ? (
              <div className="references-empty">Aucune categorie.</div>
            ) : (
              categories.map((category) => (
                <div key={category.id} className="references-item">
                  <div>
                    <strong>{category.libelle}</strong>
                    <span>{formatCurrency(category.tarif_jour_base)} / jour</span>
                  </div>
                  <div className="references-inline-actions">
                    <button
                      className="references-link-button"
                      type="button"
                      onClick={() => {
                        setEditingCategoryId(category.id)
                        setCategoryForm({
                          libelle: category.libelle ?? '',
                          tarif_jour_base: String(category.tarif_jour_base ?? ''),
                        })
                        setSuccess('')
                      }}
                    >
                      Modifier
                    </button>
                    <button
                      className="references-link-button"
                      type="button"
                      onClick={() => handleCategoryDelete(category.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="references-panel">
          <div className="references-panel-header">
            <div>
              <h2>{editingMarqueId ? 'Modifier une marque' : 'Ajouter une marque'}</h2>
              <p>Backend: `/marques/` avec le champ `nom`.</p>
            </div>
          </div>

          <form className="references-form" onSubmit={handleMarqueSubmit}>
            <div className="references-field">
              <label htmlFor="marque_nom">Nom</label>
              <input
                id="marque_nom"
                value={marqueForm.nom}
                onChange={(event) =>
                  setMarqueForm((current) => ({ ...current, nom: event.target.value }))
                }
                placeholder="Renault, Dacia, Peugeot..."
              />
            </div>

            <div className="references-form-actions">
              <button className="references-button references-button-primary" type="submit">
                {editingMarqueId ? 'Enregistrer' : 'Ajouter'}
              </button>
              <button
                className="references-button references-button-secondary"
                type="button"
                onClick={resetMarqueForm}
              >
                Vider
              </button>
            </div>
          </form>

          <div className="references-list">
            {loading ? (
              <div className="references-empty">Chargement...</div>
            ) : marques.length === 0 ? (
              <div className="references-empty">Aucune marque.</div>
            ) : (
              marques.map((marque) => (
                <div key={marque.id} className="references-item">
                  <div>
                    <strong>{marque.nom}</strong>
                    <span>ID #{marque.id}</span>
                  </div>
                  <div className="references-inline-actions">
                    <button
                      className="references-link-button"
                      type="button"
                      onClick={() => {
                        setEditingMarqueId(marque.id)
                        setMarqueForm({ nom: marque.nom ?? '' })
                        setSuccess('')
                      }}
                    >
                      Modifier
                    </button>
                    <button
                      className="references-link-button"
                      type="button"
                      onClick={() => handleMarqueDelete(marque.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="references-panel">
          <div className="references-panel-header">
            <div>
              <h2>{editingModeleId ? 'Modifier un modele' : 'Ajouter un modele'}</h2>
              <p>Backend: `/modeles/` avec `nom` et `marque_id` optionnel.</p>
            </div>
          </div>

          <form className="references-form" onSubmit={handleModeleSubmit}>
            <div className="references-field">
              <label htmlFor="modele_nom">Nom</label>
              <input
                id="modele_nom"
                value={modeleForm.nom}
                onChange={(event) =>
                  setModeleForm((current) => ({ ...current, nom: event.target.value }))
                }
                placeholder="Clio, Sandero, Megane..."
              />
            </div>

            <div className="references-field">
              <label htmlFor="modele_marque">Marque</label>
              <select
                id="modele_marque"
                value={modeleForm.marque_id}
                onChange={(event) =>
                  setModeleForm((current) => ({ ...current, marque_id: event.target.value }))
                }
              >
                <option value="">Sans marque</option>
                {marques.map((marque) => (
                  <option key={marque.id} value={marque.id}>
                    {marque.nom}
                  </option>
                ))}
              </select>
            </div>

            <div className="references-form-actions">
              <button className="references-button references-button-primary" type="submit">
                {editingModeleId ? 'Enregistrer' : 'Ajouter'}
              </button>
              <button
                className="references-button references-button-secondary"
                type="button"
                onClick={resetModeleForm}
              >
                Vider
              </button>
            </div>
          </form>

          <div className="references-list">
            {loading ? (
              <div className="references-empty">Chargement...</div>
            ) : modeles.length === 0 ? (
              <div className="references-empty">Aucun modele.</div>
            ) : (
              modeles.map((modele) => (
                <div key={modele.id} className="references-item">
                  <div>
                    <strong>{modele.nom}</strong>
                    <span>{getMarqueLabel(modele.marque_id)}</span>
                  </div>
                  <div className="references-inline-actions">
                    <button
                      className="references-link-button"
                      type="button"
                      onClick={() => {
                        setEditingModeleId(modele.id)
                        setModeleForm({
                          nom: modele.nom ?? '',
                          marque_id: modele.marque_id ? String(modele.marque_id) : '',
                        })
                        setSuccess('')
                      }}
                    >
                      Modifier
                    </button>
                    <button
                      className="references-link-button"
                      type="button"
                      onClick={() => handleModeleDelete(modele.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  )
}

export default References
