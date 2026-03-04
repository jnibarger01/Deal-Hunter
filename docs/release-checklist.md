# Release Checklist

## Pre-Release

- [ ] `npm --prefix server run lint`
- [ ] `npm --prefix server run build`
- [ ] `npm --prefix frontend run build`
- [ ] `npm --prefix server test` against reachable PostgreSQL
- [ ] `docker compose -f docker-compose.prod.yml config`
- [ ] Verify required production secrets are present
- [ ] Confirm database backup for release day exists

## Deploy

- [ ] Merge approved changes to `main`
- [ ] CI pipeline succeeds (lint/test/build/docker)
- [ ] Deploy production stack
- [ ] Confirm `/health` and `/ready`
- [ ] Smoke test login, deal listing, and one write path

## Post-Deploy

- [ ] Monitor logs and 5xx rates for 30 minutes
- [ ] Confirm auth email delivery (verification and reset)
- [ ] Confirm no migration errors
- [ ] Record release version and timestamp in ops notes
