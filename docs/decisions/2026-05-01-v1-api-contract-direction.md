# Deal Hunter v1 API Contract Direction

Status: proposed
Owner: jnibarger01
Last updated: 2026-05-01

## Context

Deal Hunter is moving toward an operator-first MVP with multi-source ingest,
deal review, TMV/scoring, replay/auditability, and safe automation. The current
API surface is partially versioned and partially compatibility-oriented, and the
frontend still references some backend routes that are missing or not yet stable.

This decision record documents the preferred v1 API contract direction before
implementation. It does not authorize route removal, frontend rewrites, or
response-shape migration by itself.

## Decision

Preserve `/api/v1` as the canonical API prefix. Keep public read routes
read-only, and require operator/admin auth for every route that writes, mutates,
ingests, persists, recalculates, stores secrets, or changes operator-controlled
state.

Prefer raw resource success responses for the future contract, with structured
error responses:

```json
{
  "error": {
    "code": "INSUFFICIENT_SAMPLES",
    "message": "TMV requires more sold samples",
    "details": {
      "found": 2,
      "required": 5
    }
  }
}
```

Response-shape normalization is a separate future migration. Current mixed raw
and wrapped responses must stay compatible until backend and frontend contract
tests prove the migration is safe.

## Response Shape

Preferred success shape:

- Return the resource or collection payload directly.
- Use HTTP status for success/failure semantics.
- For paginated collections, include pagination metadata as part of the
  collection resource, not as a generic `{ success, data }` envelope.

Preferred error shape:

- Use `{ error: { code, message, details } }`.
- `code` is stable and `SCREAMING_SNAKE_CASE`.
- `message` is human-readable and may change.
- `details` is optional structured data for validation errors, preconditions,
  and diagnostics safe to expose.

Migration risk:

- Existing backend routes currently mix raw and wrapped responses.
- Existing frontend callers may unwrap `data.data`, read raw arrays, or expect
  route-specific error shapes.
- Normalization should be implemented only after route inventory and tests cover
  the current behavior.

## Route Shape

Canonical path prefix:

- Keep `/api/v1`.
- Do not drop versioning for v1.

Ranked deals:

- Current `/api/v1/ranked` can remain during compatibility.
- Preferred long-term shape is `GET /api/v1/deals?sort=rank` with explicit
  filters such as `limit`, `offset`, and confidence/risk thresholds.
- Do not remove `/ranked` until frontend and smoke tests pass through the new
  list contract.

Scoring:

- Current `POST /api/v1/score` with `{ dealId }` can remain during
  compatibility.
- Preferred long-term shape is deal-scoped, such as
  `POST /api/v1/deals/:id/score`, because the score belongs to a deal.
- All scoring writes must require operator/admin auth.

TMV:

- TMV assumptions and TMV scenarios should live under `/api/v1/tmv/*` because
  they are TMV workflow resources, not individual deal fields.
- Deal-specific TMV results may be exposed as deal-scoped resources, such as
  `GET /api/v1/deals/:id/tmv` and `POST /api/v1/deals/:id/tmv`.
- Missing frontend-backed TMV routes are product-readiness blockers until they
  are implemented or the frontend sections are disabled.

Deal intelligence:

- Preferred long-term route is `GET /api/v1/deals/:id/intelligence`.
- Existing or proposed flat `GET /api/v1/deal-intelligence/:id` should be
  treated as compatibility/planned surface only.
- Missing frontend-backed deal intelligence route support is a product-readiness
  blocker until implemented or removed from the frontend flow.

## Auth And Mutation Rules

- Write routes must require operator/admin auth in v1.
- Auth is not deferred to a later version.
- Public read routes must not mutate database state.
- Live eBay preview and persistence must remain separate:
  - `GET` preview routes may fetch and return external data but must not
    persist records.
  - `POST` ingest/persist routes may write records but must require
    operator/admin auth.
- Connection and secret-management routes are operator/admin surfaces.
- TMV calculation and score calculation persist derived records, so they are
  write routes.

## Product-Readiness Blockers

These frontend-backed contracts must be tracked before claiming the Calculator
or DealDetail flows are functional:

- `GET /api/v1/tmv/assumptions`
- `GET /api/v1/tmv/scenarios`
- `POST /api/v1/tmv/scenarios`
- `DELETE /api/v1/tmv/scenarios`
- Deal intelligence, preferably `GET /api/v1/deals/:id/intelligence`

These blockers may predate the security/write-route work. They do not block a
focused security fix, but they do block product-readiness claims.

## Rejection Record

Rejected: keeping mixed wrappers forever.

Reason: it permanently doubles frontend typing and error handling paths. Mixed
contracts should be tolerated only as a migration state.

Rejected: dropping `/api/v1`.

Reason: versioning is cheap and useful for future consumers such as automation,
MCP servers, and agent workflows.

Rejected: making flat RPC-style endpoints the final shape.

Reason: route shape should converge toward resources and resource actions where
that improves clarity. Compatibility routes may remain during migration.

Rejected: deferring write auth to a later API version.

Reason: operator-first v1 requires safe ingest, persistence, calculation, and
secret-management semantics now.

Rejected: adopting RFC 7807 immediately.

Reason: the simpler `{ error: { code, message, details } }` contract is enough
for v1 and easier to migrate incrementally. RFC 7807 can be revisited later if
external API consumers require it.

## Migration Plan

1. Inventory current backend routes, frontend callers, response shapes, auth
   requirements, and compatibility aliases.
2. Add tests around current behavior before changing route or response shapes.
3. Add missing frontend-backed backend contracts or disable the frontend
   sections that call guaranteed 404 routes.
4. Migrate backend contract behavior behind tests.
5. Update the frontend API client to use the canonical route and response
   shapes.
6. Keep old routes as compatibility aliases until compatibility tests and smoke
   tests pass.
7. Remove old routes only after the new contract is covered and the frontend no
   longer depends on compatibility paths.

## Unresolved Questions

- What compatibility window is acceptable for `/api/v1/ranked`,
  `/api/v1/score`, and any flat deal-intelligence path?
- Should ranked deal responses eventually be a paginated `{ items, total,
  limit, offset, next_offset }` resource?
- Which error codes should be part of the stable v1 public contract?
- Should frontend mock fallbacks be disabled globally or only for production
  builds once the missing contracts are implemented?
