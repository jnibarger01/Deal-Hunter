# Deal Hunter Product Readiness Review + Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Move Deal Hunter from current broken/partial implementation to a launch-safe operator MVP.

**Architecture:** Stabilize the existing Express/Prisma + React/Vite monorepo first, then ship the operator-first product surface in vertical slices. Do not add speculative platform depth until the build, tests, API contracts, ingest flow, and deployment gates are trustworthy.

**Tech Stack:** TypeScript, Express, Prisma/PostgreSQL, Jest, React 18, Vite, Vitest, Docker Compose, nginx.

---

## Current Verdict

Not product-ready. The frontend slice is in decent shape, but the backend currently does not build, backend tests fail, the repo is branch-diverged, and the implemented product does not yet match the live deal stream/intelligence spec.

## Verified Commands From Review

- `npm run build` from repo root: fails locally because root `node_modules/.bin/concurrently` is absent in this checkout.
- `cd server && npm run build`: fails on `src/services/analytics.service.ts:99` because `decayRate` is not a property of exported `TMVConfig` from `server/src/config/tmv.ts`.
- `cd server && npm test`: fails; 13 failed suites, 4 passed. Main blocker is the same `decayRate` TypeScript error, plus eBay unit contract drift, error-handler test drift, live eBay persistence failures, and coverage below thresholds.
- `cd server && npm run lint`: passes.
- `cd frontend && npm run build`: passes.
- `cd frontend && npm test`: passes, 7 files / 22 tests.
- `docker compose config`: passes.
- `docker compose -f docker-compose.prod.yml config`: passes now, with expected warnings for unset env vars.

## Code Review Findings

### Critical

- `server/src/services/analytics.service.ts:95-100` — backend cannot compile. `resolveTmvConfigForCategory()` returns `decayRate`, but the imported `TMVConfig` from `server/src/config/tmv.ts` has `halfLifeDays` and no `decayRate`. Decide whether category overrides should store `decayRate` or `halfLifeDays`, then align Prisma schema, config type, domain type, service mapping, and tests.

- `server/tests/**` — backend test suite is not launchable. Failing suites include auth, deals, analysis, watchlist, connections, ingest, eBay persistence, eBay unit contract, and error handler. The coverage gate reports ~38% statements/lines because many suites fail collection. No backend release until this is green.

- `server/src/routes/deal.routes.ts:98-167` — `GET /api/v1/deals/live/ebay` is public and performs DB writes via `analyticsService.persistLiveEbayDeals()`. A public read-looking route with side effects is a bad launch surface. Gate it with operator/admin auth or split into public read vs operator ingest/write.

- `server/src/routes/connections.routes.ts:133-170`, `172-295` and `server/src/routes/deal-ingest.routes.ts:138-284` — operator/admin protection depends on `OPERATOR_INGEST_TOKEN` and/or admin JWT. That is fine only if production always sets a strong token and `OPERATOR_SECRET_KEY`; enforce this in production env validation, not runbook prose.

- Git state: local `main` is `ahead 5, behind 2` relative to `origin/main`. Do not ship or continue large implementation work until this is reconciled cleanly.

### Warnings

- `server/src/services/auth.service.ts:166-182` and `214-237` — email verification and password reset use stateless JWT one-time tokens. Because there is no persisted token hash / used-at record, tokens cannot be revoked individually and verification/reset tokens can be replayed until expiry. Reset invalidates refresh tokens after use, but verification is replayable. Acceptable for a toy MVP; weak for a real product.

- `server/src/services/deal.service.ts:55-60` — search uses default Prisma `contains` without explicit case-insensitive mode. Operator search may feel broken depending on DB collation.

- `server/src/services/deal.service.ts:141-149` — `getMarketplaces()` promises `string[]` but maps nullable `marketplace`; TypeScript did not flag this because generated Prisma type/details may be loose here, but null marketplaces can leak to consumers.

- `server/src/routes/analysis.routes.ts` duplicates TMV/scoring logic that also exists in `AnalyticsService`. This creates drift: category-specific TMV overrides are handled in one path but not the other.

- Docs are stale in spots. `README.md` and `docs/production.md` still say `docker-compose.prod.yml` fails alone, but this review verified it now passes config validation.

- Frontend stores `X-Operator-Token` in localStorage (`frontend/src/api/client.ts:19-27`). That is convenient for operator MVP, but has XSS blast-radius. Keep this as an operator-only local tool or move to a safer session/auth model before broader users.

### Product Gaps vs Spec

- No implemented `GET /api/v1/feed`, `POST /api/v1/deals/:id/hunt`, or `GET /api/v1/deals/:id/intelligence` contract from the live stream/intelligence spec.
- Deal state is still split across generic `status`, legacy watchlist/portfolio rows, and proposed but unimplemented operator-state concepts.
- No persisted intelligence artifact model yet.
- Watchlist, portfolio, and alerts are not yet the operator-first public read models described in the spec.
- Current default product surface remains Dashboard/Deals-centric, not the specified Feed-first terminal workflow.

---

## Implementation Plan

### Phase 0: Repo Reconciliation And Baseline Hygiene

**Objective:** make sure we are working from a sane branch and dependency state.

**Tasks:**
- Reconcile `main` with `origin/main` using a normal merge/rebase strategy after inspecting the two remote commits.
- Run `npm ci` at the repo root and verify root scripts work through workspaces.
- Remove stale nested workspace `node_modules` assumptions from local workflow; CI already expects root `npm ci`.
- Update `README.md` and `docs/production.md` where verified facts changed.

**Verification:**
- `git status --short --branch` shows no unexpected divergence after chosen merge/rebase.
- `npm run build` invokes both workspaces.
- Docs no longer claim prod compose config fails if it does not.

### Phase 1: Backend Compile Fix

**Objective:** restore TypeScript build and test collection.

**Tasks:**
- Align TMV config types:
  - either add `decayRate?: number` to `server/src/config/tmv.ts`, or
  - map `CategoryConfig.decayRate` to `halfLifeDays` semantics explicitly.
- Prefer the smaller fix: add optional `decayRate` to exported config type if DB schema intentionally stores decay rate.
- Add/adjust unit coverage for category override config resolution.

**Verification:**
- `cd server && npm run build` passes.
- `cd server && npm run test:file -- tests/unit/tmv-config.test.ts` passes.

### Phase 2: Backend Test Recovery

**Objective:** make the backend suite meaningful and green.

**Tasks:**
- Fix `server/tests/unit/ebay.test.ts` expected payload to include `description` and `imageUrl`, or change parser contract if those fields should be omitted when empty.
- Fix `server/tests/unit/error-handler.test.ts` to provide `req.headers`, or harden `errorHandler` against minimal mock requests.
- Debug `server/tests/integration/ebay-live-persist.test.ts` blank failures after build collection is restored.
- Restore coverage above configured thresholds with real service/route coverage, not threshold deletion.

**Verification:**
- `cd server && npm test` passes with thresholds intact.

### Phase 3: Secure The Ingest And Operator Surfaces

**Objective:** remove dangerous launch semantics.

**Tasks:**
- Split live eBay into:
  - `GET /api/v1/deals/live/ebay/preview` or similar public/no-write preview, if public preview is desired.
  - `POST /api/v1/deals/ingest/ebay` operator/admin write path.
- Require a strong `OPERATOR_INGEST_TOKEN` in production/staging when operator routes exist.
- Require `OPERATOR_SECRET_KEY` in production/staging before accepting Facebook cookie storage.
- Add route tests proving unauthenticated write-like ingest calls are rejected.

**Verification:**
- Unauthenticated live write route returns 401/403.
- Operator token path succeeds in test.
- Production env validation fails fast if required operator secrets are missing.

### Phase 4: Unify TMV / Score API Logic

**Objective:** one source of truth for valuation/scoring.

**Tasks:**
- Refactor `analysis.routes.ts` to delegate to `AnalyticsService` for TMV and score calculation.
- Ensure category overrides apply consistently.
- Keep response contracts stable for frontend.
- Add tests for invalid limit, category override, insufficient samples, and ranked ordering.

**Verification:**
- `GET /api/v1/ranked?limit=bad` returns 400.
- Ranked deals sort by `score.compositeRank desc`.
- TMV override behavior is covered.

### Phase 5: Operator-First Product Contracts

**Objective:** implement the actual product spec instead of polishing the wrong surface.

**Tasks:**
- Add Prisma fields/models for operator state, intelligence artifacts, and operator alerts.
- Add migrations; do not rely on `db push` for release.
- Implement:
  - `GET /api/v1/feed`
  - `POST /api/v1/deals/:id/hunt`
  - `GET /api/v1/deals/:id/intelligence`
  - operator read models for watchlist, portfolio, alerts.
- Make `Hunt` idempotent.
- Persist factual comparable evidence or enough sample details to explain recommendations.
- Gemini narrative generation must degrade gracefully and cache artifacts.

**Verification:**
- Backend integration tests for feed, hunt, detail intelligence degraded path, watchlist, portfolio, alerts.
- `Hunt` repeated twice returns the same pursued state without duplicate records.

### Phase 6: Frontend Feed-First MVP

**Objective:** make the product feel like Deal Hunter, not a generic dashboard with a feed widget.

**Tasks:**
- Make Feed the canonical landing page.
- Add terminal-style feed cards using real `GET /feed` data.
- Implement card click and Hunt flow into detail page.
- Render detail page from the assembled intelligence endpoint.
- Replace placeholder Watchlist/Portfolio/Alerts with real list pages.
- Preserve current passing Vitest coverage and add route/interaction tests for the new flow.

**Verification:**
- `cd frontend && npm test` passes.
- `cd frontend && npm run build` passes.
- Manual smoke: load Feed, filter/search, click card, Hunt, open detail, open Watchlist/Portfolio/Alerts.

### Phase 7: Deployment And Release Gate

**Objective:** make launch boring. Radical concept.

**Tasks:**
- Ensure migrations run via `prisma migrate deploy` in production workflow.
- Verify Docker images build from a clean checkout with root `npm ci`.
- Add/confirm production smoke script checks:
  - `/nginx-health`
  - `/health`
  - `/ready`
  - `/api/v1/feed?limit=1`
  - `/api/v1/deals/live/ebay` degraded path or authenticated write path, depending final route design.
- Update release checklist with the final contracts.
- Confirm branch protection/required checks on GitHub.

**Verification:**
- CI green: lint, backend test, frontend test, build, Docker build.
- `scripts/verify-production.sh` passes against the target host.

---

## Remaining Todo List

### P0 — Blocking
- [ ] Reconcile local `main` with `origin/main`.
- [ ] Run root `npm ci` and confirm root scripts work.
- [ ] Fix `analytics.service.ts` / `TMVConfig` compile error.
- [ ] Make `cd server && npm run build` pass.
- [ ] Make `cd server && npm test` pass with coverage thresholds intact.
- [ ] Gate or split public live eBay route so public GET does not write to DB.
- [ ] Enforce production operator secrets in env validation.

### P1 — Launch MVP
- [ ] Unify TMV/score route logic through `AnalyticsService`.
- [ ] Implement feed/hunt/intelligence endpoints from spec.
- [ ] Add operator state and intelligence artifact persistence with migrations.
- [ ] Implement operator read models for watchlist, portfolio, alerts.
- [ ] Make Feed the frontend landing route.
- [ ] Build data-driven deal detail intelligence page.
- [ ] Add frontend tests for Feed, Hunt, detail degraded state, and nav routes.

### P2 — Hardening
- [ ] Replace stateless one-time auth tokens with persisted hashed tokens and used-at/revocation semantics.
- [ ] Make search case-insensitive and pagination contracts consistent (`pages` vs `totalPages`).
- [ ] Fix stale docs and remove known-issue claims that no longer match reality.
- [ ] Add production smoke checks for final feed/detail contracts.
- [ ] Decide whether localStorage operator token is acceptable only for private operator MVP or needs replacement.

## Suggested Next Action

Start with Phase 1, then Phase 2. No product work should be layered on top while the backend cannot compile. That is how you build a haunted house and call it architecture.
