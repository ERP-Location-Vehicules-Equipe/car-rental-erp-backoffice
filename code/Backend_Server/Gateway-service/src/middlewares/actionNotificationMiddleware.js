import dotenv from "dotenv";

dotenv.config();

const NOTIFICATION_SERVICE_URL =
  process.env.NOTIFICATION_SERVICE_URL || "http://notification_service:8006";
const EVENT_TIMEOUT_MS = Number(process.env.NOTIFICATION_EVENT_TIMEOUT_MS || 3000);
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const EXCLUDED_PATH_PREFIXES = ["/api/notifications"];

const normalizeBaseUrl = (value) => value.replace(/\/+$/, "");

const getTokenFromHeader = (authorizationHeader) => {
  if (!authorizationHeader || typeof authorizationHeader !== "string") {
    return null;
  }
  const [scheme, token] = authorizationHeader.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }
  return token.trim() || null;
};

const decodeJwtPayload = (token) => {
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const payloadRaw = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(payloadRaw);
  } catch {
    return null;
  }
};

const buildActionUrl = (path) => {
  if (path.startsWith("/api/finance")) return "/finance";
  if (path.startsWith("/api/fleet")) return "/fleet";
  if (path.startsWith("/api/location")) return "/locations";
  if (path.startsWith("/api/transfer")) return "/transfers";
  if (path.startsWith("/api/agences")) return "/agences";
  if (path.startsWith("/api/utilisateurs")) return "/utilisateurs";
  if (path.startsWith("/api/auth")) return "/utilisateurs";
  return "/";
};

const shouldNotify = (req, res) => {
  if (!MUTATION_METHODS.has(String(req.method || "").toUpperCase())) {
    return false;
  }

  if (Number(res.statusCode || 500) >= 400) {
    return false;
  }

  const path = req.originalUrl || req.url || "";
  if (!path || path === "/") {
    return false;
  }

  for (const prefix of EXCLUDED_PATH_PREFIXES) {
    if (path.startsWith(prefix)) {
      return false;
    }
  }

  return true;
};

export const actionNotificationMiddleware = (req, res, next) => {
  const token = getTokenFromHeader(req.headers?.authorization);
  const payload = decodeJwtPayload(token);
  const method = String(req.method || "").toUpperCase();
  const path = req.originalUrl || req.url || "";

  res.on("finish", () => {
    if (!token || !shouldNotify(req, res)) {
      return;
    }

    const agenceIdRaw = payload?.agence_id;
    const parsedAgenceId = Number(agenceIdRaw);
    const agenceId = Number.isFinite(parsedAgenceId) ? parsedAgenceId : null;
    const scope = agenceId !== null ? "agence" : "all";
    const eventType = `gateway_${method.toLowerCase()}`;
    const title = `${method} ${path}`;
    const message = `Action ${method} executee avec succes sur ${path}.`;

    const eventPayload = {
      event_type: eventType,
      title,
      message,
      channels: ["popup", "email"],
      scope,
      agence_id: agenceId,
      action_url: buildActionUrl(path),
      metadata: {
        path,
        method,
        status_code: Number(res.statusCode || 200),
      },
      user_email: payload?.email || null,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EVENT_TIMEOUT_MS);

    fetch(`${normalizeBaseUrl(NOTIFICATION_SERVICE_URL)}/notifications/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(eventPayload),
      signal: controller.signal,
    })
      .catch(() => {
        // Non-blocking notification dispatch.
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });
  });

  next();
};
