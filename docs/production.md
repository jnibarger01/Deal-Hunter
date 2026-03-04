# Production Runbook (Docker Host + Supabase)

This is the primary production contract.

- Runtime: `docker-compose.prod.yml` on your host
- Database: Supabase Postgres (`DATABASE_URL`)
- Health: `/health` (liveness), `/ready` (DB readiness)

## 1) Required server env vars

- `NODE_ENV=production`
- `PORT=5000`
- `DATABASE_URL=<supabase postgres uri>`
- `JWT_SECRET=<32+ chars>`
- `JWT_EXPIRES_IN=7d`
- `JWT_REFRESH_EXPIRES_IN=30d`
- `FRONTEND_URL=https://<frontend-domain>`
- `CORS_ORIGIN=https://<frontend-domain>`
- `TRUST_PROXY=1`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

Optional:
- `EBAY_API_KEY`
- `GEMINI_API_KEY`
- `MARKETPLACE_DELETE_TOKEN`

## 2) Supabase connection string

Get from Supabase:
- Project Settings → Database → Connection string

Example shape:

```env
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

## 3) Deployment steps (host)

```bash
cd <deploy-path>
docker compose -f docker-compose.prod.yml config >/tmp/deal-hunter.compose

docker compose -f docker-compose.prod.yml up -d --build

docker compose -f docker-compose.prod.yml ps
curl -fsS http://<server>/health
curl -fsS http://<server>/ready
```

## 4) Migration policy

App startup runs:

```bash
npx prisma migrate deploy && npm start
```

For multi-instance rollouts, run migrations as a one-shot pre-step before scaling app containers.

## 5) Rollback

1. Set `TAG=<previous-known-good>`
2. Redeploy:
   ```bash
   TAG=<previous-known-good> docker compose -f docker-compose.prod.yml up -d
   ```
3. Verify `/health` and `/ready`.

## 6) Backup and restore (Supabase)

- Enable Supabase backups/PITR per plan.
- Retention target: 14–30 days.
- Run restore drill in non-prod before launch and quarterly.
- Release day check: confirm latest backup exists.

## 7) Incident triage

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=200 server
curl -i http://<server>/ready
```

If unresolved within 15 minutes and customer-impacting, rollback.
