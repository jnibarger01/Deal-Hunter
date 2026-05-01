# Deal Hunter

Operational baseline for Deal Hunter: a Node/Express/Prisma API, React/Vite frontend, and Docker Compose deployment assets.

## Current Repo State

- npm workspaces repo with `server` and `frontend` packages.
- Current product direction is operator-first deal ingestion, TMV/scoring, ranked opportunities, and deal intelligence.
- Treat this as an active pre-launch codebase. Run the quality gates below before claiming deployability.

## Project Layout

- `server/` — Express API, Prisma schema, Jest tests.
- `frontend/` — React/Vite SPA.
- `docker/` — Dockerfiles for runtime images.
- `nginx/` — reverse proxy configuration.
- `docker-compose.yml` — base local compose file.
- `docker-compose.staging.yml` — staging stack for published images.
- `docker-compose.prod.yml` — production stack for published images.
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
- `API_KEY` — 32+ characters.
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
docker compose -f docker-compose.staging.yml config
docker compose -f docker-compose.prod.yml config
```

Staging and production config checks may warn about unset deployment variables in a local shell. That means the YAML renders, not that the target environment is ready.

Start the base local stack:

```bash
docker compose up -d
```

The README quick start must not be treated as a DB migration guarantee. Migrations are required before Prisma-backed API routes can work. Run the Prisma commands above when bootstrapping a fresh database.

## Verified Commands

Use these commands as the current local gate:

| Area | Command | Result |
| --- | --- | --- |
| Server lint | `cd server && npm run lint` | Required before release. |
| Server tests | `cd server && npm test` | Required before release; needs migrated Postgres for integration paths. |
| Server build/typecheck | `cd server && npm run build` | Runs `tsc`. |
| Frontend tests | `cd frontend && npm test` | Required before release. |
| Frontend build/typecheck | `cd frontend && npm run build` | Runs `tsc && vite build`. |
| Workspace build | `npm run build` | Builds server and frontend workspaces. |
| Compose config | `docker compose config` | Validates local stack. |
| Staging compose config | `docker compose -f docker-compose.staging.yml config` | Validates staging stack. |
| Production compose config | `docker compose -f docker-compose.prod.yml config` | Validates production stack. |

## Known Issues / Next Fixes

- No separate `workers/` workspace exists. Background behavior currently lives in the server process, including optional Craigslist scheduler startup.
- Compose startup does not run migrations. Run Prisma migrations before using Prisma-backed API routes on a fresh database.
- Ranked scoring currently sorts by raw fields instead of `compositeScore`.
- The score route `limit` parser can produce `NaN`; invalid input should return HTTP 400.
- Frontend has tests but no frontend lint script or ESLint config. Use the frontend build and test commands as the current frontend gates.
- Operator ingest routes depend on strong `OPERATOR_INGEST_TOKEN` or admin JWT configuration. Do not expose them publicly without production secret verification.

## Quality / Verification Commands

Run these before treating a baseline as deployable:

```bash
cd server && npm run lint
cd server && npm test
cd frontend && npm test
cd server && npm run build
cd frontend && npm run build
npm run build

docker compose config
docker compose -f docker-compose.staging.yml config
docker compose -f docker-compose.prod.yml config
```

Expected current behavior:

- Builds should pass for both workspaces.
- Compose config should render for local, staging, and production files.
- Integration tests require a reachable PostgreSQL database and migrated schema.

## Runtime Notes

- Health endpoints: `/health` and `/ready`.
- API routes are mounted at both `/api/v1/*` and compatibility `/api/*` paths by the Express app.
- Prisma-backed routes require generated Prisma client and migrated tables.
- Keep Craigslist scheduler disabled unless recurring ingest is explicitly desired.

## Deployment Docs

- Production runbook: `docs/production.md`
- Release checklist: `docs/release-checklist.md`

## Security

- Do not commit real credentials.
- Use generated 32+ character values for local secrets.
- Store production secrets in the deployment environment, not in git.
- Avoid pasting full `docker compose config` output into issues or chat because it expands environment values from local env files.
