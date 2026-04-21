# Production Runbook (Docker Host + Supabase)

This is the primary production contract.

- Runtime: `docker-compose.prod.yml` on your host
- Database: Supabase Postgres (`DATABASE_URL`)
- Health: `/health` (liveness), `/ready` (DB readiness)

## 1) Required server env vars

- `NODE_ENV=production`
- `PORT=5000`
- `API_VERSION=v1`
- `DATABASE_URL=<supabase postgres uri>`
- `CORS_ORIGIN=https://<frontend-domain>`
- `TRUST_PROXY=1`
- `LOG_LEVEL=info`

Optional:
- `EBAY_API_KEY`

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
export REGISTRY=ghcr.io
export IMAGE_PREFIX=<owner>/deal-hunter
export TAG=latest
docker compose -f docker-compose.prod.yml config >/tmp/deal-hunter.compose

docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml run --rm server npx prisma migrate deploy
docker compose -f docker-compose.prod.yml up -d

docker compose -f docker-compose.prod.yml ps
curl -fsS http://localhost/health
curl -fsS http://localhost/ready
```

## 4) Migration policy

Run `npx prisma migrate deploy` as a one-shot pre-step before `docker compose up -d`.
Do not rely on app startup to mutate schema in production.

## 5) Rollback

1. Set `TAG=<previous-known-good>`
2. Redeploy:
   ```bash
   TAG=<previous-known-good> docker compose -f docker-compose.prod.yml pull
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
