# Release Checklist (Launch-safe MVP)

## 1) Quality gates

- [ ] `npm --prefix server run lint`
- [ ] `npm --prefix server run build`
- [ ] `npm --prefix frontend run build`
- [ ] `npm --prefix server test`
- [ ] CI checks green on `main`

## 2) Config and secrets

- [ ] `DATABASE_URL` points to **Supabase production**
- [ ] `CORS_ORIGIN` matches production domain(s)
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
- [ ] `docker compose -f docker-compose.prod.yml up -d --build`
- [ ] `GET /health` returns 200
- [ ] `GET /ready` returns 200 (DB connected)
- [ ] Deals read works
- [ ] TMV calculation works for a seeded deal with sufficient samples
- [ ] Ranking works for an analyzed deal

## 5) Ops readiness

- [ ] Monitor `/ready` uptime + API 5xx + container restart count
- [ ] Alert owner/channel set
- [ ] `docs/production.md` current

## 6) Governance

- [ ] Branch protection on `main`
- [ ] Required checks set (`Lint`, `Test`, `Build`, `Docker Build`)
- [ ] Deploy blocked until required checks pass
- [ ] Release tag/version captured in ops notes
