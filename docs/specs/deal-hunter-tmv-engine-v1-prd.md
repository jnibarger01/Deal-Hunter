# Product Requirements Document (PRD)

## Project

**Deal-Hunter — TMV Engine v1**

## Author

Senior Systems Architect

## Audience

Engineering, DevOps, Product, AI Code Agents

## Status

Greenfield Rebuild (Post-Corruption Reset)

---

## 1. Executive Summary

Deal-Hunter is a deal discovery and valuation platform that ingests marketplace listings, normalizes them, computes a **True Market Value (TMV)**, and ranks opportunities based on profitability, liquidity, and risk.

This document defines a **from-scratch, production-ready rebuild** of the system, with **TMV Engine v1** as the core differentiator.

The prior repository is considered **irrecoverably compromised**. This rebuild assumes:

* Zero trust in existing code
* Deterministic builds
* Explicit boundaries
* Disposable infrastructure

---

## 2. Core Objectives

### 2.1 Business Objectives

* Identify **underpriced listings** relative to real market behavior
* Rank deals by **profit margin, speed to sell, and risk**
* Enable future arbitrage and automation workflows

### 2.2 Engineering Objectives

* Deterministic, reproducible builds
* No hidden state or side effects
* TMV logic isolated and testable
* Simple architecture that can be deleted and rebuilt at any time

### 2.3 Explicit Non-Goals (v1)

* No scraping arms race
* No headless browsers
* No ML models
* No price prediction beyond statistical inference
* No premature scaling abstractions

---

## 3. System Architecture (High Level)

```
┌─────────────┐
│  Frontend   │  React + Vite (Static SPA)
└─────┬───────┘
      │ REST API
┌─────▼───────┐
│ API Server  │  Node.js + TypeScript
│ (Stateless)│
└─────┬───────┘
      │ Prisma ORM
┌─────▼───────┐
│ PostgreSQL  │
└─────────────┘
```

### Hard Architectural Rules

* Frontend **never** talks directly to marketplaces
* Frontend **never** talks directly to the database
* TMV Engine lives **entirely in backend domain layer**
* Database is the only persistent state

---

## 4. Repository Layout (MANDATORY)

```
deal-hunter/
├── docker/
│   ├── server.Dockerfile
│   ├── frontend.Dockerfile
│   └── nginx.Dockerfile
│
├── docker-compose.yml
├── docker-compose.staging.yml
├── docker-compose.prod.yml
│
├── server/
│   ├── src/
│   │   ├── app.ts
│   │   ├── index.ts
│   │   ├── config/
│   │   │   ├── env.ts
│   │   │   ├── prisma.ts
│   │   │   └── logger.ts
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── domain/
│   │   │   ├── deal.ts
│   │   │   ├── tmv.ts
│   │   │   └── score.ts
│   │   └── utils/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── tests/
│   ├── tsconfig.json
│   └── package.json
│
├── frontend/
│   ├── src/
│   ├── index.html
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── package.json
│
├── .editorconfig
├── .gitignore
├── .gitattributes
└── README.md
```

### Enforcement Rules

* No shared root `tsconfig.json`
* Each runtime owns its configuration
* No cross-runtime imports

---

## 5. Technology Choices (LOCKED)

### Backend

* Node.js 20 LTS
* TypeScript (strict mode ON)
* Express
* Prisma ORM
* PostgreSQL 16

### Frontend

* React 18
* Vite
* TypeScript
* No SSR in v1

### Infrastructure

* Docker only
* No local Node installs required
* `.env.example` files only
* Secrets via environment variables only

---

## 6. Core Data Model

### Deal

Represents a candidate listing.

```
Deal {
  id
  source
  sourceId
  title
  price
  condition
  category
  location
  url
  createdAt
}
```

### MarketSample

Represents a historical sold price.

```
MarketSample {
  id
  dealId
  observedPrice
  observedAt
  source
}
```

### TMVResult

Represents computed market valuation.

```
TMVResult {
  dealId
  tmv
  confidence
  sampleCount
  volatility
  liquidityScore
  estimatedDaysToSell
  calculatedAt
}
```

### Score

Represents ranking output.

```
Score {
  dealId
  profitMargin
  velocityScore
  riskScore
  compositeRank
}
```

---

## 7. TMV Engine v1 (CORE SPEC)

### 7.1 Inputs

* MarketSample[] (sold listings only)
* Category velocity configuration
* Freshness window (default: 180 days)
* Minimum sample threshold (default: 8)

### 7.2 Pre-Processing Rules

1. **Discard unsold listings**
2. **Discard samples outside freshness window**
3. **Group samples by category**
4. **Reject outliers using IQR**

   * Q1, Q3
   * Remove values outside `Q1 − 1.5×IQR` and `Q3 + 1.5×IQR`

### 7.3 Weighting Logic

* Apply **exponential decay** to samples based on age
* Recent sales weigh more than older ones
* Category velocity modifies decay rate

Example:

```
weight = e^(−decayRate × daysOld)
```

### 7.4 TMV Calculation

* Weighted median (preferred) or weighted mean (fallback)
* Never use raw averages

### 7.5 Confidence Score (0.0 – 1.0)

Confidence is derived from:

* Sample count
* Price dispersion (volatility)
* Recency distribution

Low samples or high volatility → low confidence

### 7.6 Liquidity & Time-to-Sell

* Liquidity Score derived from:

  * Number of sales per time window
  * Median days between sales
* Estimated Days to Sell computed from historical velocity

### 7.7 Hard Rules

* TMVResult **must not** be produced if:

  * sampleCount < minimum
  * confidence < threshold (default: 0.4)
* Low confidence results **cannot be ranked**

---

## 8. Scoring Engine

### Inputs

* Deal price
* TMVResult
* Fees & cost assumptions

### Outputs

* Profit margin (%)
* Velocity score
* Risk score
* Composite rank

### Risk Factors

* Low confidence
* High volatility
* Slow liquidity

---

## 9. API Design

### Health

```
GET /health
```

### Deals

```
GET /deals
GET /deals/:id
```

### TMV

```
POST /tmv/calculate
GET /tmv/:dealId
```

### Scoring & Ranking

```
POST /score
GET /ranked
```

---

## 10. Build & Deployment Rules

### Docker

* One Dockerfile per runtime
* Multi-stage builds only
* No copying repo root blindly

### Build Guarantees

* `npm ci` only
* Locked `package-lock.json`
* Prisma codegen is the only allowed build-time generation

### CI Gate

* Build must succeed in a fresh container
* No filesystem assumptions
* No relative path hacks

---

## 11. Security & Repo Hygiene

### Repo Safety

* `.gitattributes` enforces UTF-8 + LF
* Pre-commit binary detection
* Reject non-text files in source paths

### Runtime

* Read-only containers
* Secrets via env only
* Health checks required

---

## 12. Failure Recovery Philosophy

If corruption occurs:

* Repository is disposable
* Database persists
* Images rebuilt clean
* No recovery attempts

Deletion is a feature, not a failure.

---

## 13. Definition of Done (TMV v1)

* Fresh clone builds without warnings
* `docker compose up` works first try
* TMV Engine testable in isolation
* API returns deterministic TMV results
* Frontend builds without backend coupling

---

## Final Architect Note

Systems that assume permanence rot.

Systems that assume destruction survive.

This one is built to be burned down and rebuilt without fear.

---

## Workflow Note

This PRD was supplied by the user on 2026-04-19 and is being treated as the canonical product spec for current reconciliation and implementation planning.