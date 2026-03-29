# Gateway Service

API Gateway for the ERP microservices architecture.
This service centralizes inbound HTTP traffic and forwards each request to the correct backend service.

## 1) Purpose

The Gateway Service is responsible for:

- Exposing one single entrypoint for frontend and API clients.
- Forwarding auth routes to Auth Service.
- Forwarding agences routes to Agence Service.
- Returning a clean `502` response when an upstream service is unavailable.
- Preserving request body for `POST/PUT` proxied requests (login included).

It is not responsible for business logic, database operations, or auth validation rules.
Those remain inside each dedicated microservice.

## 2) Tech Stack

- Node.js
- Express
- `http-proxy-middleware`
- `dotenv`
- `cors`

## 3) Project Structure

```text
Gateway-service/
  src/
    app.js
    routes/
      index.js
    middlewares/
      loggerMiddleware.js
      errorMiddleware.js
  tests/
    run-tests.js
  server.js
  package.json
  .env.example
  Dockerfile
```

## 4) Environment Variables

Create `.env` from `.env.example`.

```env
PORT=8001
AUTH_SERVICE_URL=http://localhost:8000
AGENCE_SERVICE_URL=http://localhost:8002
```

Notes:

- Local mode: use `localhost` upstream URLs.
- Docker Compose mode: use service names (`auth_service`, `agence_service`) as hosts.

## 5) Exposed Routes

Gateway base URL:

```text
http://localhost:8001
```

Health route:

- `GET /` -> `{ "message": "API Gateway is running" }`

Proxied routes:

- `/api/auth/*` -> Auth Service `/api/auth/*`
- `/api/utilisateurs/*` -> Auth Service `/api/utilisateurs/*`
- `/api/agences/*` -> Agence Service `/api/agences/*`

Examples:

- `POST /api/auth/login`
- `POST /api/auth/create-user`
- `GET /api/utilisateurs/profile`
- `GET /api/agences`

## 6) Local Run

From `code/Backend_Server/Gateway-service`:

```bash
npm ci
npm run dev
```

or production mode:

```bash
npm start
```

## 7) Docker Run

Build image:

```bash
docker build -t gateway-service:local .
```

Run container:

```bash
docker run --rm -p 8001:8001 --env-file .env gateway-service:local
```

## 8) Tests

Run tests:

```bash
npm test
```

Current tests validate:

- Root route (`GET /`)
- Unknown route behavior (`404`)
- Proxy forwarding for:
  - `POST /api/auth/login`
  - `GET /api/utilisateurs/profile`
  - `GET /api/agences`

## 9) CI Pipeline

Workflow file:

- `.github/workflows/gateway-ci.yml`

Pipeline steps:

1. Resolve gateway service directory.
2. Install Node.js and dependencies (`npm ci`).
3. Run gateway tests (`npm test`).
4. Build Docker image.

Triggers:

- Push on `main` affecting gateway files.
- Pull request on `main` affecting gateway files.
- Manual trigger (`workflow_dispatch`).

## 10) Error Handling

When an upstream service is down, gateway returns:

- HTTP status: `502`
- Body example:

```json
{
  "message": "Auth service unavailable",
  "error": "connect ECONNREFUSED ..."
}
```

This helps frontend display a clear message without crashing unrelated features.

## 11) Troubleshooting

### Login request stays pending

Root cause:

- `express.json()` consumes body before proxy forwards request.

Fix already implemented:

- `fixRequestBody` is used in proxy `on.proxyReq`.

### Login returns `{ "detail": "Not Found" }`

Root cause:

- Path rewriting mismatch between gateway and upstream path.

Fix already implemented:

- Dynamic `pathRewrite` keeps upstream path consistent (`/api/auth/...`, `/api/utilisateurs/...`, `/api/agences/...`).

### Only one service is down

Behavior:

- Only routes that depend on that service fail with `502`.
- Other routes continue to work normally.

## 12) Notes for Contributors

- Keep gateway logic lightweight (routing, proxying, resilience).
- Do not move business rules from Auth/Agence services into gateway.
- Add tests for every new proxied route or rewrite rule.
