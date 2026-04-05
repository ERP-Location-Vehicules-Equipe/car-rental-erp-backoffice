import { useState } from 'react'
import './App.css'
import TransferListPage from './pages/TransferListPage.jsx'
import TransferCreatePage from './pages/TransferCreatePage.jsx'
import erpLogo from './assets/erp-logo.jpg'

function App() {
  const [page, setPage] = useState('list')

  return (
    <div className="layout">
      <header className="topbar">
        <div className="brand">
          <img src={erpLogo} alt="ERP Auto" className="brand-logo" />
          <div>
            <div className="brand-name">ERP Auto</div>
            <div className="brand-sub">Service de transfert</div>
          </div>
        </div>
        <div className="tab-nav">
          <button
            className={`tab-btn ${page === 'list' ? 'active' : ''}`}
            type="button"
            onClick={() => setPage('list')}
            disabled={page === 'list'}
          >
            Transferts
          </button>
          <button
            className={`tab-btn ${page === 'create' ? 'active' : ''}`}
            type="button"
            onClick={() => setPage('create')}
            disabled={page === 'create'}
          >
            Nouveau transfert
          </button>
        </div>
      </header>

      {page === 'list' ? (
        <TransferListPage onCreateClick={() => setPage('create')} />
      ) : (
        <TransferCreatePage
          onBackToList={() => setPage('list')}
          onCreated={() => setPage('list')}
        />
      )}
    </div>
  )
}

export default App
