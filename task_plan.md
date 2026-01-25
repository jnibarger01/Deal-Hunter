Phase 0 Todo List

- Verify repo layout matches PRD scaffold (paths + required files)
- Confirm Dockerfiles exist for server, frontend, optional nginx
- Confirm docker-compose.yml, docker-compose.staging.yml, docker-compose.prod.yml exist
- Check .gitattributes, .editorconfig, .gitignore present
- Verify server/package.json + frontend/package.json lockfiles exist
- Validate builds are independent (no cross-imports, separate tsconfigs)
- Note any gaps vs PRD as backlog items

Phase 0 Verification

- Repo layout matches PRD scaffold: OK
- Dockerfiles present: server, frontend, nginx
- Compose files present: docker-compose.yml, docker-compose.staging.yml, docker-compose.prod.yml
- Hygiene files present: .gitattributes, .editorconfig, .gitignore
- Separate tsconfig.json files only: OK (no root tsconfig)
- Cross-imports frontend <-> server: none found

Phase 0 Deep Dive

- docker-compose.yml includes db/server/frontend/nginx; healthchecks defined
- docker-compose.staging.yml and docker-compose.prod.yml use /api/health for server
- server.Dockerfile uses multi-stage build with npm ci + prisma generate + build
- frontend.Dockerfile uses npm install and builds assets stage only
- nginx.Dockerfile builds frontend assets internally and serves via nginx
- nginx.conf defines /health and proxies /api to server:5000
- render.yaml uses /health, builds frontend with npm install
- server app exposes /health (non-versioned)

Phase 0 Deep Dive (CI/Hygiene)

- .gitattributes sets text=auto only (no explicit UTF-8 + LF enforcement)
- No pre-commit config found
- CI caches frontend package-lock.json and file is present
- CI installs frontend with npm ci
- No read-only container enforcement found in compose/Dockerfiles/workflows

Backlog (Gaps vs PRD)

- None in Phase 0 after fixes

Phase 1 Todo List (Data Model & Persistence)

- Review Prisma schema for Deal, MarketSample, TMVResult, Score
- Verify required fields/types match PRD
- Check migrations exist and are consistent with schema
- Confirm seed scaffolding exists (or log gap)
- Validate Prisma client generation is isolated to build time

Phase 1 Verification (Schema/Prisma)

- Prisma schema exists with Deal, MarketSample, TMVResult, Score plus user/watchlist/portfolio/alerts
- Deal fields go beyond PRD (marketValue, estimatedProfit, ROI, etc.)
- TMVResult includes extra fields (tmvNormalized, seasonalityIndex, regionalIndex)
- ID types are cuid() vs PRD UUID
- Migration folder exists but only contains migration_lock.toml (no migration SQL)
- Seed scaffolding not found (no prisma/seed.* or script target)

Backlog (Gaps vs PRD)

- Core entity IDs not UUID
- Schema fields diverge from PRD (extra fields)
- No Prisma migration SQL present
- Seed scaffolding missing

Phase 2 Verification (TMV Engine Core)

- TMVCalculator exists in server/src/domain/tmv.ts
- Freshness window filtering and IQR outlier removal implemented
- Weighting uses time decay + soldWeightMultiplier
- Uses weighted mean only (no weighted median)
- Includes comparables text similarity, demand score, hotDeal flag
- Enforces minSamples and minConfidence gates
- Applies seasonality/regional indexes not specified in PRD

Phase 2 Backlog (Fixes)

- Exclude unsold samples per PRD (currently weighted, not filtered)
- Implement weighted median with weighted mean fallback
- Align TMV outputs to PRD (remove or isolate demand/hotDeal extras)
- Remove or isolate seasonality/regional adjustments if out of v1 scope

Phase 3 Verification (Scoring Engine)

- DealScorer implemented in server/src/domain/score.ts
- Profit margin, velocity, risk, composite rank computed
- Risk uses confidence + volatility only
- DealScorer not wired into any route/service

Phase 3 Backlog (Fixes)

- Include liquidity in risk factors per PRD
- Verify fee assumptions flow into scoring API (not present in routes)
- Expose scoring via API and persist Score records

Phase 4 Verification (API Surface)

- Health endpoint exists at /health
- TMV compute route exists at /api/v1/deals/:id/calculate-tmv
- No explicit /tmv, /score, or /ranked routes found
- API routes are versioned under /api/v1 while frontend uses non-versioned paths
- API version controlled by API_VERSION env (default v1)
- Frontend expects /tmv/calculate payload { dealId } vs backend expects /deals/:id/calculate-tmv
- Deals endpoints respond with { success, data } wrapper, while frontend expects raw arrays/objects
- Server /health returns { success, message, timestamp, environment } vs frontend expects { status, timestamp }
- GET /api/v1/deals returns { deals, pagination } inside data; frontend expects Deal[]
- GET /api/v1/deals/:id returns { deal } inside data; frontend expects Deal
- /categories, /marketplaces, /stats exist server-side but not consumed by frontend

Phase 4 Backlog (Fixes)

- Implement PRD endpoints: POST /tmv/calculate, GET /tmv/:dealId, POST /score, GET /ranked
- Align API base paths and versions with frontend client expectations
- Align TMV calculate request shape (payload vs path param)

Phase 5 Verification (Frontend MVP)

- Frontend API client calls /health, /deals, /tmv, /score, /ranked (non-versioned)
- Deals page uses mock data fallback if API missing
- Frontend HealthStatus type does not match server /health response shape

Phase 5 Backlog (Fixes)

- Align frontend API endpoints with backend routes/versioning
- Remove or gate mock data fallback for production behavior
- Update health status typing/handling to match backend response

Phase 6 Verification (Hardening & DoD)

- Health checks present in compose/nginx
- Docker builds exist for server/frontend/nginx
- Pre-commit hooks not found
- Read-only runtime containers not configured
- .editorconfig enforces UTF-8 + LF but .gitattributes does not

Phase 6 Backlog (Fixes)

- Enforce UTF-8 + LF in .gitattributes per PRD
- Add pre-commit checks to reject binaries
- Enforce read-only runtime containers
- Ensure npm ci used consistently in Docker builds
