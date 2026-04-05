import { useEffect, useState } from "react";
import axios from "axios";

export default function ReportPage() {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({});
  const [dashboard, setDashboard] = useState({});
  const [loading, setLoading] = useState(false);

  const BASE_URL = "http://localhost:8001/api";

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [reportsRes, statsRes, dashRes] = await Promise.all([
        axios.get(`${BASE_URL}/reports`),
        axios.get(`${BASE_URL}/reports/stats`),
        axios.get(`${BASE_URL}/reports/dashboard`),
      ]);
      setReports(reportsRes.data);
      setStats(statsRes.data);
      setDashboard(dashRes.data);
    } catch (err) {
      console.error(err);
      alert("❌ Erreur de connexion au backend");
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleGenerate = async () => {
    try {
      await axios.post(`${BASE_URL}/reports/generate`);
      await fetchAll();
      alert("✅ Rapport généré !");
    } catch (err) {
      alert("❌ Erreur lors de la génération");
    }
  };

  const handlePDF   = () => window.open(`${BASE_URL}/reports/export/pdf`);
  const handleExcel = () => window.open(`${BASE_URL}/reports/export/excel`);

  const cardStyle = {
    background: "#f0f4ff",
    borderRadius: "12px",
    padding: "20px",
    minWidth: "180px",
    textAlign: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
  };

  const btnStyle = (color) => ({
    padding: "10px 20px",
    background: color,
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "14px"
  });

  return (
    <div style={{ padding: "30px", fontFamily: "Arial", maxWidth: "1100px", margin: "0 auto" }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <h1 style={{ margin: 0 }}>📊 Report Service</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <button style={btnStyle("#4CAF50")} onClick={handleGenerate}>➕ Générer</button>
          <button style={btnStyle("#2196F3")} onClick={fetchAll}>🔄 Rafraîchir</button>
          <button style={btnStyle("#f44336")} onClick={handlePDF}>📄 PDF</button>
          <button style={btnStyle("#217346")} onClick={handleExcel}>📊 Excel</button>
        </div>
      </div>

      {loading && <p style={{ color: "#888" }}>⏳ Chargement...</p>}

      {/* DASHBOARD */}
      <h2>🖥️ Dashboard</h2>
      <div style={{ display: "flex", gap: "20px", marginBottom: "30px", flexWrap: "wrap" }}>
        <div style={cardStyle}>
          <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>Total Locations</p>
          <h2 style={{ margin: "8px 0", color: "#3f51b5" }}>{dashboard.total_locations ?? "—"}</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>Total Revenue</p>
          <h2 style={{ margin: "8px 0", color: "#4CAF50" }}>{dashboard.total_revenue ?? "—"} €</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>Prix Moyen</p>
          <h2 style={{ margin: "8px 0", color: "#FF9800" }}>{dashboard.average_price ?? "—"} €</h2>
        </div>
      </div>

      {/* STATS */}
      <h2>📈 Statistiques Globales</h2>
      <div style={{ display: "flex", gap: "20px", marginBottom: "30px", flexWrap: "wrap" }}>
        <div style={cardStyle}>
          <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>Total Rapports</p>
          <h2 style={{ margin: "8px 0", color: "#9C27B0" }}>{stats.total_reports ?? "—"}</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>Revenue Total</p>
          <h2 style={{ margin: "8px 0", color: "#4CAF50" }}>{stats.total_revenue ?? "—"} €</h2>
        </div>
        <div style={cardStyle}>
          <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>Prix Moyen</p>
          <h2 style={{ margin: "8px 0", color: "#FF9800" }}>{stats.average_price ?? "—"} €</h2>
        </div>
      </div>

      {/* TABLE */}
      <h2>📋 Historique des Rapports</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#3f51b5", color: "#fff" }}>
            <th style={{ padding: "12px" }}>ID</th>
            <th style={{ padding: "12px" }}>Locations</th>
            <th style={{ padding: "12px" }}>Revenue (€)</th>
            <th style={{ padding: "12px" }}>Prix Moyen (€)</th>
            <th style={{ padding: "12px" }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {reports.length === 0 ? (
            <tr>
              <td colSpan="5" style={{ textAlign: "center", padding: "20px", color: "#888" }}>
                Aucun rapport disponible
              </td>
            </tr>
          ) : (
            reports.map((r, i) => (
              <tr key={r.id} style={{ background: i % 2 === 0 ? "#f9f9f9" : "#fff" }}>
                <td style={{ padding: "10px", textAlign: "center" }}>{r.id}</td>
                <td style={{ padding: "10px", textAlign: "center" }}>{r.total_locations}</td>
                <td style={{ padding: "10px", textAlign: "center", color: "#4CAF50", fontWeight: "bold" }}>{r.revenue_total}</td>
                <td style={{ padding: "10px", textAlign: "center", color: "#FF9800", fontWeight: "bold" }}>{r.prix_moyen}</td>
                <td style={{ padding: "10px", textAlign: "center" }}>{r.date_creation}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}