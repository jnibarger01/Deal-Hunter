# Production Runbook (Docker Host + Supabase)

This is the primary production contract.

- Runtime: `docker-compose.prod.yml` on your host
- Database: Supabase Postgres (`DATABASE_URL`)
- Health: `/health` (liveness), `/ready` (DB readiness)
- TLS: terminate upstream of this stack (load balancer, reverse proxy, or platform ingress). The shipped nginx config is HTTP-only.

## 1) Required server env vars

- `NODE_ENV=production`
- `PORT=5000`
- `DATABASE_URL=<supabase-postgres-uri>`
- `JWT_SECRET=<32+ random characters>`
- `JWT_EXPIRES_IN=7d`
- `JWT_REFRESH_EXPIRES_IN=30d`
- `FRONTEND_URL=https://<frontend-domain>`
- `CORS_ORIGIN=https://<frontend-domain>`
- `TRUST_PROXY=1`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

Optional:
- `EBAY_APP_ID=<finding-api-app-id>` — Finding API app id for public/live search fallback.
- `EBAY_CLIENT_ID=<browse-api-client-id>` + `EBAY_CLIENT_SECRET=<browse-api-client-secret>` — preferred Browse API credential pair for on-demand live eBay pulls.
- `EBAY_OAUTH_ENVIRONMENT=PRODUCTION|SANDBOX`
- `EBAY_API_KEY=<legacy-app-id-or-short-lived-token>` — only use for a valid legacy app id or a short-lived OAuth token during local debugging; token-only mode is brittle and will fail once the token expires.
- `GEMINI_API_KEY=<gemini-api-key>`

**eBay degraded-mode note:** the deployed stack is considered healthy without live eBay results. Until real `EBAY_APP_ID` or `EBAY_CLIENT_ID` + `EBAY_CLIENT_SECRET` values are supplied at runtime, `/api/v1/deals/live/ebay` should return a clean degraded response instead of silently failing.

- `OPERATOR_INGEST_TOKEN` — when set, operator-only ingest and connection endpoints accept `X-Operator-Token: <value>` instead of an admin JWT.
- `OPERATOR_SECRET_KEY` — 32+ character secret used to encrypt stored operator cookies for Facebook Marketplace scraping.
- `SENTRY_DSN` — enables structured server-side error context and future Sentry wiring.
- `VITE_SENTRY_DSN` — optional frontend build-time flag that enables client-side browser error reporting.

## 2) Supabase connection string

Get from Supabase:
- Project Settings → Database → Connection string

Example shape:

```env
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

## 3) Deployment steps (host)

The shipped nginx container is **HTTP-only**. Put TLS in front of it with your platform/load balancer/reverse proxy, or extend `nginx/nginx.conf` yourself before exposing it directly on the internet.

## 4) Deployment steps (host)

```bash
cd <deploy-path>
docker compose -f docker-compose.prod.yml config >/tmp/deal-hunter.compose

docker compose -f docker-compose.prod.yml build --no-cache server nginx

docker compose -f docker-compose.prod.yml up -d --force-recreate server nginx

docker compose -f docker-compose.prod.yml ps
curl -fsS http://<server>/nginx-health
curl -fsS http://<server>/health
curl -fsS http://<server>/ready
curl -fsS 'http://<server>/api/v1/ranked?limit=1'
curl -fsS http://<server>/api/v1/connections
```

## 5) Local full-stack verification (canonical repo root)

```bash
cd /home/jnibarger/Deal-Hunter
docker compose up -d db
npm --prefix server run build
npm --prefix server run test:file -- tests/integration/connections.routes.test.ts tests/integration/deals.ingest.test.ts tests/integration/ebay-live-persist.test.ts tests/unit/ebay-live-route.test.ts
npm --prefix frontend run build

docker compose build server frontend nginx
docker compose up -d --force-recreate db server frontend nginx

docker compose ps
curl -fsS http://127.0.0.1:8081/nginx-health
curl -fsS http://127.0.0.1:8081/health
curl -fsS http://127.0.0.1:8081/ready
curl -fsS 'http://127.0.0.1:8081/api/v1/ranked?limit=1'
curl -fsS http://127.0.0.1:8081/api/v1/connections
./scripts/verify-production.sh --env-file server/.env --health-url http://127.0.0.1:8081/ready --ranked-url 'http://127.0.0.1:8081/api/v1/ranked?limit=1' --connections-url http://127.0.0.1:8081/api/v1/connections
```

Craigslist scheduler remains **disabled by default** (`CRAIGSLIST_SCHEDULER_ENABLED=false`). Keep it that way unless you intentionally want recurring ingest in the deployed environment.

## 6) Migration policy

App startup runs:

```bash
npx prisma migrate deploy && npm start
```

For multi-instance rollouts, run migrations as a one-shot pre-step before scaling app containers.

## 6) Rollback

1. Set `TAG=<previous-known-good>`
2. Redeploy:
   ```bash
   TAG=<previous-known-good> docker compose -f docker-compose.prod.yml up -d
   ```
3. Verify `http://<server>/health` and `http://<server>/ready`.

## 7) Backup and restore (Supabase)

- Enable Supabase backups/PITR per plan.
- Retention target: 14–30 days.
- Run restore drill in non-prod before launch and quarterly.
- Release day check: confirm latest backup exists.

## 8) Facebook Marketplace operator workflow

- The app stores the operator's exported Facebook Marketplace cookies encrypted at rest using `OPERATOR_SECRET_KEY`.
- Use only the operator's own session cookies (`c_user`, `xs`, or a full browser cookie JSON export). Never share those cookies outside the host.
- Runtime requires Chromium in the server container. `docker/server.Dockerfile` installs `chromium`, and the scraper uses a headless browser fallback when JSON-LD extraction is unavailable.
- Rate-limit guidance: keep Marketplace scrapes to roughly 1 request/second with jitter and cap bulk pulls to 50 listings per run.
- Settings → Connections → Facebook Marketplace should be used to:
  - paste cookie JSON and run **Test Facebook Connection**
  - scrape one listing URL
  - scrape one saved search batch

## 9) Uptime / observability guidance

- Monitor `/ready` and `/api/v1/ranked?limit=1` from an external uptime check.
- Watch container restart count and 5xx rate in docker logs.
- When `SENTRY_DSN` is set, the API emits structured request error context including request id, method, path, user agent, and stack.
- When `VITE_SENTRY_DSN` is set at build time, the frontend installs browser error and unhandled rejection listeners.

## 10) Incident triage

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=200 server
curl -i http://<server>/ready
```

If unresolved within 15 minutes and customer-impacting, rollback.
