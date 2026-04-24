# Deal-Hunter Frontend + Backend Stabilization Plan

> For Hermes: use subagent-driven-development or execute manually with strict RED-GREEN-REFACTOR. No production code before a failing test is verified.

Canonical spec: `docs/specs/deal-hunter-tmv-engine-v1-prd.md`

Goal: make the app internally consistent, buildable, and safe to extend by fixing route/API contract drift, restoring reproducible installs, and hardening the highest-risk backend/frontend seams while converging on the canonical PRD.

Architecture: stabilize contracts first, then repair integration points, then refactor structure. Treat routing and API shapes as the primary source of truth before touching cosmetic or architectural cleanup. Frontend and backend should converge on one canonical route map, one canonical analysis API contract, and one deterministic verification loop.

Tech Stack: React 18, TypeScript, Vite, Express, Prisma, PostgreSQL, Jest (backend), Vitest + React Testing Library + MSW (planned frontend).

---

## Current grounded findings

### Completed in this pass

Frontend
- Route namespace drift is fixed and covered by tests:
  - `frontend/src/App.tsx`
  - `frontend/src/components/layout/Sidebar.tsx`
  - `frontend/src/components/ui/DealCard.tsx`
  - `frontend/src/App.routes.test.tsx`
- API contract drift is fixed and covered by tests:
  - canonical frontend calls now target `/tmv/:dealId`, `/score`, `/ranked`, `/tmv/assumptions`, `/tmv/scenarios`
  - files: `frontend/src/api/client.ts`, `frontend/src/api/client.test.ts`
- Deal detail no longer force-casts `Deal` to `RankedDeal`
  - recalc now awaits `calculate(id)`, calls `refetch()`, and uses returned TMV as a fallback until fresh deal data arrives
  - files: `frontend/src/pages/DealDetail.tsx`, `frontend/src/pages/DealDetail.test.tsx`
- Frontend test harness is live:
  - `frontend/package.json`
  - `frontend/vitest.config.ts`
  - `frontend/src/test/setup.ts`

Backend
- Canonical analytics surface is consolidated behind `server/src/routes/analysis.routes.ts`
- Analytics orchestration now lives in `server/src/services/analytics.service.ts`
- Legacy analytics endpoints were removed from `server/src/routes/deal.routes.ts`:
  - `/api/v1/deals/ranked`
  - `/api/v1/deals/:id/score`
- `server/src/routes/deal.routes.ts` is now CRUD/listing only
- ingest moved into `server/src/routes/deal-ingest.routes.ts`
- Placeholder routes are honest behind `EXPERIMENTAL=true`:
  - `server/src/routes/user.routes.ts`
  - `server/src/routes/portfolio.routes.ts`
  - `server/src/routes/alert.routes.ts`
  - `server/src/routes/_not-implemented.ts`
- Backend tests are split into Jest projects:
  - unit tests run without the Prisma bootstrap
  - integration tests keep the Prisma bootstrap
  - files: `server/jest.config.js`, `server/tests/setup.ts`, `server/tests/setup-env.ts`
- Integration test schema is isolated to `schema=integration_tests`
- Full verification now passes:
  - `cd server && npm run build`
  - `cd server && npm test`
  - `cd frontend && npm run build`
  - `cd frontend && npm test`

### Still open

- Root workspace build still fails because the root workspace install state is incomplete:
  - `npm run build` fails with `concurrently: command not found`
- The historical tasks below were written before these slices landed; treat them as provenance, not current status.

---

## Phase 0: Reproducibility and truth freeze

### Task 0.1: Add a backend clean-install failing check

Objective: prove package metadata is currently broken before changing anything.

Files:
- Create: `server/tests/meta/install-contract.test.ts` or use a shell verification script under `server/scripts/`
- Modify: `server/package.json`

Step 1: Write failing test or verification script

Preferred script path:
- `server/scripts/verify-install-contract.sh`

Behavior to assert:
- `npm ci` succeeds in a clean backend workspace

Step 2: Run it to verify failure

Run:
- `cd ~/Deal-Hunter/server && npm ci`

Expected now:
- fail due to package/lock drift

Step 3: Minimal implementation
- reconcile `server/package.json` and `server/package-lock.json`
- do not change app code yet

Step 4: Verify pass

Run:
- `cd ~/Deal-Hunter/server && npm ci`
- `cd ~/Deal-Hunter/server && npm test -- --runInBand`

Expected:
- install succeeds
- existing backend tests run

Step 5: Commit

```bash
git add server/package.json server/package-lock.json
git commit -m "build: restore deterministic backend install"
```

### Task 0.2: Add a frontend clean-install/build failing check

Objective: establish a real frontend baseline before refactoring contracts.

Files:
- Modify: `frontend/package.json`
- Optional create: `frontend/scripts/verify-build.sh`

Step 1: Write failing test/verification expectation
- define the verification contract in package scripts:
  - `build`
  - later `test`

Step 2: Verify current failure

Run:
- `cd ~/Deal-Hunter/frontend && npm ci`
- `cd ~/Deal-Hunter/frontend && npm run build`

Expected now:
- baseline either fails from missing setup or from real route/type issues

Step 3: Minimal implementation
- no behavior changes yet; only get the workspace installable and build-verifiable

Step 4: Verify pass or narrow failure set
- rerun install/build until only real code defects remain

Step 5: Commit

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "build: restore deterministic frontend install baseline"
```

### Task 0.3: Reconcile truth docs before feature work

Objective: stop planning drift.

Files:
- Modify: `README.md`
- Modify: `.planning/PROJECT.md`
- Modify: `docs/release-checklist.md`

Step 1: Write failing doc audit checklist
- one checklist item per contradiction:
  - Craigslist scope
  - TMV calculator status
  - portfolio status
  - canonical routes/API references

Step 2: Verify contradictions exist
- compare docs against actual files and mounted routes

Step 3: Minimal implementation
- choose one truth:
  - either feature is present, experimental, or not shipped
- update docs to match runtime reality

Step 4: Verify pass
- re-read the three docs and ensure they agree with code

Step 5: Commit

```bash
git add README.md .planning/PROJECT.md docs/release-checklist.md
git commit -m "docs: reconcile shipped scope with implementation"
```

---

## Phase 1: Frontend route contract stabilization

### Task 1.1: Add frontend test harness

Objective: create the smallest viable frontend RED loop.

Files:
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/src/test/render.tsx`

Step 1: Write failing test command expectation
- define `npm test`

Step 2: Verify failure

Run:
- `cd ~/Deal-Hunter/frontend && npm test`

Expected now:
- command missing

Step 3: Minimal implementation
- add Vitest, Testing Library, jsdom
- add `test` script

Step 4: Verify pass

Run:
- `cd ~/Deal-Hunter/frontend && npm test`

Expected:
- harness boots even with zero or one trivial test

Step 5: Commit

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts frontend/src/test/setup.ts frontend/src/test/render.tsx
git commit -m "test: add frontend vitest harness"
```

### Task 1.2: Write failing route-contract test

Objective: lock one canonical route namespace before changing components.

Files:
- Create: `frontend/src/App.routes.test.tsx`
- Read for implementation: `frontend/src/App.tsx`, `frontend/src/components/layout/Sidebar.tsx`, `frontend/src/components/ui/DealCard.tsx`

Step 1: Write failing test
- assert sidebar links match actual app routes
- assert deal detail link target matches registered route
- choose one canonical model, preferably no `/app` prefix unless intentionally nesting everything

Example test targets:
- navigation to `/deals` renders Deals page
- clicking sidebar “All Deals” goes to `/deals`
- DealCard detail link points to `/deals/:id`

Step 2: Verify failure

Run:
- `cd ~/Deal-Hunter/frontend && npm test -- App.routes.test.tsx`

Expected now:
- fail because current links target `/app/...`

Step 3: Minimal implementation
- introduce route constants, e.g. `frontend/src/routes.ts`
- update `App.tsx`, `Sidebar.tsx`, `DealCard.tsx`, `LandingPage.tsx` to share them

Step 4: Verify pass

Run:
- `cd ~/Deal-Hunter/frontend && npm test -- App.routes.test.tsx`

Expected:
- route contract test passes

Step 5: Commit

```bash
git add frontend/src/App.tsx frontend/src/components/layout/Sidebar.tsx frontend/src/components/ui/DealCard.tsx frontend/src/pages/LandingPage.tsx frontend/src/routes.ts frontend/src/App.routes.test.tsx
git commit -m "fix: unify frontend route namespace"
```

### Task 1.3: Remove duplicate Vite config after tests are green

Objective: eliminate config ambiguity without changing behavior.

Files:
- Remove: one of `frontend/vite.config.ts` or `frontend/vite.config.js`

Step 1: Write a small verification note in commit scope
- no new test needed if existing frontend test/build still passes

Step 2: Verify current duplication
- both files exist

Step 3: Minimal implementation
- keep TypeScript config file, remove JS duplicate

Step 4: Verify pass

Run:
- `cd ~/Deal-Hunter/frontend && npm run build`
- `cd ~/Deal-Hunter/frontend && npm test`

Step 5: Commit

```bash
git add frontend/vite.config.ts
git rm frontend/vite.config.js
git commit -m "chore: remove duplicate vite config"
```

---

## Phase 2: Frontend API contract stabilization

### Task 2.1: Write failing API client tests for TMV and score contracts

Objective: make frontend/client assumptions match backend reality.

Files:
- Create: `frontend/src/api/client.test.ts`
- Read: `frontend/src/api/client.ts`, `server/src/routes/analysis.routes.ts`, `server/src/routes/deal.routes.ts`

Step 1: Write failing tests
- `getTMV(id)` requests `/api/v1/tmv/:id`
- `calculateScore(id)` correctly unwraps wrapped response if that remains canonical
- auth-required endpoints are either not used by frontend yet or inject auth intentionally

Step 2: Verify failure

Run:
- `cd ~/Deal-Hunter/frontend && npm test -- client.test.ts`

Expected now:
- fail on wrong TMV path and/or response shape

Step 3: Minimal implementation
- patch `frontend/src/api/client.ts`
- if possible, formalize response unwrapping helpers

Step 4: Verify pass

Run:
- `cd ~/Deal-Hunter/frontend && npm test -- client.test.ts`

Step 5: Commit

```bash
git add frontend/src/api/client.ts frontend/src/api/client.test.ts
 git commit -m "fix: align frontend api client with backend contracts"
```

### Task 2.2: Add failing DealDetail data-shape tests

Objective: stop pretending base deal payloads are ranked payloads.

Files:
- Create: `frontend/src/pages/DealDetail.test.tsx`
- Modify later: `frontend/src/pages/DealDetail.tsx`, `frontend/src/hooks/useDeals.ts`, optionally `frontend/src/types/index.ts`

Step 1: Write failing tests
- renders safely when only `Deal` is returned
- renders analytics only when TMV/score data is actually present
- no force-cast from `Deal` to `RankedDeal`

Step 2: Verify failure

Run:
- `cd ~/Deal-Hunter/frontend && npm test -- DealDetail.test.tsx`

Expected now:
- fail because page assumes analytics shape

Step 3: Minimal implementation
Choose one and keep scope tight:
- Option A: fetch base deal plus `getTMV` plus score separately
- Option B: add a backend ranked-detail endpoint and consume it

Preferred for lowest scope now:
- Option A on frontend only if score endpoint is already stable and accessible

Step 4: Verify pass

Run:
- `cd ~/Deal-Hunter/frontend && npm test -- DealDetail.test.tsx`

Step 5: Commit

```bash
git add frontend/src/pages/DealDetail.tsx frontend/src/pages/DealDetail.test.tsx frontend/src/hooks/useDeals.ts frontend/src/types/index.ts
git commit -m "fix: make deal detail honor actual backend payload shapes"
```

---

## Phase 3: Backend API consolidation

### Task 3.1: Write failing backend contract tests for canonical analysis endpoints

Objective: choose one ranking endpoint and one scoring endpoint.

Files:
- Create or modify: `server/tests/integration/analysis.contract.test.ts`
- Read: `server/src/routes/analysis.routes.ts`, `server/src/routes/deal.routes.ts`

Step 1: Write failing tests
Pick canonical targets:
- ranking: one of `/api/v1/ranked` or `/api/v1/deals/ranked`
- scoring: one of `/api/v1/score` or `/api/v1/deals/:id/score`

Each test should assert:
- auth requirement
- response envelope shape
- fee semantics source

Step 2: Verify failure

Run:
- `cd ~/Deal-Hunter/server && npm test -- analysis.contract.test.ts --runInBand`

Expected now:
- fail because duplicate semantics currently exist

Step 3: Minimal implementation
- deprecate or remove duplicate surface
- if keeping both temporarily, one must delegate to the same service and same response model

Step 4: Verify pass

Run:
- `cd ~/Deal-Hunter/server && npm test -- analysis.contract.test.ts --runInBand`

Step 5: Commit

```bash
git add server/src/routes/analysis.routes.ts server/src/routes/deal.routes.ts server/tests/integration/analysis.contract.test.ts
git commit -m "fix: canonicalize analysis api contracts"
```

### Task 3.2: Extract TMV/scoring orchestration service behind failing tests

Objective: remove route-owned business logic.

Files:
- Create: `server/src/services/analysis.service.ts`
- Modify: `server/src/routes/analysis.routes.ts`
- Modify: `server/src/routes/deal.routes.ts`
- Create: `server/tests/unit/analysis.service.test.ts`

Step 1: Write failing unit tests
Target service methods like:
- `calculateAndPersistTMV(dealId)`
- `calculateAndPersistScore(dealId, feeAssumptions)`
- `getRankedDeals(limit)`

Step 2: Verify failure

Run:
- `cd ~/Deal-Hunter/server && npm test -- analysis.service.test.ts --runInBand`

Step 3: Minimal implementation
- move Prisma + scorer/calculator orchestration into service
- routes become thin adapters only

Step 4: Verify pass

Run:
- `cd ~/Deal-Hunter/server && npm test -- analysis.service.test.ts --runInBand`
- `cd ~/Deal-Hunter/server && npm test -- analysis.test.ts --runInBand`

Step 5: Commit

```bash
git add server/src/services/analysis.service.ts server/src/routes/analysis.routes.ts server/src/routes/deal.routes.ts server/tests/unit/analysis.service.test.ts
git commit -m "refactor: move analysis orchestration out of routes"
```

### Task 3.3: Add failing tests for mounted placeholder routes

Objective: stop returning fake 200s for unfinished surfaces.

Files:
- Create: `server/tests/integration/not-implemented-routes.test.ts`
- Modify: `server/src/routes/user.routes.ts`
- Modify: `server/src/routes/portfolio.routes.ts`
- Modify: `server/src/routes/alert.routes.ts`

Step 1: Write failing tests
- unfinished routes return 501 with explicit payload, or are unmounted

Step 2: Verify failure

Run:
- `cd ~/Deal-Hunter/server && npm test -- not-implemented-routes.test.ts --runInBand`

Expected now:
- fail because current routes return 200 placeholders

Step 3: Minimal implementation
- choose explicit 501 responses until implemented
- or remove mounts from `server/src/app.ts`

Step 4: Verify pass

Run:
- `cd ~/Deal-Hunter/server && npm test -- not-implemented-routes.test.ts --runInBand`

Step 5: Commit

```bash
git add server/src/routes/user.routes.ts server/src/routes/portfolio.routes.ts server/src/routes/alert.routes.ts server/src/app.ts server/tests/integration/not-implemented-routes.test.ts
git commit -m "fix: make unfinished backend surfaces explicit"
```

---

## Phase 4: Config and serialization hardening

### Task 4.1: Write failing env parsing tests for invalid numerics and default drift

Objective: fail fast on malformed config.

Files:
- Modify: `server/tests/unit/env.test.ts`
- Modify later: `server/src/config/env.ts`

Step 1: Write failing tests
- invalid `RATE_LIMIT_WINDOW_MS` throws
- invalid `TRUST_PROXY` throws
- default frontend/CORS values are consistent with Vite dev port

Step 2: Verify failure

Run:
- `cd ~/Deal-Hunter/server && npm test -- env.test.ts --runInBand`

Step 3: Minimal implementation
- use zod transforms/refinements instead of post-parse `parseInt`
- align dev defaults with `5173`

Step 4: Verify pass

Run:
- `cd ~/Deal-Hunter/server && npm test -- env.test.ts --runInBand`

Step 5: Commit

```bash
git add server/src/config/env.ts server/tests/unit/env.test.ts
git commit -m "fix: harden env parsing and align dev defaults"
```

### Task 4.2: Write failing serializer tests for Decimal normalization

Objective: centralize API number serialization.

Files:
- Create: `server/src/serializers/deal.serializer.ts`
- Create: `server/src/serializers/analysis.serializer.ts`
- Create: `server/tests/unit/serializers.test.ts`
- Modify: relevant routes/controllers/services

Step 1: Write failing tests
- ranked payload numeric fields are numbers
- deal detail/list price is number
- stats fields are normalized
- watchlist nested deal fields are normalized

Step 2: Verify failure

Run:
- `cd ~/Deal-Hunter/server && npm test -- serializers.test.ts --runInBand`

Step 3: Minimal implementation
- add shared serializer helpers
- remove scattered `Number(...)` shaping in routes where possible

Step 4: Verify pass

Run:
- `cd ~/Deal-Hunter/server && npm test -- serializers.test.ts --runInBand`
- spot-check existing integration tests

Step 5: Commit

```bash
git add server/src/serializers/deal.serializer.ts server/src/serializers/analysis.serializer.ts server/tests/unit/serializers.test.ts server/src/controllers/deal.controller.ts server/src/routes/analysis.routes.ts server/src/routes/deal.routes.ts server/src/services/watchlist.service.ts
 git commit -m "refactor: centralize backend payload serialization"
```

---

## Phase 5: TMV protection and targeted validation gaps

### Task 5.1: Add direct TMV domain unit tests

Objective: protect the product’s differentiator with direct tests.

Files:
- Create: `server/tests/unit/tmv.domain.test.ts`
- Modify later if needed: `server/src/domain/tmv.ts`
- Modify coverage config if needed: `server/jest.config.js`

Step 1: Write failing tests
Cover one behavior per test:
- rejects insufficient samples
- rejects stale samples outside freshness window
- removes outliers
- weighted median beats mean when valid
- confidence floor can reject outputs
- condition normalization changes TMV as expected

Step 2: Verify failure

Run:
- `cd ~/Deal-Hunter/server && npm test -- tmv.domain.test.ts --runInBand`

Step 3: Minimal implementation
- only patch TMV logic if the test exposes a real bug
- otherwise add coverage inclusion and keep code unchanged

Step 4: Verify pass

Run:
- `cd ~/Deal-Hunter/server && npm test -- tmv.domain.test.ts --runInBand`

Step 5: Commit

```bash
git add server/tests/unit/tmv.domain.test.ts server/jest.config.js server/src/domain/tmv.ts
git commit -m "test: cover core tmv domain behavior"
```

### Task 5.2: Add failing validation test for watchlist notes

Objective: reject malformed PATCH payloads with 400s instead of runtime errors.

Files:
- Modify: `server/tests/integration/watchlist.test.ts`
- Modify later: `server/src/routes/watchlist.routes.ts`

Step 1: Write failing test
- PATCH with invalid `notes` type returns 400

Step 2: Verify failure

Run:
- `cd ~/Deal-Hunter/server && npm test -- watchlist.test.ts --runInBand`

Step 3: Minimal implementation
- add body validation for notes payload

Step 4: Verify pass

Run:
- `cd ~/Deal-Hunter/server && npm test -- watchlist.test.ts --runInBand`

Step 5: Commit

```bash
git add server/src/routes/watchlist.routes.ts server/tests/integration/watchlist.test.ts
git commit -m "fix: validate watchlist notes payloads"
```

---

## Final verification gate

Run exactly:

```bash
cd ~/Deal-Hunter/server && npm ci
cd ~/Deal-Hunter/server && npm run lint
cd ~/Deal-Hunter/server && npm test -- --runInBand
cd ~/Deal-Hunter/server && npm run build
cd ~/Deal-Hunter/frontend && npm ci
cd ~/Deal-Hunter/frontend && npm test
cd ~/Deal-Hunter/frontend && npm run build
```

Success criteria
- Clean installs succeed in both workspaces
- Frontend route tests prove links hit real routes
- Frontend API tests prove backend path/response alignment
- Deal detail no longer lies about payload shape
- Backend exposes one coherent scoring/ranking contract
- Placeholder backend surfaces are explicit or removed
- Env parsing fails fast on malformed numerics/booleans
- TMV domain has direct protection tests
- Mutations do not later violate user-visible expectations because of hidden contract drift

Recommended execution order
1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5
7. Final verification gate
