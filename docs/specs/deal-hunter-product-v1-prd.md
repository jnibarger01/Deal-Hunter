# Deal-Hunter Product Requirements Document

**Product:** Deal-Hunter
**Version:** Product v1 / Operator MVP
**Status:** Draft for implementation planning
**Last updated:** 2026-05-01
**Audience:** Product, engineering, DevOps, and AI coding agents

---

## 1. Executive Summary

Deal-Hunter is an operator-first control plane for marketplace deal discovery, valuation, scoring, and review. It ingests marketplace listings from multiple sources, preserves raw evidence, normalizes candidate deals, calculates True Market Value (TMV) from comparable market samples, ranks opportunities, and gives operators enough provenance to trust, replay, or reject automation output.

The v1 product should prove one core promise:

> An operator can safely run automated marketplace ingest, review ranked opportunities with transparent valuation evidence, and recover or replay failed pipeline work without losing auditability.

This PRD does not supersede the approved operator-first MVP direction in `docs/superpowers/specs/2026-04-19-operator-first-v1-design.md`. Reseller/flipper-facing saved workflows, broad solo-user UX, watchlists, and user alert loops belong to later expansion after the operator control plane is trustworthy.

Readiness sequencing is gated by `docs/plans/2026-05-01-product-readiness-review-plan.md`. That plan is the execution gate for fixing current repo blockers before new product surface area is treated as launchable.

---

## 2. Problem Statement

Marketplace deal automation fails when raw source data, normalized business objects, valuation artifacts, and operator actions are mixed together or hidden behind one-off request handlers. Operators need a system that makes automation visible and recoverable:

- Source adapters can fail, drift, or return partial data.
- Active listings and sold comparable samples have different semantics and must not be blended carelessly.
- TMV and score outputs must be explainable, repeatable, and version-aware enough to support later tuning.
- Background work needs durable job state, backoff, dead-letter handling, replay, and audit history.
- Unsafe write behavior on read-looking routes creates launch risk.

Deal-Hunter v1 solves this by building the operator control plane first: ingest, normalize, value, score, review, replay, and audit before broad end-user workflow expansion.

---

## 3. Target Users

### Primary User: Admin / Operator

- Configures marketplace sources, credentials, sync cadence, and feature flags.
- Monitors source health, ingest jobs, dead letters, and readiness status.
- Reviews candidate deals, valuation evidence, score explanations, and action history.
- Replays failed jobs or records after correcting source or normalization issues.
- Needs deterministic deployment, clear failure modes, and recoverable automation.

### Secondary User: Internal Product / QA Reviewer

- Uses seeded, fixture-backed, or live data to validate TMV and score behavior.
- Checks frontend/backend contract alignment before release.
- Confirms degraded states when credentials, samples, or services are missing.

### Later Expansion User: Reseller / Flipper

- Reviews ranked deals, saves opportunities, and receives alerts.
- Wants watchlists, saved filters, portfolio workflows, and solo-user sourcing UX.
- Is explicitly not the Phase 1 MVP owner unless the operator foundation is complete.

---

## 4. Product Goals

### Phase 1 Business Goals

1. Make automated marketplace ingest observable and controllable.
2. Build trust in TMV and deal scoring through transparent source evidence.
3. Reduce launch risk by separating safe reads from operator-only writes.
4. Keep the MVP narrow enough to stabilize the existing monorepo before expansion.

### Operator Goals

1. See source health, recent jobs, failed records, and top ranked candidates.
2. Trigger, pause, replay, or inspect ingest and normalization work safely.
3. Understand why a candidate is valuable or risky.
4. Inspect raw source payloads beside normalized fields and computed artifacts.
5. Leave an audit trail for overrides, dismissals, promotions, replays, and rescoring.

### Engineering Goals

1. Resolve baseline build/test/readiness blockers before expanding product contracts.
2. Keep TMV and scoring logic isolated, testable, deterministic, and reused by APIs.
3. Use official APIs where available; avoid ToS-hostile acquisition in v1.
4. Store raw source evidence separately from normalized candidate/deal state.
5. Keep frontend/backend contracts explicit and covered by tests.
6. Preserve a modular-monolith architecture on Express, Prisma, React/Vite, and Postgres.

---

## 5. Non-Goals

Deal-Hunter Phase 1 will not include:

- Native iOS or Android apps.
- Broad solo-reseller onboarding and saved personal workflows.
- Watchlist, portfolio, and personalized alert loops as launch-critical MVP scope.
- Crosslisting, inventory management, fulfillment, shipping labels, or purchasing bots.
- Machine-learning price prediction.
- Early microservice decomposition or distributed event infrastructure.
- A generic public marketplace browsing product.
- Unauthenticated write-like ingest operations.

---

## 6. MVP Scope

### Phase 1 Must Have: Operator Control Plane

1. **Multi-source ingest foundation**
   - Support source adapters for the current app direction, including existing Craigslist/Facebook paths and eBay live data where configured.
   - Store source identity, source-specific IDs, source health, sync timestamps, and error summaries.
   - Preserve raw source records separately from normalized candidate/deal state.
   - Deduplicate by source identity and stable source IDs, with content hashing where available.

2. **Durable job and replay model**
   - Record named job types such as poll source, normalize records, hydrate samples, calculate TMV, calculate score, and dispatch alerts or events.
   - Track job states: queued, running, succeeded, failed, retrying, and dead-lettered.
   - Support replay from raw records or failed jobs after an operator action.
   - Keep enough error detail to diagnose source, validation, normalization, or persistence failures.

3. **Candidate review workflow**
   - Normalize source payloads into operator-visible candidate deals.
   - Make candidate state explicit: new, reviewed, dismissed, promoted, archived, failed, or equivalent.
   - Show raw provenance, normalized fields, TMV, score, and action history together.
   - Let operators promote, dismiss, rescore, or replay without losing auditability.

4. **TMV engine**
   - Use sold/completed comparable samples for TMV.
   - Filter samples by freshness window.
   - Reject outliers using IQR.
   - Weight recent samples higher than old samples.
   - Enforce minimum sample threshold before producing confident TMV.
   - Produce confidence, volatility, liquidity score, estimated days-to-sell, and calculation timestamp.
   - Keep category/source assumptions explicit through TMV assumptions and scenarios.

5. **Deal scoring**
   - Calculate net estimated profit, margin/ROI, velocity, risk, and composite rank.
   - Persist score results for fast operator views.
   - Penalize weak confidence, stale samples, high volatility, low liquidity, risky condition, and processing errors.
   - Make score explanations available to the operator UI.

6. **Operator dashboard and settings**
   - Show source health, active jobs, recent failures, dead letters, top ranked candidates, and readiness status.
   - Show marketplace credential state without exposing secret values.
   - Show degraded states when credentials, samples, or backend services are missing.

7. **Safety and readiness**
   - Health and readiness endpoints.
   - Environment validation for production/staging operator secrets.
   - Docker Compose local stack and production deployment documentation.
   - Public read routes must not perform hidden DB writes.

### Phase 1 Should Have

- Category-specific fee/prep/TMV defaults.
- Manual TMV/profit calculator for operator validation.
- Operator token or admin-auth flows hardened enough for private operator use.
- Contract tests for frontend API adaptation and backend route shapes.
- Seeded or fixture-backed demo data for degraded environments.

### Later Expansion

- Reseller-facing watchlists, saved searches, and saved filters.
- Personalized alert rules and email/SMS/push delivery loops.
- Portfolio tracking for purchased deals.
- Broader solo-user dashboard and mobile-first deal browsing.
- Regional price multipliers and seasonality indexes if clearly separated from MVP scoring.

---

## 7. User Stories

### Operations

- As an operator, I want to see source health and recent job status so I can tell whether ingest is working.
- As an operator, I want readiness checks to verify the app can reach required dependencies.
- As an operator, I want credential status without secret exposure so I can correct setup problems safely.

### Ingest And Replay

- As an operator, I want raw source payloads preserved so I can debug normalization and source drift.
- As an operator, I want failed records to become dead letters so I can inspect and replay them.
- As an operator, I want ingest writes gated behind operator/admin controls so public reads do not mutate state.

### Candidate Review

- As an operator, I want a ranked candidate queue so I can review the highest-value opportunities first.
- As an operator, I want to see raw evidence, normalized fields, TMV, score, and errors together.
- As an operator, I want to promote, dismiss, rescore, or replay candidates with an audit trail.

### Valuation And Scoring

- As an operator, I want TMV based on sold comps so active listing noise does not drive valuation.
- As an operator, I want confidence, sample count, and freshness visible so I know whether to trust TMV.
- As an operator, I want score explanations so low or high rankings can be audited.

### Later Reseller Workflows

- As a reseller, I want saved deals, watchlists, saved filters, and alerts after the operator pipeline is reliable.
- As a reseller, I want a simplified browsing UX after the source, valuation, and scoring foundations are proven.

---

## 8. Functional Requirements

### 8.1 Marketplace Ingest And Source Management

- The system must support multiple source adapters in the MVP direction rather than making Phase 1 eBay-only.
- The system must record source configuration, enablement, credential posture, sync cadence, and last health status.
- The system must store raw source records separately from normalized candidate/deal records.
- The system must tolerate missing optional listing fields without crashing ingest.
- The system must deduplicate listings by source and source ID, with content hash support where available.
- The system must never require secrets in committed files.
- Operator-only ingest operations must require operator token or admin authorization.

### 8.2 Job Coordination, Audit, And Replay

- Request handlers may trigger or enqueue work, but long-running ingest and analysis must not be hidden inside public read routes.
- Every ingest/normalization/valuation job must record status, timestamps, counts, source identity, and error summary.
- Failed jobs or records must have explicit retry/dead-letter state.
- Operators must be able to replay failed jobs or raw records when feasible.
- Operator actions must record actor, action type, target, timestamp, and metadata.

### 8.3 TMV Calculation

The TMV engine must:

1. Accept a candidate deal and sold comparable samples.
2. Ignore active/unsold samples for TMV.
3. Exclude samples older than the configured freshness window; default: 180 days.
4. Require at least 8 valid samples by default unless category config overrides it.
5. Remove outliers using IQR bounds.
6. Apply age weighting.
7. Prefer weighted median; use weighted mean only as a documented fallback.
8. Produce:
   - `tmv`
   - `confidence`
   - `sampleCount`
   - `volatility`
   - `liquidityScore`
   - `estimatedDaysToSell`
   - `calculatedAt`
9. Refuse to label a candidate high-confidence when TMV confidence is below threshold.

### 8.4 Deal Scoring

The scoring engine must:

- Compute expected resale value from TMV.
- Estimate fees, shipping, tax, and category-default prep/repair costs.
- Compute net profit and ROI.
- Compute a 0-100 composite Deal Score.
- Reward strong discount-to-TMV, high liquidity, and high expected profit.
- Penalize weak confidence, high volatility, stale comps, low liquidity, risky conditions, and source errors.
- Persist score results for operator dashboard rendering.

Recommended weighting for v1:

| Factor | Weight |
| --- | ---: |
| Discount to TMV / margin | 35% |
| Expected net profit | 25% |
| TMV confidence | 20% |
| Liquidity / velocity | 15% |
| Condition and risk penalty | 5% |

Weights may be tuned after operator review, but changes must be documented.

### 8.5 Operator Dashboard

The dashboard must show:

- Source health and credential status.
- Active, failed, retrying, and dead-lettered jobs.
- Total active candidates/deals.
- Number of high-score candidates.
- Estimated total profit opportunity.
- Top ranked candidates.
- Recent operator actions, replay events, or system alerts when available.

### 8.6 Candidate Queue And Detail

The queue and detail surfaces must support:

- Pagination.
- Sort by score, estimated profit, price, category, source, state, and created/synced date where supported.
- Filters for category, source, price range, score range, state, confidence, and processing issues.
- Empty, loading, error, and degraded states.
- Source link, image, price, condition, category, location, raw provenance, normalized fields, TMV, score, and risk indicators.
- Operator actions for promote, dismiss, rescore, and replay where implemented.

### 8.7 Settings / Connections

- Settings must show marketplace credential status without revealing secret values.
- Operators must see whether each source is configured, healthy, degraded, disabled, or missing credentials.
- Missing credentials must produce a setup prompt or degraded state, not app failure.

### 8.8 Deferred Reseller Features

- Watchlists, personalized alert rules, saved searches, portfolio tracking, and end-user retention loops are later expansion requirements.
- Existing auth/watchlist/alert code may remain in the repo, but it is not a Phase 1 launch gate unless used for operator safety or current compatibility.

---

## 9. API Requirements

The frontend and backend must agree on stable response shapes. Versioned routes are acceptable, but the frontend must not depend on undocumented wrappers.

### Existing / Current Frontend Contracts

These contracts are present in the current frontend client or backend route structure and should be stabilized before adding new required routes:

| Method | Path | Purpose | Phase 1 Status |
| --- | --- | --- | --- |
| `GET` | `/health` | Liveness check | Current |
| `GET` | `/ready` | DB/readiness check | Current |
| `POST` | `/api/v1/auth/register` | Register user/admin account where auth is enabled | Current compatibility |
| `POST` | `/api/v1/auth/login` | Login and receive auth tokens | Current compatibility |
| `GET` | `/api/v1/deals` | List normalized deals/candidates with filters and pagination | Current, stabilize |
| `GET` | `/api/v1/deals/:id` | Deal/candidate detail | Current, stabilize |
| `GET` | `/api/v1/deals/live/ebay` | Existing live eBay pull used by dashboard | Current but unsafe if it writes; split/gate before launch |
| `POST` | `/api/v1/deals/ingest` | Operator generic listing ingest | Current operator route |
| `POST` | `/api/v1/deals/ingest/craigslist` | Operator Craigslist ingest | Current operator route |
| `POST` | `/api/v1/deals/ingest/facebook` | Operator Facebook ingest | Current operator route |
| `POST` | `/api/v1/tmv/calculate` | Calculate TMV for a deal | Current |
| `GET` | `/api/v1/tmv/:dealId` | Fetch latest TMV result | Current |
| `POST` | `/api/v1/score` | Score a deal | Current |
| `GET` | `/api/v1/ranked` | Fetch ranked opportunities | Current |
| `GET` | `/api/v1/deal-intelligence/:dealId` | Fetch assembled deal intelligence view | Expected by frontend; verify backend contract |
| `GET` | `/api/v1/tmv/assumptions` | Fetch TMV assumptions/config | Expected by frontend; verify backend contract |
| `GET` | `/api/v1/tmv/scenarios` | List TMV scenarios | Expected by frontend; verify backend contract |
| `POST` | `/api/v1/tmv/scenarios` | Create TMV scenario | Expected by frontend; verify backend contract |
| `DELETE` | `/api/v1/tmv/scenarios/:id` | Delete TMV scenario | Expected by frontend; verify backend contract |
| `GET` | `/api/v1/connections` | Marketplace/source connection status | Current |
| `POST` | `/api/v1/connections/craigslist/sources` | Create Craigslist source config | Current frontend expectation |
| `PATCH` | `/api/v1/connections/craigslist/sources/:id` | Update Craigslist source config | Current frontend expectation |
| `DELETE` | `/api/v1/connections/craigslist/sources/:id` | Delete Craigslist source config | Current frontend expectation |
| `POST` | `/api/v1/connections/craigslist/ingest` | Run configured Craigslist ingest | Current frontend expectation |
| `POST` | `/api/v1/connections/facebook/test` | Test Facebook connection payload | Current frontend expectation |

### Planned Operator Contracts

These contracts are product-direction requirements, but they must not be treated as implemented until added and tested:

| Method | Path | Purpose | Phase 1 Status |
| --- | --- | --- | --- |
| `GET` | `/api/v1/feed` | Operator feed/candidate queue read model | Planned |
| `POST` | `/api/v1/deals/:id/hunt` | Idempotent promote/pursue action | Planned |
| `GET` | `/api/v1/deals/:id/intelligence` | Canonical detail intelligence endpoint | Planned; align with existing `/deal-intelligence/:dealId` expectation |
| `GET` | `/api/v1/sources` | Source status/config list | Planned if not covered by `/connections` |
| `GET` | `/api/v1/ingest/jobs` | Job history and failures | Planned |
| `POST` | `/api/v1/ingest/jobs/:id/replay` | Replay failed job | Planned |
| `POST` | `/api/v1/ingest/records/:id/replay` | Replay raw/dead-lettered record | Planned |
| `POST` | `/api/v1/deals/ingest/ebay` | Operator-gated eBay ingest/write path | Planned replacement for unsafe public write behavior |

Watchlist and alert endpoints may remain for compatibility, but Phase 1 does not require new reseller-facing watchlist or personalized alert behavior unless a later plan explicitly promotes them.

Response contract requirements:

- Errors must include a machine-readable code and human-readable message.
- Paginated list endpoints must include items and pagination metadata.
- Decimal money values must serialize consistently as numbers or strings; choose one and document it in frontend types.
- Frontend tests must cover API client response adaptation.
- Operator-only write routes must reject unauthenticated or unauthorized requests.

---

## 10. Data Requirements

Phase 1 data must preserve the distinction between source evidence, normalized candidates, computed valuation artifacts, and operator state.

Core entities:

- `Source`: marketplace/source definition, enablement, credential metadata, sync cadence, throttling posture, and health.
- `IngestJob`: named job type, source, status, timestamps, counts, retry/dead-letter state, and error summary.
- `IngestRecord`: raw payload, source metadata, source ID, content hash, normalization status, validation errors, and replay metadata.
- `DealCandidate`: normalized listing used for review, TMV, scoring, and operator lifecycle.
- `Deal`: promoted or persisted normalized deal record, if separate from candidate state in implementation.
- `MarketSample`: sold/completed comparable sample used by TMV.
- `TMVResult`: valuation output with confidence, sample count, volatility, and calculation metadata.
- `Score` or `ScoreResult`: profitability, velocity, risk, and composite rank artifact.
- `OperatorAction`: actor, action type, target entity, timestamp, and metadata for audit history.
- `ReplayState`: job/record replay attempts, source of replay, outcome, and error chain. This may be modeled as fields on `IngestJob`/`IngestRecord` or as a separate table.
- `DeadLetter` or equivalent error state: durable failed record/job payload with reason, retry count, and operator resolution state.
- `MarketplaceSync` or equivalent source status entity.
- `CategoryConfig`: TMV/scoring assumptions such as decay/half-life, minimum samples, freshness window, and fee/prep defaults.
- `User`: required for admin/operator auth where used.

Deferred or compatibility entities:

- `WatchlistItem`
- `Alert`
- `PortfolioItem`

Data integrity requirements:

- Source records must be unique by source and source ID where the upstream source provides stable IDs.
- Raw records must remain available for audit/replay after normalization.
- Candidate state changes must be traceable through operator actions.
- TMVResult and Score should support latest-result reads; versioning/history should be retained or planned before formula changes can alter historical meaning.
- Dead-lettered records must not be silently dropped.
- Prisma migrations must exist for schema changes before production deployment.

---

## 11. UX Requirements

- The Phase 1 UI should be an operator console, not a general reseller marketplace.
- Operator surfaces should prioritize monitoring, exception handling, review, and replay.
- Every score must be explainable in plain language and tied to source evidence.
- Candidate rows/cards should show the minimum useful operator decision set:
  - title
  - source
  - source health/provenance
  - asking price
  - TMV
  - estimated profit
  - score
  - confidence
  - state
  - processing issue or dead-letter status when present
- Detail views should show raw payload/provenance, normalized fields, TMV, score, risk indicators, and operator action history.
- Use explicit degraded states:
  - no marketplace credentials
  - no configured sources
  - no records synced yet
  - insufficient comps
  - low-confidence valuation
  - failed ingest or dead-lettered records
  - backend unavailable
- Mobile web only needs to remain usable for basic review; native apps and polished solo-user browsing are out of scope.

---

## 12. Success Metrics

### Operator Activation

- Operator configures or verifies at least one source.
- Operator sees source health and job history.
- Operator reviews at least 5 candidates from live, seeded, or fixture-backed data.

### Pipeline Quality

- Percentage of candidates with valid TMV above minimum confidence.
- Ingest failure rate below 5% per scheduled run after source configuration is valid.
- Dead-lettered records are visible and replayable.
- Median time from failed record creation to operator diagnosis.

### Safety

- No public read endpoint performs hidden DB writes.
- Operator-only write endpoints reject unauthenticated requests.
- Production/staging startup fails fast when required operator secrets are missing.
- No frontend/backend contract mismatch in CI.

### Valuation Quality

- TMV calculations with sample count >= configured threshold.
- Ranked candidates sort by persisted/computed composite score.
- Score explanations are visible for reviewed candidates.

---

## 13. Acceptance Criteria

The Phase 1 operator MVP is acceptable when:

1. The readiness gate in `docs/plans/2026-05-01-product-readiness-review-plan.md` is satisfied or explicitly marked with remaining known exceptions.
2. A fresh database can be migrated and the app can start from Docker Compose.
3. Backend build and backend tests pass with coverage thresholds intact.
4. Frontend build and frontend tests pass.
5. Public read routes do not perform hidden DB writes; write-like ingest routes are operator/admin gated.
6. Source/connection status, ingest outcomes, failed records, and degraded states are visible to operators.
7. Raw source records, normalized candidates/deals, TMV results, score results, and operator actions are persisted or explicitly planned before launch.
8. TMV calculation refuses insufficient data and produces transparent results when enough samples exist.
9. Ranked candidates/deals are sorted by persisted composite score, not raw price or unsorted fields.
10. API response shapes match frontend expectations and are covered by tests.
11. Health and readiness endpoints work in local and production-like environments.
12. No secrets are committed; all required secrets are supplied by environment variables.
13. Compose config and release checklist verification pass for the supported local stack.

---

## 14. Milestones

### Milestone 0: Baseline Repo Hygiene And Readiness Gate

Execution source of truth: `docs/plans/2026-05-01-product-readiness-review-plan.md`.

- Reconcile branch/dependency state enough that verification commands are meaningful.
- Fix backend compile blockers, including the TMV config type drift called out in the readiness plan.
- Make backend tests pass with coverage thresholds intact.
- Resolve unsafe ingest semantics where public read-looking routes perform DB writes.
- Enforce production/staging operator secret validation.
- Update stale deployment/readiness docs when verified facts change.

### Milestone 1: Contract Stabilization

- Align current frontend API client paths with backend route paths and response shapes.
- Verify existing/currently expected contracts for deals, ranked, TMV calculate/fetch, deal intelligence, TMV assumptions/scenarios, connections, and ingest operations.
- Clearly label planned but unimplemented contracts such as feed, hunt, canonical intelligence, job replay, and eBay operator ingest.
- Add/repair tests for health, readiness, deals list, deal detail, TMV, ranked deals, connections, ingest auth, and frontend API adaptation.
- Ensure Prisma migrations exist and are runnable.

### Milestone 2: Operator Data Model And Replayability

- Add or align models for source, ingest job, raw record, candidate deal, normalized deal, operator action, replay state, and dead-letter/error handling.
- Preserve raw payloads unchanged.
- Normalize into candidate/deal records only after validation.
- Add audit history for operator state changes.
- Add integration coverage for persistence and replay/dead-letter lifecycle.

### Milestone 3: TMV Correctness

- Ensure sold-only sample filtering.
- Implement or verify weighted median with documented fallback.
- Validate IQR outlier rejection, age weighting, confidence, liquidity, estimated days-to-sell, and sample thresholds with unit tests.
- Document category/source config defaults.

### Milestone 4: Scoring And Ranking

- Unify TMV/score route logic through one service path.
- Persist score records.
- Verify ranked ordering by composite score.
- Display score explanations in operator review UI.

### Milestone 5: Multi-Source Ingest And Operator Safety

- Validate active listing ingest from configured sources.
- Validate sold/completed comparable sample ingestion where supported.
- Store source sync status, failures, and dead-letter state.
- Gate write-like ingest operations with operator/admin auth.
- Add degraded UI for missing credentials or source API failures.

### Milestone 6: Operator Console MVP

- Make the operator dashboard/candidate queue the canonical Phase 1 surface.
- Render source health, job status, dead letters, top ranked candidates, and review actions.
- Wire candidate detail to real backend data and deal intelligence/adaptation contracts.
- Add frontend tests for dashboard, queue, detail degraded state, and navigation.

### Milestone 7: Production Readiness

- Run release checklist.
- Verify Docker production compose behavior.
- Confirm migrations run through the production workflow.
- Confirm read-only/runtime hardening where practical.
- Document known limitations and rollback path.

### Later Expansion: Reseller Workflows

- Complete solo-user onboarding and public browsing UX.
- Promote watchlists, saved filters, portfolio, and personalized alerts into launch scope only after the operator MVP is stable.
- Add immediate or digest email behavior based on a separate expansion plan.

---

## 15. Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Backend build/test blockers remain unresolved | Product work stacks on an unstable base | Treat readiness plan Milestone 0 as mandatory gate |
| Public read routes mutate DB state | Unsafe launch surface | Split preview/read routes from operator-only ingest/write routes |
| Source-specific logic leaks into shared models | Bad normalization and scoring drift | Preserve raw records, isolate adapters, and normalize through explicit services |
| Job failures disappear without replay | Operators cannot recover automation | Persist job state, errors, dead letters, and replay attempts |
| TMV/scoring route logic diverges | Inconsistent valuation behavior | Use one service path and contract tests |
| Formula changes silently alter meaning | Operators cannot audit historical decisions | Version assumptions/results or document latest-only limitations before launch |
| Frontend/backend contract drift | Broken operator UI | Type contracts, API client tests, and route integration tests |
| Scope drifts into reseller OS features | Slow delivery | Keep watchlists, portfolio, personalized alerts, inventory, fulfillment, and ML out of Phase 1 |

---

## 16. Open Questions

1. Which source adapters are mandatory for the first operator MVP smoke: Craigslist, Facebook, eBay, or a fixture-backed source plus one live source?
2. Should the canonical detail intelligence route be `/api/v1/deal-intelligence/:dealId` for current frontend compatibility or `/api/v1/deals/:id/intelligence` for planned domain consistency?
3. Should money values serialize as strings to preserve Decimal precision, or as numbers for frontend simplicity?
4. What operator states should be final for Phase 1: `new`, `reviewed`, `dismissed`, `promoted`, `archived`, `failed`, or a smaller set?
5. What minimum confidence threshold should hide a candidate from ranked operator views?
6. Which replay actions are required at launch: replay job, replay raw record, rescore candidate, or all three?

---

## 17. Current Repository Alignment Notes

As of this draft, the repository already contains a Node/Express/Prisma backend, React/Vite frontend, Docker assets, health/readiness routes, auth/watchlist/alert-related models, TMV/scoring domain modules, connections/settings surfaces, ingest routes, and deal/calculator UI surfaces.

Known alignment priorities before treating Phase 1 as complete:

- Follow `docs/plans/2026-05-01-product-readiness-review-plan.md` for readiness sequencing.
- Confirm Prisma migrations match the current schema.
- Align frontend API paths and response shapes with backend routes.
- Keep existing/currently expected frontend contracts documented while marking planned endpoints as planned.
- Ensure ranked sorting uses persisted/computed composite score.
- Ensure TMV uses sold-only samples and weighted median behavior.
- Wire scoring through one API/service route path.
- Split or gate unsafe live ingest routes before launch.
- Add explicit source/job/raw-record/candidate/operator-action/replay/dead-letter persistence before claiming operator readiness.
- Verify production compose files and release checklist.
