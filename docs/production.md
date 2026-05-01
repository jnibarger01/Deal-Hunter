# Production Runbook (Docker Host + Supabase)

This is the production/runtime notes file for the current Deal Hunter baseline.

## Current baseline state

- npm workspaces repo with `server` and `frontend` packages.
- Active pre-launch codebase. Treat production deployment as blocked until release checklist gates pass.
- Runtime stack is server plus nginx images, with the frontend static bundle served by nginx.

## Required server env vars

Use real values only in the deployment environment or secret manager. Keep committed examples as placeholders.

- `NODE_ENV=production`
- `PORT=5000`
- `API_VERSION=v1`
- `DATABASE_URL=<postgres-uri>`
- `JWT_SECRET=<32+ character secret>`
- `API_KEY=<32+ character secret>`
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
- `MARKETPLACE_DELETE_TOKEN=<32+ character token>` for marketplace account deletion webhooks
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

```bash
npm ci
npm run prisma:generate --workspace server
npm run lint --workspace server
npm test --workspace server        # requires migrated Postgres for integration paths
npm test --workspace frontend
npm run build                      # workspace build

docker compose config
docker compose -f docker-compose.staging.yml config
docker compose -f docker-compose.prod.yml config
bash -n scripts/verify-production.sh
```

## Compose status

- `docker-compose.yml` is the base local compose file.
- `docker-compose.staging.yml` and `docker-compose.prod.yml` run the published server and nginx images.
- Nginx serves the built frontend and proxies `/api`, `/health`, and `/ready` to the server container.
- Local `docker compose -f docker-compose.prod.yml config` may warn when deployment variables are unset. Treat a rendered config as syntax/topology validation only; runtime readiness still requires real secret values and a migrated database.

## Known Issues / Next Fixes

- GitHub staging and production deploy workflows run `prisma migrate deploy` before `up -d`; manual compose deploys must do the same before routing traffic to Prisma-backed endpoints.
- No separate `workers/` image exists. Optional scheduler behavior runs in the server process when configured.
- Frontend has no lint script/config yet. Use frontend tests and `npm run build --workspace frontend` as current frontend gates.
- `OPERATOR_INGEST_TOKEN`, `OPERATOR_SECRET_KEY`, and `MARKETPLACE_DELETE_TOKEN` are optional in the schema but required for a safe operator deployment.

## Deployment checks

Before deploy:

```bash
docker compose config
npm run build --workspace server
npm run build --workspace frontend
```

Do not deploy unless CI is green, migrations have been applied, and `scripts/verify-production.sh` passes against the target environment.
Set `STAGING_BASE_URL` and `PRODUCTION_BASE_URL` repository environment variables to enable deploy workflow smoke checks for both `/health` and `/ready`.

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
