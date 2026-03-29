import assert from "node:assert/strict";
import http from "node:http";

import app from "../src/app.js";
import { agenceProxy, authProxy, usersProxy } from "../src/routes/index.js";

const startServer = () =>
  new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });

const stopServer = (server) =>
  new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });

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

  await test("Proxy middlewares should be functions", async () => {
    assert.equal(typeof authProxy, "function");
    assert.equal(typeof usersProxy, "function");
    assert.equal(typeof agenceProxy, "function");
  });

  await test("GET / should return gateway message", async () => {
    const server = await startServer();
    try {
      const { port } = server.address();
      const response = await fetch(`http://127.0.0.1:${port}/`);
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.message, "API Gateway is running");
    } finally {
      await stopServer(server);
    }
  });

  await test("GET /unknown should return 404", async () => {
    const server = await startServer();
    try {
      const { port } = server.address();
      const response = await fetch(`http://127.0.0.1:${port}/unknown`);
      assert.equal(response.status, 404);
    } finally {
      await stopServer(server);
    }
  });

  const failed = results.filter((item) => !item.ok).length;
  console.log(`\nSummary: ${results.length - failed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exitCode = 1;
  }
};

run();
