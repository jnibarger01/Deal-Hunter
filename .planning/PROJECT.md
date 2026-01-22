# Deal-Hunter

## What This Is

Deal-Hunter is a deal discovery and valuation platform that ingests marketplace listings (starting with eBay), computes True Market Value (TMV) using sold comps, scores opportunities by profit potential and risk, and surfaces ranked deals to users via a dashboard with smart alerts. Multi-user platform for resellers and flippers.

## Core Value

Identify underpriced listings by computing accurate True Market Value from real sold data — the TMV Engine is the core differentiator.

## Requirements

### Validated

(None yet — ship to validate)

### Active

#### Data Ingestion
- [ ] eBay active listings ingestion via official APIs
- [ ] eBay sold/completed listings ingestion for TMV calculation
- [ ] Location-aware search (city, radius)
- [ ] Category filtering (Automotive, Tech & Electronics, TVs & Speakers, Tools, Gaming)

#### TMV Engine
- [ ] Discard samples outside freshness window (default 180 days)
- [ ] IQR-based outlier rejection (Q1 - 1.5×IQR to Q3 + 1.5×IQR)
- [ ] Exponential decay weighting by sample age
- [ ] Category velocity modifies decay rate
- [ ] Weighted median calculation (fallback to weighted mean)
- [ ] Confidence score (0.0-1.0) based on sample count, volatility, recency
- [ ] Liquidity score from sales velocity
- [ ] Estimated days-to-sell from historical velocity
- [ ] Minimum sample threshold (default 8) — no TMV without sufficient data

#### Scoring & Detection
- [ ] Under-market detection (flag listings 30%+ below TMV)
- [ ] Deal Score (0-100) weighted algorithm: price vs market, demand velocity, brand desirability, condition, repair difficulty, resale margin
- [ ] Profit estimator: purchase price → category-default repair cost → fees (eBay, shipping, tax) → resale value → net profit

#### User System
- [ ] Multi-user authentication
- [ ] User registration and login

#### Dashboard & UX
- [ ] Live deals feed
- [ ] Sort by profit, deal score, category, distance
- [ ] Filter by category, location, price range
- [ ] One-click save to watchlist
- [ ] Watchlist management

#### Alerts
- [ ] Smart alerts for high Deal Score items
- [ ] Alert triggers: specific brands, categories, price thresholds
- [ ] Push notifications
- [ ] Email notifications
- [ ] SMS notifications

### Out of Scope

- Craigslist connector — Phase 2, best-effort where permitted
- Facebook Marketplace connector — Phase 2, requires extension or provider (no official API)
- Repair intelligence engine — Phase 2
- Price negotiation AI — Phase 2
- Flip playbooks — Phase 2
- Portfolio tracking — Phase 2
- ML/prediction models — explicit non-goal, statistical inference only
- Scraping/headless browsers — explicit non-goal, APIs only
- SSR — v1 is static SPA
- Premature scaling abstractions — keep it simple

## Context

**Prior state:** Repository was corrupted (file corruption, tool injection, invalid encodings). This is a greenfield rebuild with zero trust in existing code.

**Design philosophy:** System is designed to be disposable. If corruption occurs: repo is nuked, database survives, images rebuilt clean. Deletion is a feature, not a failure.

**Data sources (v1):**
- eBay Browse API for active listings
- eBay Marketplace Insights / completed listings API for sold comps
- Google Maps API for location services

**TMV Engine specifics:**
- Never use raw averages — always trimmed/weighted
- Recent data weighted higher than old data
- Confidence required for ranking — low confidence results excluded
- Hard minimum of 8 samples for TMV calculation

## Constraints

- **Tech Stack (LOCKED)**: Node.js 20 LTS, TypeScript strict mode, Express, Prisma ORM, PostgreSQL 16, React 18, Vite — no substitutions
- **Deployment**: Docker only, no local Node installs required, secrets via env only
- **Repo Layout**: Mandated structure with separate server/ and frontend/ directories, no shared root tsconfig
- **Build**: npm ci only, locked package-lock.json, multi-stage Docker builds, Prisma codegen is only allowed build-time generation
- **Security**: .gitattributes enforces LF + UTF-8, read-only containers, health checks mandatory

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| eBay APIs first, other sources Phase 2 | Official APIs are reliable; Craigslist/FB require workarounds | — Pending |
| Category-default repair costs | Simpler than user entry or AI estimation for v1 | — Pending |
| Weighted median over mean | More robust to outliers in price data | — Pending |
| No ML in v1 | Statistical inference sufficient; ML adds complexity without proven need | — Pending |
| Docker-only deployment | Deterministic builds, no "works on my machine" | — Pending |

---
*Last updated: 2026-01-22 after initialization*
