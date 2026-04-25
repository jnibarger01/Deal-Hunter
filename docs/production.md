# Production Runbook (Docker Host + Supabase)

This is the production/runtime notes file for the current Deal Hunter baseline.

## Current baseline state

- Standalone baseline repo.
- One baseline commit exists.
- Expected clean baseline state: no active code diff except untracked `.codex/`.
- This document records runtime/deployment findings only; it does not imply application code fixes have landed.

## Required server env vars

Use real values only in the deployment environment or secret manager. Keep committed examples as placeholders.

- `NODE_ENV=production`
- `PORT=5000`
- `API_VERSION=v1`
- `DATABASE_URL=<postgres-uri>`
- `JWT_SECRET=<32+ character secret>`
- `API_KEY=<32+ character secret>` if the runtime path requires it
- `JWT_EXPIRES_IN=7d`
- `JWT_REFRESH_EXPIRES_IN=30d`
- `FRONTEND_URL=https://<frontend-domain>`
- `CORS_ORIGIN=https://<frontend-domain>`
- `TRUST_PROXY=1`
- `LOG_LEVEL=info`

Optional integration vars:

- `EBAY_APP_ID=<finding-api-app-id>`
- `EBAY_CLIENT_ID=<browse-api-client-id>`
- `EBAY_CLIENT_SECRET=<browse-api-client-secret>`
- `EBAY_OAUTH_ENVIRONMENT=PRODUCTION`
- `EBAY_API_KEY=<legacy-or-short-lived-token>`; local debugging only unless intentionally supported
- `GEMINI_API_KEY=<gemini-key>`
- SMTP values: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `OPERATOR_INGEST_TOKEN=<32+ character token>` for operator ingest endpoints
- `OPERATOR_SECRET_KEY=<32+ character secret>` for encrypted operator cookie storage
- `CRAIGSLIST_RSS_URLS`, `CRAIGSLIST_MAX_PER_FEED`, `CRAIGSLIST_INGEST_INTERVAL_MINUTES`, `CRAIGSLIST_SCHEDULER_ENABLED`

## Local startup path

From the repo root:

```bash
npm install
cp server/.env.example server/.env
docker compose up -d db
cd server
npm run prisma:generate
npm run prisma:migrate
cd ..
npm run dev
```

Run migrations before exercising API routes that depend on Prisma tables. The default compose startup should not be assumed to create all tables.

## Verification commands

Baseline/code-review findings:

```bash
cd server && npm test              # passes when run outside sandbox
cd server && npm run build         # passes
cd frontend && npm run build       # passes
cd workers && npm run build        # not runnable in this checkout; workers/ is absent

docker compose config              # passes
docker compose -f docker-compose.prod.yml config  # currently fails alone
```

## Compose status

- `docker-compose.yml` is the base local compose file.
- `docker-compose.prod.yml` is not currently standalone-valid. `nginx` depends on an undefined `frontend` service.
- Treat `docker compose -f docker-compose.prod.yml config` failure as an expected known issue until the compose topology is fixed.

## Known Issues / Next Fixes

- `docker-compose.yml` uses `API_KEY=dev-api-key-change-in-prod`, but server env validation requires 32+ characters.
- Workers service is referenced by compose/review findings, but no `workers/` package exists in this checkout. The referenced runtime path is `dist/workers/scheduler.js`; verify the compose topology before adding or wiring a worker image.
- `docker-compose.prod.yml` is not standalone-valid because `nginx` depends on undefined `frontend`.
- README quick start may not create DB tables because migrations are behind a compose profile or otherwise outside the default startup path.
- `/api` proxy paths are forwarded unchanged, but Express routes are mounted without `/api` prefix.
- Ranked scoring currently sorts by raw fields instead of `compositeScore`.
- Score route limit parsing can produce `NaN`; invalid input should return 400.
- Quality scripts are currently broken or incomplete:
  - server lint does not target existing TS files correctly.
  - frontend lint has no ESLint config.
  - server `test:tmv` points at the wrong test path.

## Deployment checks

Before deploy:

```bash
docker compose config
npm --prefix server run build
npm --prefix frontend run build
```

Do not deploy from `docker-compose.prod.yml` alone until its undefined service dependency is fixed.

## Health checks

- API liveness: `/health`
- API readiness: `/ready`
- Nginx health: `/nginx-health` when nginx is running

## Runtime notes

- TLS should terminate upstream of this stack unless nginx is explicitly extended for TLS.
- Keep Craigslist scheduler disabled unless recurring ingest is intentionally enabled.
- Store production credentials outside git.
- If eBay credentials are absent or expired, live eBay paths should degrade cleanly rather than silently failing.

## Incident triage

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=200 server
curl -i http://<server>/ready
```

If unresolved quickly and customer-impacting, rollback to the last known-good deployment artifact.
