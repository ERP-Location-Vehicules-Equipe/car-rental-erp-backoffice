import assert from "node:assert/strict";
import http from "node:http";

const startHttpServer = (handler) =>
  new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });

const stopHttpServer = (server) =>
  new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });

const readJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

const createMockService = async (serviceName) => {
  const calls = [];

  const server = await startHttpServer(async (req, res) => {
    const body = await readJsonBody(req);
    calls.push({
      method: req.method,
      url: req.url,
      body,
    });

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        service: serviceName,
        method: req.method,
        path: req.url,
        body,
      })
    );
  });

  const { port } = server.address();
  return {
    server,
    calls,
    baseUrl: `http://127.0.0.1:${port}`,
  };
};

const startGatewayWithMockTargets = async (authBaseUrl, agenceBaseUrl) => {
  process.env.AUTH_SERVICE_URL = authBaseUrl;
  process.env.AGENCE_SERVICE_URL = agenceBaseUrl;

  const { default: app } = await import(`../src/app.js?test=${Date.now()}`);
  return startHttpServer(app);
};

const run = async () => {
  const results = [];

  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, ok: true });
      console.log(`PASS - ${name}`);
    } catch (error) {
      results.push({ name, ok: false, error });
      console.error(`FAIL - ${name}`);
      console.error(error);
    }
  };

  const authMock = await createMockService("auth");
  const agenceMock = await createMockService("agence");
  const gatewayServer = await startGatewayWithMockTargets(
    authMock.baseUrl,
    agenceMock.baseUrl
  );

  const { port: gatewayPort } = gatewayServer.address();
  const gatewayBaseUrl = `http://127.0.0.1:${gatewayPort}`;

  try {
    await test("GET / should return gateway status message", async () => {
      const response = await fetch(`${gatewayBaseUrl}/`);
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.message, "API Gateway is running");
    });

    await test("GET /unknown should return 404", async () => {
      const response = await fetch(`${gatewayBaseUrl}/unknown`);
      assert.equal(response.status, 404);
    });

    await test("POST /api/auth/login should keep /api/auth prefix", async () => {
      const payload = { email: "user@test.com", password: "secret" };

      const response = await fetch(`${gatewayBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.service, "auth");
      assert.equal(body.path, "/api/auth/login");
      assert.equal(authMock.calls.at(-1)?.url, "/api/auth/login");
      assert.deepEqual(authMock.calls.at(-1)?.body, payload);
    });

    await test("GET /api/utilisateurs/profile should keep /api/utilisateurs prefix", async () => {
      const response = await fetch(`${gatewayBaseUrl}/api/utilisateurs/profile`, {
        headers: { Authorization: "Bearer fake-token" },
      });
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.service, "auth");
      assert.equal(body.path, "/api/utilisateurs/profile");
      assert.equal(authMock.calls.at(-1)?.url, "/api/utilisateurs/profile");
    });

    await test("GET /api/agences should keep /api/agences prefix", async () => {
      const response = await fetch(`${gatewayBaseUrl}/api/agences`);
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.service, "agence");
      assert.equal(body.path, "/api/agences");
      assert.equal(agenceMock.calls.at(-1)?.url, "/api/agences");
    });
  } finally {
    await stopHttpServer(gatewayServer);
    await stopHttpServer(authMock.server);
    await stopHttpServer(agenceMock.server);
  }

  const failed = results.filter((item) => !item.ok).length;
  console.log(`\nSummary: ${results.length - failed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exitCode = 1;
  }
};

run();
