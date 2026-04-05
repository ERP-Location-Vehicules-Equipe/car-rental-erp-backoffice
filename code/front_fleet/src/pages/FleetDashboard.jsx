import { Link } from 'react-router-dom'
import './FleetDashboard.css'

const featureCards = [
  {
    title: 'Vehicules',
    text: 'Pilotage du parc, statut, prix, kilometrage et disponibilite en un seul endroit.',
    to: '/vehicle',
    cta: 'Ouvrir la flotte',
  },
  {
    title: 'Maintenance',
    text: 'Planifier, suivre et cloturer les interventions avec historique et budget.',
    to: '/maintenance',
    cta: 'Ouvrir latelier',
  },
]

const FleetDashboard = () => {
  return (
    <section className="dashboard-page">
      <div className="dashboard-hero">
        <div className="dashboard-copy">
          <div className="dashboard-eyebrow">ERP Fleet Experience</div>
          <h1>Backoffice flotte plus clair, plus rapide, plus vivant.</h1>
          <p>
            Une interface modernisee pour gerer les vehicules et les maintenances,
            avec des ecrans coherents, des tableaux lisibles et des formulaires relies
            directement au backend fleet-service.
          </p>
          <div className="dashboard-actions">
            <Link className="dashboard-primary" to="/vehicle">
              Aller aux vehicules
            </Link>
            <Link className="dashboard-secondary" to="/maintenance">
              Aller a la maintenance
            </Link>
          </div>
        </div>

        <div className="dashboard-side">
          <div className="dashboard-highlight">
            <span>Mission du jour</span>
            <strong>Coordonner la flotte, les interventions et les couts.</strong>
            <p>Une meme direction visuelle sur tout le front pour eviter l'effet pages disparates.</p>
          </div>
          <div className="dashboard-metrics">
            <div className="dashboard-metric-card">
              <span>Modules</span>
              <strong>2</strong>
            </div>
            <div className="dashboard-metric-card">
              <span>Flux CRUD</span>
              <strong>Live</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {featureCards.map((card) => (
          <Link key={card.title} className="dashboard-card" to={card.to}>
            <div className="dashboard-card-top">
              <span className="dashboard-card-label">{card.title}</span>
              <span className="dashboard-card-arrow">-&gt;</span>
            </div>
            <strong>{card.cta}</strong>
            <p>{card.text}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default FleetDashboard
