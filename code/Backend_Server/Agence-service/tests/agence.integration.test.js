import dotenv from "dotenv";
import request from "supertest";
import jwt from "jsonwebtoken";
import { Client } from "pg";

dotenv.config();

const sanitizeEnvValue = (value) => {
  if (!value) return "";
  return value.trim().replace(/^['\"]|['\"]$/g, "");
};

const parseUrlOrThrow = (value, variableName) => {
  try {
    return new URL(value);
  } catch {
    throw new Error(
      `${variableName} is invalid. Example: postgresql://erp_user:erp_password@localhost:5432/agence_test_db`
    );
  }
};

const buildTestDatabaseUrl = () => {
  const explicitUrl = sanitizeEnvValue(process.env.INTEGRATION_DATABASE_URL);
  if (explicitUrl) {
    return explicitUrl;
  }

  const baseUrl = sanitizeEnvValue(process.env.DATABASE_URL);
  if (baseUrl) {
    try {
      const parsed = new URL(baseUrl);

      // Local tests run outside docker network.
      if (parsed.hostname === "postgres_db") {
        parsed.hostname = "localhost";
      }

      // Keep test data isolated from main DB.
      parsed.pathname = "/agence_test_db";

      return parsed.toString();
    } catch {
      // Fall through to default URL.
    }
  }

  return "postgresql://erp_user:erp_password@localhost:5432/agence_test_db";
};

const TEST_DB_URL = buildTestDatabaseUrl();
const rawTestSecret = sanitizeEnvValue(process.env.TEST_SECRET_KEY);
const TEST_SECRET =
  rawTestSecret && !rawTestSecret.includes(".")
    ? rawTestSecret
    : sanitizeEnvValue(process.env.SECRET_KEY) || "integration_test_secret";

process.env.NODE_ENV = "test";
process.env.SECRET_KEY = TEST_SECRET;
process.env.DATABASE_URL = TEST_DB_URL;

const ensureTestDatabaseExists = async () => {
  const targetUrl = parseUrlOrThrow(
    TEST_DB_URL,
    "INTEGRATION_DATABASE_URL (or DATABASE_URL fallback)"
  );

  const testDbName = targetUrl.pathname.replace(/^\//, "");
  if (!testDbName || !/^[a-zA-Z0-9_]+$/.test(testDbName)) {
    throw new Error("Invalid test database name in integration database URL");
  }

  const adminUrl = new URL(targetUrl.toString());
  adminUrl.pathname = "/postgres";

  const adminClient = new Client({ connectionString: adminUrl.toString() });
  await adminClient.connect();

  const dbCheck = await adminClient.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [testDbName]
  );

  if (dbCheck.rowCount === 0) {
    await adminClient.query(`CREATE DATABASE \"${testDbName}\"`);
  }

  await adminClient.end();
};

await ensureTestDatabaseExists();

const { default: sequelize } = await import("../src/config/db.js");
await import("../src/models/agenceModel.js");
const { default: app } = await import("../src/app.js");

describe("Agence API - integration tests (real JWT + real DB)", () => {
  let token;
  let agenceId;

  const suffix = Date.now();
  const payload = {
    nom: "Agence Integration",
    code: `INT_${suffix}`,
    ville: "Casablanca",
    adresse: "Boulevard Integration 123",
    telephone: "+212600001111",
    email: `integration_${suffix}@erp.com`,
    responsable_nom: "Admin Integration",
    heure_ouverture: "08:30",
    heure_fermeture: "19:00",
    capacite_max_vehicules: 150,
  };

  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });

    token = `Bearer ${jwt.sign(
      { user_id: 1, email: "integration@erp.com", role: "admin" },
      TEST_SECRET,
      { expiresIn: "1h" }
    )}`;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it("POST /api/agences -> create agence", async () => {
    const res = await request(app)
      .post("/api/agences")
      .set("Authorization", token)
      .send(payload);

    expect(res.statusCode).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.nom).toBe(payload.nom);
    expect(res.body.code).toBe(payload.code);
    expect(res.body.ville).toBe(payload.ville);
    expect(res.body.adresse).toBe(payload.adresse);
    expect(res.body.telephone).toBe(payload.telephone);
    expect(res.body.email).toBe(payload.email);
    expect(res.body.responsable_nom).toBe(payload.responsable_nom);
    expect(res.body.heure_ouverture).toBe(payload.heure_ouverture);
    expect(res.body.heure_fermeture).toBe(payload.heure_fermeture);
    expect(res.body.capacite_max_vehicules).toBe(payload.capacite_max_vehicules);
    expect(res.body.actif).toBe(true);
    expect(res.body.deleted_at).toBeNull();

    agenceId = res.body.id;
  });

  it("GET /api/agences -> list agences", async () => {
    const res = await request(app)
      .get("/api/agences")
      .set("Authorization", token);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("GET /api/agences/:id -> get agence by id", async () => {
    const res = await request(app)
      .get(`/api/agences/${agenceId}`)
      .set("Authorization", token);

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(agenceId);
    expect(res.body.code).toBe(payload.code);
  });

  it("PUT /api/agences/:id -> update agence", async () => {
    const res = await request(app)
      .put(`/api/agences/${agenceId}`)
      .set("Authorization", token)
      .send({
        nom: "Agence Integration Updated",
        ville: "Rabat",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.nom).toBe("Agence Integration Updated");
    expect(res.body.ville).toBe("Rabat");
  });

  it("PATCH /api/agences/:id/disable -> disable agence", async () => {
    const res = await request(app)
      .patch(`/api/agences/${agenceId}/disable`)
      .set("Authorization", token);

    expect(res.statusCode).toBe(200);
    expect(res.body.actif).toBe(false);
  });

  it("PATCH /api/agences/:id/enable -> enable agence", async () => {
    const res = await request(app)
      .patch(`/api/agences/${agenceId}/enable`)
      .set("Authorization", token);

    expect(res.statusCode).toBe(200);
    expect(res.body.actif).toBe(true);
  });

  it("DELETE /api/agences/:id -> soft delete agence", async () => {
    const res = await request(app)
      .delete(`/api/agences/${agenceId}`)
      .set("Authorization", token);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Agence deleted successfully");
  });

  it("GET /api/agences/:id after delete -> should return 404", async () => {
    const res = await request(app)
      .get(`/api/agences/${agenceId}`)
      .set("Authorization", token);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Agence not found");
  });

  it("GET /api/agences/deleted -> list deleted agences", async () => {
    const res = await request(app)
      .get("/api/agences/deleted")
      .set("Authorization", token);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((agence) => agence.id === agenceId)).toBe(true);
  });

  it("PATCH /api/agences/:id/restore -> restore deleted agence", async () => {
    const res = await request(app)
      .patch(`/api/agences/${agenceId}/restore`)
      .set("Authorization", token);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Agence restored successfully");
    expect(res.body.agence.id).toBe(agenceId);
    expect(res.body.agence.deleted_at).toBeNull();
  });

  it("GET /api/agences/:id after restore -> should return 200", async () => {
    const res = await request(app)
      .get(`/api/agences/${agenceId}`)
      .set("Authorization", token);

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(agenceId);
  });
});
