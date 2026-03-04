# Production Runbook

## Environment

Required server environment variables:

- `NODE_ENV=production`
- `PORT=5000`
- `DATABASE_URL` (PostgreSQL)
- `JWT_SECRET` (minimum 32 chars)
- `JWT_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `FRONTEND_URL`
- `CORS_ORIGIN`
- `TRUST_PROXY`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_REQUESTS`
- `AUTH_RATE_LIMIT_WINDOW_MS`
- `AUTH_RATE_LIMIT_MAX_REQUESTS`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

Optional:

- `EBAY_API_KEY`
- `GEMINI_API_KEY`
- `MARKETPLACE_DELETE_TOKEN`

## Deploy (Docker Compose)

1. Pull latest images:
   ```bash
   docker compose -f docker-compose.prod.yml pull
   ```
2. Apply migrations and restart services:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```
3. Verify service status:
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```
4. Verify health endpoints:
   ```bash
   curl -fsS http://<server>/health
   curl -fsS http://<server>/ready
   ```

## Rollback

1. Set image tags to previous known-good release (`TAG=<previous-tag>`).
2. Redeploy:
   ```bash
   TAG=<previous-tag> docker compose -f docker-compose.prod.yml up -d
   ```
3. Verify readiness and critical API endpoints.

## Database Backup and Restore

Backup example:

```bash
docker exec -t <postgres-container> pg_dump -U <user> -d <database> > backup-$(date +%F-%H%M).sql
```

Restore example:

```bash
cat backup.sql | docker exec -i <postgres-container> psql -U <user> -d <database>
```

At minimum, schedule daily backups and keep retention for 14-30 days.

## On-Call Triage

1. Check `/ready` and container health.
2. Check recent server logs for 5xx or database/auth errors.
3. Validate database connectivity and migration status.
4. If auth/email related, validate SMTP credentials and provider availability.
5. If unresolved within 15 minutes, roll back to previous release.
