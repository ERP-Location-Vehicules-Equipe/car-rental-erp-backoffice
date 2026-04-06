import { NavLink } from 'react-router-dom'
import './Navbar.css'

const Navbar = () => {
  return (
    <header className="app-header">
      <div className="brand-block">
        <div className="brand-kicker">Car Rental ERP</div>
        <div className="brand">Fleet Backoffice</div>
      </div>
      <nav>
        <NavLink to="/">Home</NavLink>
        <NavLink to="/vehicle">Vehicules</NavLink>
        <NavLink to="/entretien">Entretiens</NavLink>
        <NavLink to="/references">References</NavLink>
      </nav>
    </header>
  )
}

export default Navbar
