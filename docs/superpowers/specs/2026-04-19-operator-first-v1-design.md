# Deal Hunter Operator-First V1 Design

## Overview
Deal Hunter should evolve into an operator-first control plane for automated marketplace ingest, valuation, scoring, and alerting. The system must support multi-source ingest from day one, prioritize full automation in the MVP path, and preserve clean internal boundaries so later scale-driven service extraction remains possible.

This design assumes a phased roadmap:
- Phase 1: operator-first MVP
- Phase 2: stabilization and hardening
- Phase 3: broader user-facing expansion

The recommended architecture is a modular monolith built on the existing repository shape: React/Vite frontend, Express/Prisma backend, and Postgres as the system of record.

## Goals
- Ingest listings from multiple external sources continuously
- Normalize source-specific payloads into a shared candidate model
- Compute TMV and ranking automatically
- Trigger alerts based on operator-defined thresholds
- Provide an operator console for monitoring, replay, review, and override workflows
- Keep deployment and operations simple for MVP while preserving future extraction seams

## Non-Goals
- End-user marketplace or buyer-facing workflows in the MVP
- Early microservice decomposition
- Replacing Postgres with a distributed event backbone in phase one

## Recommended Architecture
The system should remain a single deployable backend for MVP, but with explicit internal boundaries:

- `Ingest Core`: source adapters, fetch orchestration, raw record persistence, normalization, and deduplication
- `Valuation Core`: TMV calculation, score calculation, ranking, and scenario management
- `Automation Core`: scheduling, retries, job locks, dead-letter handling, and alert dispatch
- `Operator API`: request/response surface for source controls, candidate review, valuation controls, alerts, and system status
- `Platform Core`: auth, roles, audit logging, config, readiness/health, and deployment support

The frontend should act as an operations console rather than a general marketplace UI. The backend should own both HTTP APIs and background job orchestration during phase one, but no long-running processing should occur inline inside request handlers.

## Core Data Model
The data model should separate immutable source evidence from normalized, operator-visible business objects.

### Primary entities
- `Source`: source definition, enablement state, schedule config, credentials metadata, and throttling posture
- `IngestJob`: scheduled or manually triggered run with status, timestamps, counts, and error summary
- `IngestRecord`: raw fetched payload, source metadata, normalization status, and content hash
- `DealCandidate`: normalized listing used across review, TMV, scoring, and alerting
- `MarketSample`: comparable market records used by TMV
- `TMVResult`: valuation output with confidence, sample count, volatility, and calculation metadata
- `ScoreResult`: profitability, velocity, risk, and composite rank
- `AlertEvent`: triggered automation output such as high-rank opportunities or repeated source failures
- `OperatorAction`: audit trail for state changes, overrides, dismissals, rescoring, and replay actions
- `SystemConfig`: thresholds, polling cadence, feature flags, alert routing, and source-specific settings

### Modeling rules
- Preserve raw payloads unchanged in `IngestRecord`
- Normalize into `DealCandidate` only after validation
- Use stable dedupe keys such as `(source, sourceId)` plus payload hashing for change detection
- Treat TMV and scoring outputs as versionable artifacts even if the UI only shows the latest version initially
- Keep financial values in numeric database types and convert only at API boundaries
- Make operator state explicit: `new`, `reviewed`, `dismissed`, `promoted`, `archived`

### Candidate lifecycle
1. Source adapter fetches payloads into `IngestRecord`
2. Normalizer validates and converts records into `DealCandidate`
3. TMV engine computes `TMVResult` when enough sample data exists
4. Scoring engine computes `ScoreResult`
5. Rules engine creates `AlertEvent`
6. Operator actions update state and write `OperatorAction`

## API Boundaries
The backend should expose domain-oriented APIs rather than one generic CRUD layer.

### Operator-facing domains
- `sources`: source status, enable/disable, polling config, credentials health, and force-run actions
- `ingest`: recent jobs, failures, replay, backfill, and job metrics
- `candidates`: filtered normalized deals, lifecycle transitions, provenance, and review detail
- `valuation`: TMV assumptions, scenario management, recalculation, and score detail
- `alerts`: triggered events, acknowledgement, suppression, and escalation state
- `system`: health, readiness, audit history, feature flags, and automation metrics

### Internal service seams
- `SourceAdapter`
- `Normalizer`
- `ValuationService`
- `ScoringService`
- `AlertingService`
- `JobCoordinator`

These seams should exist as modules now so they can later move into separate worker or service processes without rewriting business rules.

## Job Orchestration
The MVP should use named background job types:
- `poll-source`
- `normalize-records`
- `hydrate-market-samples`
- `calculate-tmv`
- `calculate-score`
- `dispatch-alerts`
- `cleanup-retention`

Each job should write durable state: `queued`, `running`, `succeeded`, `failed`, `retrying`, `dead-lettered`.

### Rules
- Request handlers enqueue or signal work; they do not run full ingest pipelines inline
- Job execution must be idempotent using source identity and job-run keys
- Failures require per-source backoff and operator-visible summaries
- Dead-lettered records must support replay from the operator console

## Operator Console Design
The frontend should be organized around monitoring and exception handling.

### Primary surfaces
- `Overview`: source health, active jobs, alert counts, and top-ranked candidates
- `Source Management`: enablement, cadence, credentials posture, last success, and replay controls
- `Candidate Queue`: filters by source, state, confidence, rank, and processing issues
- `Deal Review`: raw payload, normalized fields, TMV, scoring, and action history
- `TMV/Scoring Controls`: thresholds, scenarios, and rescoring tools
- `Alerts & Exceptions`: dead letters, repeated failures, acknowledgements, and suppression
- `Audit & Config`: feature flags, notification targets, and operator change history

### Frontend structure
The current SPA should evolve toward domain-based modules:
- `pages/ops/*`
- `components/source/*`
- `components/queue/*`
- `components/alerts/*`
- `components/system/*`
- `api/` split by backend domain instead of a single broad client

## Phased Delivery

### Phase 1: MVP
- Multi-source ingest adapters
- Normalized candidate pipeline
- Automated TMV and scoring
- Alert generation
- Operator dashboard and candidate review queue
- Audit trail, job history, health/readiness

### Phase 2: Stabilization
- Better retry and dead-letter recovery
- Richer diagnostics and replay tooling
- Stronger role separation and config hardening
- Queue and ranking performance tuning
- Optional split of worker execution from HTTP process if load justifies it

### Phase 3: Expansion
- End-user workflows separate from operator console
- Portfolio, watchlist, and user-specific alerts
- Additional marketplace adapters and regional tuning
- Reporting and source-quality analytics

## Testing Strategy
- `Domain tests`: TMV, scoring, dedupe, alert rules
- `Service tests`: adapters, normalization, orchestration modules
- `Integration tests`: API, Prisma, and job coordination against Postgres
- `UI tests`: queue filtering, review flows, operator actions
- `Contract tests`: adapter fixtures to catch marketplace schema drift

Testing should emphasize deterministic domain logic and repeatable source fixtures, while keeping database-backed integration coverage focused on orchestration and persistence boundaries.

## Key Risks
- Source-specific logic leaking into shared candidate or valuation models
- Long-running job execution blocking API responsiveness
- Formula changes silently changing historical meaning
- Weak observability hiding automated failures
- Operator UI degrading into generic CRUD instead of a focused control plane

## Recommendation
Adopt a modular-monolith control-plane architecture for the MVP. Keep adapters, orchestration, valuation, and operator workflows explicitly separated inside the current repository. This gives the team a fast path to a working automated system without prematurely paying the cost of distributed services.
