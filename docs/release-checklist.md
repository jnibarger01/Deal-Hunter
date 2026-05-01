# Release Checklist (Launch-safe MVP)

## 1) Quality gates

- [ ] `npm ci`
- [ ] `npm run prisma:generate --workspace server`
- [ ] `npm run lint --workspace server`
- [ ] `npm test --workspace server`
- [ ] `npm test --workspace frontend`
- [ ] `npm run build`
- [ ] `docker compose config`
- [ ] `docker compose -f docker-compose.staging.yml config`
- [ ] `docker compose -f docker-compose.prod.yml config`
- [ ] `bash -n scripts/verify-production.sh`
- [ ] CI checks green on `main`

## 2) Config and secrets

- [ ] `DATABASE_URL` points to **Supabase production**
- [ ] `JWT_SECRET` length >= 32
- [ ] `API_KEY` length >= 32
- [ ] `OPERATOR_INGEST_TOKEN` length >= 32 if operator ingest is enabled
- [ ] `OPERATOR_SECRET_KEY` length >= 32 if Facebook cookie storage or other encrypted operator secrets are enabled
- [ ] `MARKETPLACE_DELETE_TOKEN` length >= 32
- [ ] SMTP vars present and validated
- [ ] `CORS_ORIGIN` + `FRONTEND_URL` match production domain(s)
- [ ] `TRUST_PROXY` set correctly for nginx/reverse proxy
- [ ] No dev/test secrets in production env files

## 3) DB and migrations

- [ ] Migration set reviewed
- [ ] `prisma migrate deploy` path verified
- [ ] Rollback path documented for this release
- [ ] Latest backup exists
- [ ] Restore drill passed in non-prod

## 4) Deployment smoke (Docker host)

- [ ] `docker compose -f docker-compose.prod.yml config`
- [ ] `docker compose -f docker-compose.prod.yml build --no-cache server nginx`
- [ ] `docker compose -f docker-compose.prod.yml up -d --force-recreate server nginx`
- [ ] `./scripts/verify-production.sh --health-url <production-base-url>/health --ready-url <production-base-url>/ready`
- [ ] `GET /nginx-health` returns 200
- [ ] `GET /health` returns 200
- [ ] `GET /ready` returns 200 (DB connected)
- [ ] `GET /api/v1/ranked?limit=1` returns valid JSON array
- [ ] `GET /api/v1/connections` returns JSON and reports expected Craigslist/eBay wiring
- [ ] If eBay credentials are intentionally absent, `GET /api/v1/deals/live/ebay?...` returns a clean degraded 503 with credential guidance instead of a silent failure/500
- [ ] Login works
- [ ] Deals read works
- [ ] One write path works (watchlist/portfolio/etc.)

## 5) Ops readiness

- [ ] Monitor `/ready` uptime + API 5xx + container restart count
- [ ] Alert owner/channel set
- [ ] `docs/production.md` current

## 6) Governance

- [ ] Branch protection on `main`
- [ ] Required checks set (`Lint`, `Test`, `Frontend Test`, `Build`, `Docker Build`)
- [ ] Manual GitHub config confirmed: direct pushes blocked, PR approval required, and stale approvals dismissed on new commits.
- [ ] Deploy blocked until required checks pass
- [ ] Release tag/version captured in ops notes
