import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";
import dotenv from "dotenv";

dotenv.config();

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:8000";
const AGENCE_SERVICE_URL = process.env.AGENCE_SERVICE_URL || "http://localhost:8002";
const FLEET_SERVICE_URL = process.env.FLEET_SERVICE_URL || "http://localhost:8004";

const buildProxy = (target, upstreamBasePath, serviceName) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    // Evite d'exposer les redirects internes (ex: auth_service:8000) au navigateur.
    // Le gateway suit/re-ecrit les redirections et renvoie une reponse propre au frontend.
    followRedirects: true,
    autoRewrite: true,
    pathRewrite: (path) => {
      if (path === "/" || path === "") {
        return upstreamBasePath;
      }
      return `${upstreamBasePath}${path}`;
    },
    // Corrige le forwarding des requetes POST/PUT quand le body a deja ete parse par Express.
    on: {
      proxyReq: (proxyReq, req, res) => {
        fixRequestBody(proxyReq, req, res);
      },
      // Retourne une erreur exploitable si le service cible est indisponible.
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
export const authProxy = buildProxy(
  AUTH_SERVICE_URL,
  "/api/auth",
  "Auth service"
);

// ==============================
// USERS SERVICE PROXY (vers Auth Service)
// ==============================
export const usersProxy = buildProxy(
  AUTH_SERVICE_URL,
  "/api/utilisateurs",
  "Users service"
);

// ==============================
// AGENCE SERVICE PROXY
// ==============================
export const agenceProxy = buildProxy(
  AGENCE_SERVICE_URL,
  "/api/agences",
  "Agence service"
);

// ==============================
// FLEET SERVICE PROXY
// ==============================
export const fleetProxy = buildProxy(
  FLEET_SERVICE_URL,
  // The app mounts this proxy on /api/fleet, so upstream should receive /vehicles, /marques, etc.
  // Keeping empty upstreamBasePath avoids forwarding /api/fleet/api/fleet/... by mistake.
  "",
  "Fleet service"
);
