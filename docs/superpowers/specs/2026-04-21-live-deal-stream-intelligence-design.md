# Deal Hunter Live Deal Stream And Intelligence Design

## Overview
This spec defines the first product-facing discovery slice for Deal Hunter as a screenshot-first operator experience. The app should center on a live ranked deal stream, a rich deal intelligence detail page, and real first-pass pages for watchlist, portfolio, and alerts.

The goal is to make the product feel like a purpose-built flipping terminal rather than a generic dashboard. The feed becomes the entry point, the deal detail page becomes the analytical workspace, and the surrounding sections support the operator workflow without trying to solve the full platform in one pass.

## Goals
- Replace the current dashboard-first frontend with a live discovery shell that matches the provided visual direction
- Make feed cards and detail pages fully data-driven in the first pass
- Support a detail intelligence experience with both factual metrics and AI-generated narrative modules
- Make `Feed`, `Watchlist`, `Portfolio`, and `Alerts` real navigable sections in the first slice
- Record `Hunt` as a real user action that opens the detail page and marks the deal as actively pursued
- Preserve existing backend/domain seams while adding focused discovery and intelligence APIs

## Non-Goals
- Full workflow depth for resale operations, notifications, or portfolio accounting beyond first-pass utility
- Reworking the ingest architecture beyond the data required to support this slice
- Making every narrative block purely deterministic in phase one
- Building a full multi-user collaboration or permissions system in this slice

## Recommended Approach
Use a vertical slice approach.

The feed and deal detail experience should receive the most product and engineering attention because they define the identity of the platform. `Watchlist`, `Portfolio`, and `Alerts` must all be real pages in this slice, but they can be narrower and more operational than the flagship feed/detail loop.

This approach balances three needs:
- the UI needs to look and feel like the screenshot direction
- the detail view needs real intelligence payloads rather than mock content
- the rest of the product shell must exist as real routes and queries without turning this slice into a platform-wide rewrite

## Product Architecture

### Primary user flow
1. User lands on `Feed`
2. User searches, filters, and scans ranked opportunities
3. User clicks a card or clicks `Hunt`
4. App opens the deal detail page
5. If `Hunt` was clicked, the backend records the deal as actively pursued in the same action flow
6. User reviews intelligence modules, evidence, risks, and recommendations
7. User can later see the deal reflected in `Watchlist`, `Portfolio`, or `Alerts` depending on state and system activity

### Frontend surfaces
- `Feed`: live deal stream, ranking controls, and primary discovery UI
- `Deal Detail`: two-column intelligence workspace for a single opportunity
- `Watchlist`: deals the operator is tracking or pursuing
- `Portfolio`: acquired inventory and performance tracking
- `Alerts`: triggered opportunity and risk notifications

### Backend responsibilities
- Assemble feed-ready deal rows from real ranked deal data
- Expose a single detail intelligence payload that combines hard metrics with cached narrative modules
- Persist operator actions like `Hunt`
- Query stateful lists for watchlist, portfolio, and alerts
- Refresh or generate narrative intelligence when the detail page is opened and cache is stale or missing

## UX Design Direction

### Shell
The application should adopt the dark terminal-style product shell shown in the screenshots:
- left sidebar navigation with `Feed`, `Watchlist`, `Portfolio`, and `Alerts`
- top utility/search bar with marketplace/category filtering, location, and sort controls
- dense but readable cards with strong emphasis on score, TMV, and estimated profit
- consistent use of chips, panels, and ranked indicators to keep the product feeling like a trading terminal for flippers

### Feed
The `Feed` page should become the default landing route and visually mirror the provided reference:
- primary title such as `Live Deal Stream`
- subtitle indicating scan region or feed context
- search input for deal title and keyword matching
- controls for marketplace/category, location, and sort order
- feed cards arranged in a responsive grid

Each card should show:
- marketplace/source chip
- category chip
- hero image
- deal score
- title
- list price
- TMV or market value reference
- location and recency metadata
- estimated profit
- `Hunt` action

### Deal Detail
The detail view should follow the two-column screenshot direction.

Left column:
- back-to-feed affordance
- hero image
- title
- list price
- market value
- ROI
- description
- source, condition, and location chips

Right column:
- prominent `Deal Intelligence` heading and score
- stacked intelligence modules rendered from real API data

Required intelligence modules in the first pass:
- repair analysis
- market dynamics
- comparable evidence
- negotiation AI
- sourcing notes
- risks
- recommended next action

## Data And Behavior

### Feed behavior
- Feed rows come from real deal records, not mock data
- Search and filter controls operate on real API query parameters
- Card click opens the detail route for that deal
- `Hunt` opens the same detail route and records the deal as `pursued`
- `Hunt` must be idempotent so repeated clicks do not create duplicate transitions

### Detail behavior
- The detail route should load a single assembled payload for both columns
- Hard metrics must come from real persisted facts: deal fields, TMV, score, comparable evidence, and tracked status
- Narrative modules must come from Gemini over structured inputs derived from those facts
- If no current intelligence artifact exists, the backend should generate one on open
- If a cached artifact exists but is stale relative to source facts, the backend should refresh it
- The page should still render when narrative generation fails, using factual content and degraded narrative states

### Watchlist behavior
- Real route and real data source in the first slice
- Contains deals in tracked states such as `watching` and `pursued`
- Supports reopening deal detail quickly
- Uses the same visual language as feed cards or a compatible compact list form

### Portfolio behavior
- Real route and real data source in the first slice
- Contains acquired inventory and disposition tracking
- First-pass fields should include purchase cost, estimated resale value, realized profit where applicable, and status
- It is acceptable for this first slice to be operationally useful rather than fully accountant-grade

### Alerts behavior
- Real route and real data source in the first slice
- Contains system-triggered alert entries such as high-score opportunities, stale pursued deals, or meaningful risk changes
- Alert rows should link back to deal detail

## Intelligence Generation Model

### Hybrid generation strategy
The first pass should use a hybrid model:
- hard numbers and evidence are computed from rules, scoring outputs, TMV, comps, and stored deal facts
- Gemini turns that structured payload into operator-facing narrative modules

### Lifecycle
1. Background ingest or processing computes core facts such as score, TMV, and comparable evidence inputs
2. User opens the detail page
3. Backend checks for an existing intelligence artifact
4. If the artifact is missing or stale, the backend generates refreshed narrative modules from the latest structured facts
5. Backend stores the generated artifact and serves it with timestamps and source-version metadata
6. Frontend renders factual modules immediately and narrative modules from the returned artifact

### Freshness rules
An intelligence artifact should be considered stale when any of these change materially:
- deal source fields used in intelligence inputs
- TMV result version
- score result version
- comparable evidence snapshot
- tracked status relevant to negotiation or next-action recommendations

## Data Model Additions

### Deal state
Add or formalize a tracked deal state model that supports at least:
- `watching`
- `pursued`
- `acquired`
- `sold`
- `passed`

This state model should support the feed action flow, watchlist queries, portfolio membership, and alert generation.

### Intelligence artifact
Add a persisted `deal_intelligence` artifact or equivalent model with:
- deal identifier
- input snapshot or source-version metadata
- generation status
- generated-at timestamp
- last-verified or freshness timestamp
- structured narrative modules payload
- error metadata for failed generations

### Comparable evidence
Persist enough comparable evidence detail to support the detail page directly. The detail API should not rely on transient in-memory evidence that cannot be explained or re-rendered later.

### Alerts
Persist alert events with enough structure to support:
- alert type
- related deal
- status such as active or acknowledged
- summary text
- created-at timestamp

## API Design

### Recommended endpoints
- `GET /api/v1/feed`
- `GET /api/v1/deals/:id/intelligence`
- `POST /api/v1/deals/:id/hunt`
- `GET /api/v1/watchlist`
- `GET /api/v1/portfolio`
- `GET /api/v1/alerts`

### Endpoint expectations

#### `GET /api/v1/feed`
Returns feed-ready deal cards with support for search, filter, location, and sort parameters. The response should include all fields needed to render the screenshot-style card without requiring follow-up calls.

#### `GET /api/v1/deals/:id/intelligence`
Returns a single assembled payload for the detail page containing:
- primary deal facts
- TMV and scoring metrics
- comparable evidence
- tracked state
- intelligence module payloads
- generation/freshness metadata

This endpoint is the main contract for the detail page and should hide backend assembly complexity from the frontend.

#### `POST /api/v1/deals/:id/hunt`
Marks the deal as actively pursued and returns the updated deal state. The action must be safe to repeat.

#### `GET /api/v1/watchlist`
Returns tracked or pursued deals in a feed-compatible or list-compatible shape.

#### `GET /api/v1/portfolio`
Returns acquired inventory with first-pass profitability fields.

#### `GET /api/v1/alerts`
Returns triggered alert entries with linkable deal references.

## Error Handling
- If intelligence generation fails, the detail endpoint must still return factual data and a recoverable degraded module state
- The frontend should render stable cards and panels rather than failing the whole page when one narrative block is unavailable
- Feed and list routes should tolerate empty-state conditions cleanly
- `Hunt` should return the existing pursued state if the deal was already marked pursued

## Testing Strategy

### Backend
- integration coverage for `GET /feed`
- integration coverage for `POST /deals/:id/hunt`
- integration coverage for `GET /watchlist`, `GET /portfolio`, and `GET /alerts`
- integration or service coverage for intelligence assembly
- degraded-path test where Gemini generation fails but factual detail still returns successfully

### Frontend
- route tests for feed rendering and navigation to detail
- detail page tests for factual metrics and intelligence module rendering
- route smoke tests for watchlist, portfolio, and alerts pages
- interaction test for `Hunt` opening detail and reflecting pursued state

## Risks
- The screenshot fidelity goal could push the frontend toward one-off styling unless shared shell and card patterns are defined early
- Intelligence narratives can drift from hard numbers if freshness/versioning rules are weak
- The first-pass nav breadth can slow delivery if watchlist, portfolio, and alerts are allowed to expand beyond narrow operational scope
- Comparable evidence quality may become the limiting factor on the perceived credibility of the intelligence modules

## Recommendation
Implement this slice as a screenshot-first vertical product slice. Make the feed and deal detail flow the flagship experience, back the intelligence view with real facts plus cached Gemini narratives, and keep watchlist, portfolio, and alerts real but tightly scoped. This produces a believable first version of the Bloomberg Terminal for Flippers without overcommitting to platform depth in every surrounding workflow.
