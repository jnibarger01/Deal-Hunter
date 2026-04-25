# Deal Hunter

Operational baseline for Deal Hunter: a Node/Express/Prisma API, React/Vite frontend, and Docker Compose deployment assets.

## Current Repo State

- Standalone baseline repo.
- One baseline commit exists.
- Expected clean baseline state: no active code diff except an untracked `.codex/` directory.
- This README documents the current review findings only. Application code behavior has not been changed by this documentation pass.

## Project Layout

- `server/` — Express API, Prisma schema, Jest tests.
- `frontend/` — React/Vite SPA.
- `docker/` — Dockerfiles for runtime images.
- `nginx/` — reverse proxy configuration.
- `docker-compose.yml` — base local compose file.
- `docker-compose.prod.yml` — production compose override/stack file; see known issue below.
- `docs/` — deployment and release notes.

## Environment Setup

Use placeholder values locally. Do not commit real credentials.

```bash
cp server/.env.example server/.env
```

`server/.env.example` is the tracked template. `server/.env` is the local file consumed by the base Docker Compose server service.

Required local values:

- `DATABASE_URL` — local PostgreSQL URL.
- `JWT_SECRET` — 32+ characters.
- `API_KEY` — 32+ characters if enabled by server validation/runtime config.
- `FRONTEND_URL` and `CORS_ORIGIN` — local frontend/proxy origins.

External service keys such as eBay, Gemini, SMTP, and Facebook should stay empty unless testing those integrations intentionally.

## Recommended Local Startup

Install dependencies from the repo root:

```bash
npm install
```

Start the local database:

```bash
docker compose up -d db
```

Generate Prisma client and create/update DB tables before calling API routes that depend on Prisma tables:

```bash
cd server
npm run prisma:generate
npm run prisma:migrate
cd ..
```

Then run the app:

```bash
npm run dev
```

Useful local URLs:

- Frontend dev server: `http://localhost:5173`
- API server: `http://localhost:5000`
- Nginx proxy when compose nginx is running: `http://localhost:8081`

## Docker Compose

Validate the base compose file:

```bash
docker compose config
```

Start the base local stack:

```bash
docker compose up -d
```

The README quick start must not be treated as a DB migration guarantee. Migrations are required before Prisma-backed API routes can work. Run the Prisma commands above when bootstrapping a fresh database.

## Verified Commands

These results are from the completed baseline/code-review pass.

| Area | Command | Result |
| --- | --- | --- |
| Server tests | `cd server && npm test` | Passes when run outside the sandbox. |
| Server build | `cd server && npm run build` | Passes. |
| Frontend build | `cd frontend && npm run build` | Passes. |
| Workers build | `cd workers && npm run build` | Not runnable in this checkout; `workers/` is absent. |
| Base compose config | `docker compose config` | Passes. |
| Production compose alone | `docker compose -f docker-compose.prod.yml config` | Currently fails; see known issues. |

## Known Issues / Next Fixes

- `docker-compose.yml` uses `API_KEY=dev-api-key-change-in-prod`, but server env validation requires an API key of at least 32 characters.
- Workers service is referenced by compose/review findings, but no `workers/` package exists in this checkout. The referenced runtime path is `dist/workers/scheduler.js`; verify the compose topology before adding or wiring a worker image.
- `docker-compose.prod.yml` is not standalone-valid because `nginx` depends on an undefined `frontend` service.
- README quick start may not create DB tables because migration execution is behind a compose profile or otherwise not part of the default startup path.
- `/api` proxy paths are forwarded unchanged, but Express routes are mounted without an `/api` prefix.
- Ranked scoring currently sorts by raw fields instead of `compositeScore`.
- The score route `limit` parser can produce `NaN`; invalid input should return HTTP 400.
- Quality scripts are currently broken or incomplete:
  - server lint does not target existing TypeScript files correctly.
  - frontend lint has no ESLint config.
  - server `test:tmv` points at the wrong test path.

## Quality / Verification Commands

Run these before treating a baseline as deployable:

```bash
cd server && npm test
cd server && npm run build
cd frontend && npm run build
cd workers && npm run build

docker compose config
docker compose -f docker-compose.prod.yml config
```

Expected current behavior:

- Builds should pass for packages present in this checkout.
- `workers/` is absent in this checkout, so `cd workers && npm run build` is not runnable and should not be counted as verified.
- `docker-compose.prod.yml` alone is expected to fail until the undefined `frontend` dependency is fixed or the compose files are invoked together intentionally.

## Runtime Notes

- Health endpoints: `/health` and `/ready`.
- API routes are mounted under the server route configuration, not automatically under an nginx-added `/api` prefix.
- Prisma-backed routes require generated Prisma client and migrated tables.
- Keep Craigslist scheduler disabled unless recurring ingest is explicitly desired.

## Deployment Docs

- Production runbook: `docs/production.md`
- Release checklist: `docs/release-checklist.md`

## Security

- Do not commit real credentials.
- Use generated 32+ character values for local secrets.
- Store production secrets in the deployment environment, not in git.
