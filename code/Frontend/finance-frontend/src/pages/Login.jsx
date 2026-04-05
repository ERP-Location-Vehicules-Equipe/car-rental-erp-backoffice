import { useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import logo from '../assets/logo.png'

export default function Login() {

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const navigate = useNavigate()

  const handleLogin = async () => {
    try {
      const res = await axios.post("/api/auth/login", { email, password })
      localStorage.setItem("access_token", res.data.access_token)
      localStorage.setItem("refresh_token", res.data.refresh_token)
      navigate("/dashboard")
    } catch (err) {
      if (err.response) {
        alert(err.response.data.detail || "Erreur backend")
      } else {
        alert("Backend ma kaytwasalch")
      }
    }
  }

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "#f1f5f9",
    }}>
      <div style={{
        width: 360,
        padding: "2.5rem 2rem",
        borderRadius: 16,
        background: "#fff",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1rem",
      }}>

        {/* Logo */}
        <img src={logo} alt="logo" style={{ width: 72, marginBottom: "0.5rem" }} />

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, color: "#1e293b" }}>
            Finance Service
          </h2>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8", marginTop: 4 }}>
            Connectez-vous à votre espace
          </p>
        </div>

        {/* Email */}
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: "0.65rem 0.9rem",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: "0.9rem",
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        {/* Password */}
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "0.65rem 0.9rem",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: "0.9rem",
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        {/* Button */}
        <button
          onClick={handleLogin}
          style={{
            width: "100%",
            padding: "0.7rem",
            borderRadius: 8,
            border: "none",
            background: "#4f46e5",
            color: "#fff",
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: "pointer",
            marginTop: "0.25rem",
          }}
        >
          Se connecter
        </button>

      </div>
    </div>
  )
}
