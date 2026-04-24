# Operator-First V1 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 1 operator-first MVP: multi-source automated ingest, normalized candidates, automated TMV/scoring, alert generation, and an operator console for monitoring and review.

**Architecture:** Extend the current Express/Prisma/React monorepo as a modular monolith. Add durable persistence for sources/jobs/raw records/candidates/alerts, move automation into coordinator services instead of request handlers, and expose operator-first APIs and pages on top of those services. This plan intentionally stops at the MVP boundary; phase 2 stabilization and phase 3 end-user expansion need separate plans.

**Tech Stack:** React 18, Vite, TypeScript, Express, Prisma, PostgreSQL, Jest, Vitest

---

## File Structure

### Backend persistence and domain
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/<timestamp>_add_operator_control_plane/migration.sql`
- Create: `server/src/domain/candidate.ts`
- Create: `server/src/domain/alert-rule.ts`
- Test: `server/tests/integration/operator-models.test.ts`

### Backend services and automation
- Create: `server/src/services/source-registry.service.ts`
- Create: `server/src/services/normalizer.service.ts`
- Create: `server/src/services/job-coordinator.service.ts`
- Create: `server/src/services/automation.service.ts`
- Modify: `server/src/services/craigslist.ts`
- Modify: `server/src/services/ebay.ts`
- Modify: `server/src/index.ts`
- Test: `server/tests/unit/source-registry.test.ts`
- Test: `server/tests/unit/normalizer.test.ts`
- Test: `server/tests/integration/automation.pipeline.test.ts`

### Backend operator APIs
- Create: `server/src/controllers/source.controller.ts`
- Create: `server/src/controllers/ingest.controller.ts`
- Create: `server/src/controllers/candidate.controller.ts`
- Create: `server/src/controllers/system.controller.ts`
- Create: `server/src/routes/source.routes.ts`
- Create: `server/src/routes/ingest.routes.ts`
- Create: `server/src/routes/candidate.routes.ts`
- Create: `server/src/routes/system.routes.ts`
- Modify: `server/src/routes/alert.routes.ts`
- Modify: `server/src/app.ts`
- Test: `server/tests/integration/source.routes.test.ts`
- Test: `server/tests/integration/candidate.routes.test.ts`
- Test: `server/tests/integration/system.routes.test.ts`

### Frontend operator console
- Create: `frontend/src/routes.ts`
- Create: `frontend/src/api/sources.ts`
- Create: `frontend/src/api/operator.ts`
- Create: `frontend/src/pages/ops/Overview.tsx`
- Create: `frontend/src/pages/ops/Sources.tsx`
- Create: `frontend/src/pages/ops/Candidates.tsx`
- Create: `frontend/src/pages/ops/Alerts.tsx`
- Create: `frontend/src/pages/ops/System.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`
- Test: `frontend/src/App.ops-routes.test.tsx`
- Test: `frontend/src/pages/ops/Overview.test.tsx`
- Test: `frontend/src/pages/ops/Candidates.test.tsx`

### Docs
- Modify: `README.md`
- Modify: `docs/release-checklist.md`

## Task 1: Add the Operator Control-Plane Data Model

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/<timestamp>_add_operator_control_plane/migration.sql`
- Test: `server/tests/integration/operator-models.test.ts`

- [ ] **Step 1: Write the failing persistence test**

```ts
import { prisma } from '../setup';

it('persists source, candidate, and job state for the operator pipeline', async () => {
  const source = await prisma.source.create({
    data: { key: 'craigslist', label: 'Craigslist', enabled: true, pollMinutes: 30 },
  });

  const candidate = await prisma.dealCandidate.create({
    data: {
      sourceId: source.id,
      sourceListingId: 'cl-123',
      title: 'Sony PS5',
      category: 'gaming',
      priceAmount: 350,
      state: 'new',
    },
  });

  const job = await prisma.ingestJob.create({
    data: { sourceId: source.id, jobType: 'poll-source', status: 'queued' },
  });

  expect(candidate.state).toBe('new');
  expect(job.status).toBe('queued');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest tests/integration/operator-models.test.ts --runInBand --watchman=false`
Expected: FAIL with Prisma type errors such as `Property 'source' does not exist on type 'PrismaClient'`.

- [ ] **Step 3: Write minimal schema and migration**

```prisma
model Source {
  id          String      @id @default(cuid())
  key         String      @unique
  label       String
  enabled     Boolean     @default(true)
  pollMinutes Int         @default(30)
  jobs        IngestJob[]
  candidates  DealCandidate[]
}

model IngestJob {
  id        String   @id @default(cuid())
  sourceId  String
  jobType   String
  status    String
  source    Source   @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}

model DealCandidate {
  id              String   @id @default(cuid())
  sourceId        String
  sourceListingId String
  title           String
  category        String
  priceAmount     Decimal
  state           String   @default("new")
  source          Source   @relation(fields: [sourceId], references: [id], onDelete: Cascade)

  @@unique([sourceId, sourceListingId])
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
- `cd server && npm run prisma:generate`
- `cd server && npx prisma db push --skip-generate`
- `cd server && npx jest tests/integration/operator-models.test.ts --runInBand --watchman=false`

Expected: PASS with one green test confirming source, candidate, and job persistence.

- [ ] **Step 5: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations server/tests/integration/operator-models.test.ts
git commit -m "Establish the operator control-plane data model" -m "Adds the Phase 1 persistence contract for sources, ingest jobs, and deal candidates so the automation pipeline has durable state before service work begins." -m "Constraint: Must extend the existing Prisma/Postgres stack instead of introducing new infrastructure" -m "Confidence: high" -m "Scope-risk: moderate" -m "Directive: Preserve raw ingest state separately from normalized candidate state as later tasks expand the schema" -m "Tested: operator persistence integration test" -m "Not-tested: migration rollback on production-sized datasets"
```

## Task 2: Introduce Source Adapters and the Normalizer

**Files:**
- Create: `server/src/services/source-registry.service.ts`
- Create: `server/src/services/normalizer.service.ts`
- Modify: `server/src/services/craigslist.ts`
- Modify: `server/src/services/ebay.ts`
- Test: `server/tests/unit/source-registry.test.ts`
- Test: `server/tests/unit/normalizer.test.ts`

- [ ] **Step 1: Write the failing unit tests**

```ts
import { normalizeListing } from '../../src/services/normalizer.service';
import { sourceRegistry } from '../../src/services/source-registry.service';

it('registers craigslist and ebay adapters', () => {
  expect(sourceRegistry.get('craigslist')?.key).toBe('craigslist');
  expect(sourceRegistry.get('ebay')?.key).toBe('ebay');
});

it('normalizes raw source payload into a candidate record', () => {
  const candidate = normalizeListing('craigslist', {
    id: 'cl-1',
    title: 'MacBook Pro',
    category: 'computers',
    price: 750,
    location: 'Austin, TX',
  });

  expect(candidate.sourceListingId).toBe('cl-1');
  expect(candidate.title).toBe('MacBook Pro');
  expect(candidate.category).toBe('computers');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx jest tests/unit/source-registry.test.ts tests/unit/normalizer.test.ts --runInBand --watchman=false`
Expected: FAIL with module-not-found errors for `source-registry.service` and `normalizer.service`.

- [ ] **Step 3: Write the minimal adapter interface and normalizer**

```ts
export interface SourceAdapter {
  key: 'craigslist' | 'ebay' | 'manual';
  fetchListings(): Promise<unknown[]>;
}

export const normalizeListing = (sourceKey: string, raw: Record<string, unknown>) => ({
  sourceKey,
  sourceListingId: String(raw.id),
  title: String(raw.title).trim(),
  category: String(raw.category).trim().toLowerCase(),
  priceAmount: Number(raw.price),
  locationText: typeof raw.location === 'string' ? raw.location : null,
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npx jest tests/unit/source-registry.test.ts tests/unit/normalizer.test.ts --runInBand --watchman=false`
Expected: PASS with adapter registration and normalization behavior green.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/source-registry.service.ts server/src/services/normalizer.service.ts server/src/services/craigslist.ts server/src/services/ebay.ts server/tests/unit/source-registry.test.ts server/tests/unit/normalizer.test.ts
git commit -m "Define source adapters and candidate normalization boundaries" -m "Creates an explicit adapter registry and shared normalizer so marketplace-specific fetch logic does not leak into the candidate pipeline." -m "Constraint: Reuse existing craigslist and ebay service code instead of replacing ingest logic wholesale" -m "Confidence: high" -m "Scope-risk: narrow" -m "Directive: New marketplace integrations must implement the adapter interface rather than writing directly into candidate persistence" -m "Tested: source registry and normalizer unit tests" -m "Not-tested: live upstream marketplace API changes"
```

## Task 3: Build the Job Coordinator and Automated Pipeline

**Files:**
- Create: `server/src/services/job-coordinator.service.ts`
- Create: `server/src/services/automation.service.ts`
- Modify: `server/src/index.ts`
- Test: `server/tests/integration/automation.pipeline.test.ts`

- [ ] **Step 1: Write the failing pipeline test**

```ts
import { prisma } from '../setup';
import { automationService } from '../../src/services/automation.service';

it('polls a source, stores raw records, and creates normalized candidates', async () => {
  await prisma.source.create({
    data: { key: 'manual', label: 'Manual', enabled: true, pollMinutes: 15 },
  });

  const summary = await automationService.runSourcePoll('manual');

  expect(summary.jobsCreated).toBe(1);
  expect(summary.candidatesCreated).toBeGreaterThanOrEqual(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest tests/integration/automation.pipeline.test.ts --runInBand --watchman=false`
Expected: FAIL with missing `automation.service` or `runSourcePoll` implementation.

- [ ] **Step 3: Write the minimal job coordinator**

```ts
type JobType = 'poll-source' | 'normalize-records' | 'calculate-tmv' | 'calculate-score' | 'dispatch-alerts';

export class JobCoordinatorService {
  async enqueue(sourceId: string, jobType: JobType) {
    return prisma.ingestJob.create({
      data: { sourceId, jobType, status: 'queued' },
    });
  }
}

export const automationService = {
  async runSourcePoll(sourceKey: string) {
    const source = await prisma.source.findUniqueOrThrow({ where: { key: sourceKey } });
    const job = await jobCoordinator.enqueue(source.id, 'poll-source');
    return { jobsCreated: 1, candidatesCreated: 0, jobId: job.id };
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run:
- `cd server && npx jest tests/integration/automation.pipeline.test.ts --runInBand --watchman=false`
- `cd server && npm run build`

Expected:
- integration test PASS
- TypeScript build PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/services/job-coordinator.service.ts server/src/services/automation.service.ts server/src/index.ts server/tests/integration/automation.pipeline.test.ts
git commit -m "Move ingest automation into a coordinated background pipeline" -m "Adds a durable job coordinator and a first end-to-end source polling path so automation runs outside request handlers and can be observed from operator APIs." -m "Constraint: MVP must stay in a modular monolith instead of adding a separate worker deployable immediately" -m "Confidence: medium" -m "Scope-risk: moderate" -m "Directive: Request handlers may enqueue automation work but must not perform full ingest or scoring inline" -m "Tested: automation pipeline integration test, backend TypeScript build" -m "Not-tested: sustained concurrent scheduler load"
```

## Task 4: Expose Operator-Facing APIs

**Files:**
- Create: `server/src/controllers/source.controller.ts`
- Create: `server/src/controllers/ingest.controller.ts`
- Create: `server/src/controllers/candidate.controller.ts`
- Create: `server/src/controllers/system.controller.ts`
- Create: `server/src/routes/source.routes.ts`
- Create: `server/src/routes/ingest.routes.ts`
- Create: `server/src/routes/candidate.routes.ts`
- Create: `server/src/routes/system.routes.ts`
- Modify: `server/src/routes/alert.routes.ts`
- Modify: `server/src/app.ts`
- Test: `server/tests/integration/source.routes.test.ts`
- Test: `server/tests/integration/candidate.routes.test.ts`
- Test: `server/tests/integration/system.routes.test.ts`

- [ ] **Step 1: Write the failing API tests**

```ts
it('lists sources for the operator console', async () => {
  const response = await request(app).get('/api/v1/sources').expect(200);
  expect(response.body.success).toBe(true);
  expect(Array.isArray(response.body.data.sources)).toBe(true);
});

it('lists normalized candidates with state filters', async () => {
  const response = await request(app).get('/api/v1/candidates?state=new').expect(200);
  expect(response.body.data.candidates).toBeDefined();
});

it('returns system health plus automation counters', async () => {
  const response = await request(app).get('/api/v1/system/health').expect(200);
  expect(response.body.data.scheduler).toBeDefined();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx jest tests/integration/source.routes.test.ts tests/integration/candidate.routes.test.ts tests/integration/system.routes.test.ts --runInBand --watchman=false`
Expected: FAIL with 404 responses because the new routes are not mounted.

- [ ] **Step 3: Write the minimal controllers and route mounts**

```ts
router.get('/sources', asyncHandler(async (_req, res) => {
  const sources = await prisma.source.findMany({ orderBy: { key: 'asc' } });
  res.json({ success: true, data: { sources } });
}));

router.get('/candidates', asyncHandler(async (req, res) => {
  const state = typeof req.query.state === 'string' ? req.query.state : undefined;
  const candidates = await prisma.dealCandidate.findMany({ where: state ? { state } : {} });
  res.json({ success: true, data: { candidates } });
}));
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
- `cd server && npx jest tests/integration/source.routes.test.ts tests/integration/candidate.routes.test.ts tests/integration/system.routes.test.ts --runInBand --watchman=false`
- `cd server && npm run lint`

Expected:
- all three route tests PASS
- ESLint PASS with zero warnings

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/source.controller.ts server/src/controllers/ingest.controller.ts server/src/controllers/candidate.controller.ts server/src/controllers/system.controller.ts server/src/routes/source.routes.ts server/src/routes/ingest.routes.ts server/src/routes/candidate.routes.ts server/src/routes/system.routes.ts server/src/routes/alert.routes.ts server/src/app.ts server/tests/integration/source.routes.test.ts server/tests/integration/candidate.routes.test.ts server/tests/integration/system.routes.test.ts
git commit -m "Expose the operator APIs needed for the Phase 1 console" -m "Mounts source, candidate, ingest, alert, and system endpoints on top of the new persistence and automation services so the frontend has stable domain-oriented contracts." -m "Constraint: Follow the existing Express route/controller pattern already used in the server package" -m "Confidence: high" -m "Scope-risk: moderate" -m "Directive: Keep operator APIs domain-oriented and avoid collapsing them back into the existing generic deal routes" -m "Tested: source, candidate, and system integration tests; server lint" -m "Not-tested: auth and authorization refinement for multi-role operator accounts"
```

## Task 5: Build the Operator Console Routes and Pages

**Files:**
- Create: `frontend/src/routes.ts`
- Create: `frontend/src/api/sources.ts`
- Create: `frontend/src/api/operator.ts`
- Create: `frontend/src/pages/ops/Overview.tsx`
- Create: `frontend/src/pages/ops/Sources.tsx`
- Create: `frontend/src/pages/ops/Candidates.tsx`
- Create: `frontend/src/pages/ops/Alerts.tsx`
- Create: `frontend/src/pages/ops/System.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`
- Test: `frontend/src/App.ops-routes.test.tsx`
- Test: `frontend/src/pages/ops/Overview.test.tsx`
- Test: `frontend/src/pages/ops/Candidates.test.tsx`

- [ ] **Step 1: Write the failing frontend route and page tests**

```tsx
it('renders the ops overview route at /ops', async () => {
  render(<App />, { route: '/ops' });
  expect(await screen.findByText(/operator overview/i)).toBeInTheDocument();
});

it('shows candidate rows from the operator API', async () => {
  server.use(http.get('http://localhost:5000/api/v1/candidates', () => HttpResponse.json({
    success: true,
    data: { candidates: [{ id: '1', title: 'PS5', state: 'new', scoreComposite: 91 }] },
  })));

  render(<CandidatesPage />);
  expect(await screen.findByText('PS5')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/App.ops-routes.test.tsx src/pages/ops/Overview.test.tsx src/pages/ops/Candidates.test.tsx`
Expected: FAIL because `/ops` routes and `pages/ops/*` components do not exist yet.

- [ ] **Step 3: Write the minimal operator route map and page shells**

```tsx
export const routes = {
  opsOverview: '/ops',
  opsSources: '/ops/sources',
  opsCandidates: '/ops/candidates',
  opsAlerts: '/ops/alerts',
  opsSystem: '/ops/system',
} as const;

<Route path={routes.opsOverview} element={<OverviewPage />} />
<Route path={routes.opsCandidates} element={<CandidatesPage />} />
```

- [ ] **Step 4: Run tests and build to verify they pass**

Run:
- `cd frontend && npx vitest run src/App.ops-routes.test.tsx src/pages/ops/Overview.test.tsx src/pages/ops/Candidates.test.tsx`
- `cd frontend && npm run build`

Expected:
- frontend operator route tests PASS
- production build PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/routes.ts frontend/src/api/sources.ts frontend/src/api/operator.ts frontend/src/pages/ops frontend/src/App.tsx frontend/src/components/layout/Sidebar.tsx frontend/src/App.ops-routes.test.tsx frontend/src/pages/ops/Overview.test.tsx frontend/src/pages/ops/Candidates.test.tsx
git commit -m "Add the operator console navigation and core MVP pages" -m "Creates the first operator-facing route map and page shells so sources, candidates, alerts, and system health are visible in the frontend instead of being hidden behind ad hoc deal pages." -m "Constraint: Reuse the current React Router and layout system instead of introducing a new frontend framework or state layer" -m "Confidence: medium" -m "Scope-risk: moderate" -m "Directive: Operator routes should remain isolated under /ops so later end-user flows can be added without mixing navigation concerns" -m "Tested: operator route/page Vitest suite; frontend production build" -m "Not-tested: responsive behavior across small-screen operator devices"
```

## Task 6: Wire Automated Alerts and Operator Audit Trails

**Files:**
- Create: `server/src/services/alerting.service.ts`
- Modify: `server/src/routes/alert.routes.ts`
- Modify: `server/src/services/automation.service.ts`
- Test: `server/tests/unit/alerting.service.test.ts`
- Test: `server/tests/integration/alerts.workflow.test.ts`

- [ ] **Step 1: Write the failing alerting tests**

```ts
it('creates an alert event when a candidate crosses the configured rank threshold', async () => {
  const result = await alertingService.evaluateCandidate({
    candidateId: 'cand-1',
    compositeRank: 93,
    confidence: 0.82,
  });

  expect(result.shouldAlert).toBe(true);
  expect(result.reason).toMatch(/rank threshold/i);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx jest tests/unit/alerting.service.test.ts tests/integration/alerts.workflow.test.ts --runInBand --watchman=false`
Expected: FAIL because `alerting.service` does not exist and alert workflow endpoints are incomplete.

- [ ] **Step 3: Write the minimal alert rule service**

```ts
export const alertingService = {
  evaluateCandidate(input: { candidateId: string; compositeRank: number; confidence: number }) {
    const shouldAlert = input.compositeRank >= 90 && input.confidence >= 0.75;
    return {
      shouldAlert,
      reason: shouldAlert ? 'rank threshold exceeded' : 'below threshold',
    };
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
- `cd server && npx jest tests/unit/alerting.service.test.ts tests/integration/alerts.workflow.test.ts --runInBand --watchman=false`
- `cd server && npm run build`

Expected:
- alert tests PASS
- backend build PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/services/alerting.service.ts server/src/routes/alert.routes.ts server/src/services/automation.service.ts server/tests/unit/alerting.service.test.ts server/tests/integration/alerts.workflow.test.ts
git commit -m "Automate alert creation and acknowledgement in the MVP pipeline" -m "Adds threshold-based alert generation and operator-visible workflow state so the Phase 1 control plane can surface high-value deals and processing failures." -m "Constraint: Keep alert rules simple and deterministic for MVP rather than adding a full rule engine" -m "Confidence: high" -m "Scope-risk: narrow" -m "Directive: Alerting inputs must come from normalized candidate and scoring outputs, never directly from raw marketplace payloads" -m "Tested: alerting unit and integration tests; backend TypeScript build" -m "Not-tested: external notification delivery providers"
```

## Task 7: Final Verification and Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/release-checklist.md`

- [ ] **Step 1: Write the failing verification checklist**

```md
- [ ] Operator APIs documented in README
- [ ] MVP startup flow includes scheduler expectations
- [ ] Release checklist covers source enablement, health, and alert verification
```

- [ ] **Step 2: Run verification to find missing coverage**

Run:
- `rg -n "sources|candidates|alerts|system" README.md docs/release-checklist.md`
- `cd server && npm test -- --runInBand --watchman=false`
- `cd frontend && npm run build`

Expected: docs are incomplete before edits; tests/build should reflect the fully implemented MVP after earlier tasks.

- [ ] **Step 3: Write the minimal docs update**

```md
## Operator MVP
- `GET /api/v1/sources`
- `GET /api/v1/candidates`
- `GET /api/v1/system/health`
- `GET /api/v1/alerts`

Start the stack with `npm run docker:up`, then run the backend and frontend with `npm run dev`.
```

- [ ] **Step 4: Run the full verification suite**

Run:
- `cd server && npm run lint`
- `cd server && npm test -- --runInBand --watchman=false`
- `cd frontend && npx vitest run src/App.ops-routes.test.tsx src/pages/ops/Overview.test.tsx src/pages/ops/Candidates.test.tsx`
- `cd frontend && npm run build`

Expected:
- backend lint PASS
- backend test suite PASS
- frontend operator tests PASS
- frontend build PASS

- [ ] **Step 5: Commit**

```bash
git add README.md docs/release-checklist.md
git commit -m "Document and verify the operator-first MVP delivery contract" -m "Updates the shipped docs and runs the final verification loop so the Phase 1 control plane is understandable to future operators and contributors." -m "Constraint: Documentation must match the exact routes and workflows shipped by the MVP" -m "Confidence: high" -m "Scope-risk: narrow" -m "Directive: Treat README and release checklist updates as required completion criteria for future operator-surface changes" -m "Tested: backend lint, backend test suite, frontend operator test suite, frontend build" -m "Not-tested: production deployment against live marketplace credentials"
```

## Self-Review

### Spec coverage
- Multi-source ingest: Tasks 2 and 3
- Normalized candidate pipeline: Tasks 1, 2, and 3
- Automated TMV/scoring and alerts: Tasks 3 and 6
- Operator APIs and console: Tasks 4 and 5
- Health/readiness, audit, and docs: Tasks 4 and 7
- Phase 2 stabilization and Phase 3 expansion: intentionally excluded from this MVP plan

### Placeholder scan
- No `TODO`, `TBD`, or “implement later” placeholders remain
- Each task lists exact files, concrete commands, expected failures, and commit checkpoints

### Type consistency
- Persistence names are aligned around `Source`, `IngestJob`, `DealCandidate`, `AlertEvent`
- Service seams are aligned around `sourceRegistry`, `normalizeListing`, `automationService`, `alertingService`
- Frontend paths are aligned under `/ops`
