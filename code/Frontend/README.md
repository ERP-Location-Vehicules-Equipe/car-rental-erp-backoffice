# Frontend ERP (React + Vite)

Frontend backoffice for the ERP car-rental project.

## 1) Role in the architecture

The frontend talks to one backend entrypoint only:

- API Gateway: `http://localhost:8001/api`

It does not call Auth Service (`:8000`) or Agence Service (`:8002`) directly anymore.

## 2) Main features

- Login with JWT token.
- Profile page (read/update current user).
- Users management (list, create, edit, enable/disable, delete) with role-based UI.
- Agences management pages.
- Agence name display (instead of agence_id) when data is available.
- Graceful degradation when Agence Service is down (warning message, no app crash).

## 3) Recent updates (what was done now)

- Unified API access through Gateway only.
  - `src/api/api.js` -> base URL uses `VITE_API_GATEWAY_URL`.
  - `src/api/agenceApi.js` -> same gateway base URL.
- Added frontend env variable:
  - `VITE_API_GATEWAY_URL=http://localhost:8001/api`
- Docker Compose frontend service now injects `VITE_API_GATEWAY_URL`.
- Updated users list call to avoid FastAPI trailing-slash redirect:
  - `getAllUsers()` now calls `/utilisateurs/` (with final slash).
- Existing fallback behavior kept:
  - If Agence Service is unavailable, pages show warning and continue with auth/users data.

## 4) Project structure

```text
Frontend/
  src/
    api/
      api.js
      agenceApi.js
    Layouts/
    Pages/
      Auth/
      Dashboard/
      Profile/
      Users/
      Agences/
    Routes/
    Services/
      authService.js
      userService.js
      agenceService.js
      agenceLookupService.js
    utils/
      errorHandler.js
```

## 5) Environment variables

Use `.env` (or `.env.local`) in `code/Frontend/`:

```env
VITE_API_GATEWAY_URL=http://localhost:8001/api
```

Default fallback in code is also `http://localhost:8001/api`.

## 6) Local run

From `code/Frontend`:

```bash
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

## 7) Docker run

Frontend service is defined in:

- `code/docker-compose.yml`

Important:

- `frontend_app` depends on `gateway_service`.
- `VITE_API_GATEWAY_URL` is injected in compose.

## 8) API usage rules

- Always call routes through gateway prefix `/api`.
- Auth examples:
  - `POST /auth/login`
  - `GET /utilisateurs/profile`
  - `GET /utilisateurs/`
- Agence examples:
  - `GET /agences`
  - `POST /agences`

## 9) Error handling behavior

- `401`: user is logged out and redirected to `/login`.
- Network/downstream issues: translated error message via `src/utils/errorHandler.js`.
- Agence service down:
  - frontend can still work for auth/users flows.
  - agence name lookups can fallback to warning/unknown label.

## 10) Quick troubleshooting

If browser still calls old URLs or internal Docker hosts:

1. Rebuild frontend container:
   - `docker compose up -d --build frontend_app`
2. Rebuild gateway if proxy code changed:
   - `docker compose up -d --build gateway_service`
3. Hard refresh browser (`Ctrl + F5`).
