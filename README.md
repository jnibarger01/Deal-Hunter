# Deal Hunter

Deal Hunter is a Docker-first deal discovery and valuation platform for resellers. The current rebuild centers on **TMV Engine v1**: ingest listings, store sold-market samples, calculate a true market value, score deals for profitability and risk, and surface ranked opportunities through a React SPA.

## Current Product Surface

Active frontend pages:
- Dashboard
- All Deals
- Top Ranked Deals
- Deal Detail with on-demand TMV analysis

Active backend endpoints:
- `GET /health`
- `GET /deals`
- `GET /deals/:id`
- `POST /tmv/calculate`
- `GET /tmv/:dealId`
- `POST /score`
- `GET /ranked`

Not in v1:
- auth
- watchlist
- portfolio
- alerts
- calculator scenarios

## Tech Stack

Backend:
- Node.js 20
- TypeScript
- Express
- Prisma
- PostgreSQL 16

Frontend:
- React 18
- Vite
- TypeScript
- React Router
- CSS Modules

Infrastructure:
- Docker and Docker Compose
- Nginx
- GitHub Actions

## Repository Layout

```text
deal-hunter/
├── server/      # Express + Prisma API
├── frontend/    # React + Vite SPA
├── docker/      # Dockerfiles
├── nginx/       # Nginx config
├── docs/        # Runbooks and release docs
└── .github/     # CI/CD workflows
```

## Local Development

### Prerequisites

- Node.js 20
- Docker

### Install dependencies

```bash
npm install
```

### Run with Docker

```bash
npm run docker:up
```

Expected local ports:
- frontend preview: `http://localhost:5173`
- API: `http://localhost:5000`
- nginx: `http://localhost:8080`
- Postgres: `localhost:5433`

### Run without Docker

1. Start a Postgres database reachable at `DATABASE_URL`
2. Generate Prisma client and apply migrations

```bash
cd server
npm run prisma:generate
npx prisma migrate deploy
```

3. Start the app from the repo root

```bash
npm run dev
```

## Verification Commands

Root build:

```bash
npm run build
```

Backend tests with coverage:

```bash
cd server
npm test
```

Frontend production build:

```bash
cd frontend
npm run build
```

Compose config validation:

```bash
docker compose config
```

## Data Model

Core persisted models:
- `Deal`
- `MarketSample`
- `TMVResult`
- `Score`

Supporting models still used in v1:
- `CategoryConfig`
- `MarketplaceSync`

## TMV Engine v1

The TMV engine currently applies:
- sold-sample filtering
- freshness window filtering
- IQR outlier rejection
- exponential time decay weighting
- weighted median valuation
- confidence scoring from sample count, volatility, and recency
- liquidity and estimated days-to-sell calculation
- hard rejection for insufficient samples or confidence below threshold

## Deployment

Main operational docs:
- `docs/production.md`
- `docs/release-checklist.md`

Staging and production deploys use:
- Docker images built in GitHub Actions
- `prisma migrate deploy` before app rollout
- `/health` and `/ready` smoke checks after deploy

## Notes

- This rebuild intentionally removes non-v1 product modules from the active UI and API surface.
- Prisma migrations now include a fresh baseline for the rebuilt schema.
- Nginx logs are written to stdout/stderr to support read-only containers.
