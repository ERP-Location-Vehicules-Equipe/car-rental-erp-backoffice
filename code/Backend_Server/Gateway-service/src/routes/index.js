import { createProxyMiddleware } from "http-proxy-middleware";
import dotenv from "dotenv";

dotenv.config();

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:8000";
const AGENCE_SERVICE_URL = process.env.AGENCE_SERVICE_URL || "http://localhost:8002";

const buildProxy = (target, pathPattern, serviceName) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: {
      [pathPattern]: pathPattern,
    },
    // Retourne une erreur exploitable si le service cible est indisponible.
    on: {
      error: (err, req, res) => {
        if (!res.headersSent) {
          res.writeHead(502, { "Content-Type": "application/json" });
        }
        res.end(
          JSON.stringify({
            message: `${serviceName} unavailable`,
            error: err?.message || "Proxy error",
          })
        );
      },
    },
  });

// ==============================
// AUTH SERVICE PROXY
// ==============================
export const authProxy = buildProxy(AUTH_SERVICE_URL, "^/api/auth", "Auth service");

// ==============================
// USERS SERVICE PROXY (vers Auth Service)
// ==============================
export const usersProxy = buildProxy(
  AUTH_SERVICE_URL,
  "^/api/utilisateurs",
  "Users service"
);

// ==============================
// AGENCE SERVICE PROXY
// ==============================
export const agenceProxy = buildProxy(
  AGENCE_SERVICE_URL,
  "^/api/agences",
  "Agence service"
);
