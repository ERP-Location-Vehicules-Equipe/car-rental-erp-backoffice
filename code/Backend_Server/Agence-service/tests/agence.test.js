import { jest } from "@jest/globals";
import request from "supertest";

const TOKEN = "Bearer fake-jwt-for-tests";

const mockVerifyToken = jest.fn((req, res, next) => {
  req.user = { user_id: 1, role: "admin" };
  next();
});

const mockIsAdmin = jest.fn((req, res, next) => next());

const mockAgenceModel = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  findByPk: jest.fn(),
};

jest.unstable_mockModule("../src/middlewares/authMiddleware.js", () => ({
  verifyToken: mockVerifyToken,
}));

jest.unstable_mockModule("../src/middlewares/roleMiddleware.js", () => ({
  isAdmin: mockIsAdmin,
}));

jest.unstable_mockModule("../src/models/agenceModel.js", () => ({
  default: mockAgenceModel,
}));

const { default: app } = await import("../src/app.js");

const fullAgencePayload = {
  nom: "Agence Test",
  code: "TEST01",
  ville: "Casablanca",
  adresse: "10 Rue Hassan II",
  telephone: "+212600000000",
  email: "agence.test@erp.com",
  responsable_nom: "Said Ouchrif",
  heure_ouverture: "08:00",
  heure_fermeture: "18:00",
  capacite_max_vehicules: 120,
};

const buildAgenceInstance = (overrides = {}) => {
  const instance = {
    id: 1,
    actif: true,
    deleted_at: null,
    ...fullAgencePayload,
    ...overrides,
    update: jest.fn(async (data) => {
      Object.assign(instance, data);
      return instance;
    }),
  };

  return instance;
};

describe("Agence API - tests sans DB (mock model)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("POST /api/agences -> creer une agence avec toutes les colonnes", async () => {
    const createdAgence = buildAgenceInstance();
    mockAgenceModel.create.mockResolvedValue(createdAgence);

    const res = await request(app)
      .post("/api/agences")
      .set("Authorization", TOKEN)
      .send(fullAgencePayload);

    expect(res.statusCode).toBe(201);
    expect(mockAgenceModel.create).toHaveBeenCalledWith(fullAgencePayload);
    expect(res.body.nom).toBe(fullAgencePayload.nom);
    expect(res.body.code).toBe(fullAgencePayload.code);
    expect(res.body.capacite_max_vehicules).toBe(120);
    expect(res.body.actif).toBe(true);
  });

  it("GET /api/agences -> recuperer toutes les agences", async () => {
    const agences = [buildAgenceInstance({ id: 1 }), buildAgenceInstance({ id: 2, code: "TEST02" })];
    mockAgenceModel.findAll.mockResolvedValue(agences);

    const res = await request(app)
      .get("/api/agences")
      .set("Authorization", TOKEN);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it("GET /api/agences/:id -> recuperer une agence par id", async () => {
    const agence = buildAgenceInstance({ id: 99 });
    mockAgenceModel.findOne.mockResolvedValue(agence);

    const res = await request(app)
      .get("/api/agences/99")
      .set("Authorization", TOKEN);

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(99);
    expect(res.body.nom).toBe(fullAgencePayload.nom);
  });

  it("PUT /api/agences/:id -> modifier une agence", async () => {
    const agence = buildAgenceInstance({ id: 5 });
    mockAgenceModel.findOne.mockResolvedValue(agence);

    const res = await request(app)
      .put("/api/agences/5")
      .set("Authorization", TOKEN)
      .send({ nom: "Agence Updated", ville: "Rabat" });

    expect(res.statusCode).toBe(200);
    expect(agence.update).toHaveBeenCalledWith({ nom: "Agence Updated", ville: "Rabat" });
    expect(res.body.nom).toBe("Agence Updated");
    expect(res.body.ville).toBe("Rabat");
  });

  it("PATCH /api/agences/:id/disable -> desactiver une agence", async () => {
    const agence = buildAgenceInstance({ id: 10, actif: true });
    mockAgenceModel.findByPk.mockResolvedValue(agence);

    const res = await request(app)
      .patch("/api/agences/10/disable")
      .set("Authorization", TOKEN);

    expect(res.statusCode).toBe(200);
    expect(agence.update).toHaveBeenCalledWith({ actif: false });
    expect(res.body.actif).toBe(false);
  });

  it("PATCH /api/agences/:id/enable -> activer une agence", async () => {
    const agence = buildAgenceInstance({ id: 10, actif: false });
    mockAgenceModel.findByPk.mockResolvedValue(agence);

    const res = await request(app)
      .patch("/api/agences/10/enable")
      .set("Authorization", TOKEN);

    expect(res.statusCode).toBe(200);
    expect(agence.update).toHaveBeenCalledWith({ actif: true });
    expect(res.body.actif).toBe(true);
  });

  it("DELETE /api/agences/:id -> soft delete", async () => {
    const agence = buildAgenceInstance({ id: 7 });
    mockAgenceModel.findOne.mockResolvedValue(agence);

    const res = await request(app)
      .delete("/api/agences/7")
      .set("Authorization", TOKEN);

    expect(res.statusCode).toBe(200);
    expect(agence.update).toHaveBeenCalled();
    expect(res.body.message).toBe("Agence deleted successfully");
  });

  it("GET /api/agences/deleted -> recuperer historique des agences supprimees", async () => {
    const deletedAgences = [
      buildAgenceInstance({
        id: 11,
        code: "DEL01",
        deleted_at: new Date().toISOString(),
      }),
    ];
    mockAgenceModel.findAll.mockResolvedValue(deletedAgences);

    const res = await request(app)
      .get("/api/agences/deleted")
      .set("Authorization", TOKEN);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].code).toBe("DEL01");
  });

  it("PATCH /api/agences/:id/restore -> restaurer une agence supprimee", async () => {
    const agence = buildAgenceInstance({
      id: 21,
      deleted_at: new Date().toISOString(),
    });
    mockAgenceModel.findOne.mockResolvedValue(agence);

    const res = await request(app)
      .patch("/api/agences/21/restore")
      .set("Authorization", TOKEN);

    expect(res.statusCode).toBe(200);
    expect(agence.update).toHaveBeenCalledWith({ deleted_at: null });
    expect(res.body.message).toBe("Agence restored successfully");
    expect(res.body.agence.deleted_at).toBeNull();
  });

  it("GET /api/agences/:id -> retourne 404 si agence introuvable", async () => {
    mockAgenceModel.findOne.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/agences/404")
      .set("Authorization", TOKEN);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Agence not found");
  });
});
