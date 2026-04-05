import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import FleetDashboard from './pages/FleetDashboard'
import Vehicle from './pages/Vehicle'
import Maintenance from './pages/Maintenance'

function App() {
  // Composant principal de l'application : gère la navigation (routage)
  return (
    <BrowserRouter>
      <Navbar />

      <main className="app-main">
        <Routes>
          <Route path="/" element={<FleetDashboard />} />
          <Route path="/vehicle" element={<Vehicle />} />
          <Route path="/maintenance" element={<Maintenance />} />
        </Routes>
      </main>

      <Footer />
    </BrowserRouter>
  )
}

export default App
