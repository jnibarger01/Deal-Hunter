# Deal-Hunter Deployment Process

## Overview

This document defines the deployment strategy for Deal-Hunter, a monorepo containing:
- **Backend API** (Node.js/Express/Prisma)
- **Frontend SPA** (React/Vite)
- **PostgreSQL Database**

All deployments use Docker containers with Render.com as the hosting platform.

---

## Environment Tiers

| Environment | Purpose | URL Pattern | Database |
|-------------|---------|-------------|----------|
| **Local** | Development | localhost:5173 (FE), localhost:5000 (API) | Local PostgreSQL via Docker |
| **Staging** | Pre-production testing | staging.deal-hunter.onrender.com | Shared free-tier DB |
| **Production** | Live users | deal-hunter.onrender.com | Dedicated PostgreSQL |

---

## 1. Local Development

### Prerequisites
- Docker Desktop installed
- No local Node.js required (runs in containers)

### Commands

```bash
# Start all services (PostgreSQL, API, Frontend, Nginx)
docker compose up --build

# Start in detached mode
docker compose up -d --build

# View logs
docker compose logs -f server
docker compose logs -f frontend

# Stop all services
docker compose down

# Reset database (destructive)
docker compose down -v
docker compose up --build
```

### Service URLs (Local)

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend (Vite dev) | http://localhost:5173 | Hot-reload development |
| API Server | http://localhost:5000 | Direct API access |
| Nginx Proxy | http://localhost:8080 | Production-like routing |
| PostgreSQL | localhost:5432 | Database (user: postgres, pass: postgres) |

### Health Verification

```bash
# Check API health
curl http://localhost:5000/health

# Check via Nginx proxy
curl http://localhost:8080/api/health
```

---

## 2. Build Process

### Backend Build (server/)

```dockerfile
# Multi-stage build
1. Install dependencies (npm ci)
2. Generate Prisma client
3. Compile TypeScript (tsc)
4. Copy dist/ to production image
5. Run migrations on startup
```

**Build command:**
```bash
cd server && npm ci && npx prisma generate && npm run build
```

**Output:** `server/dist/` (compiled JavaScript)

### Frontend Build (frontend/)

```dockerfile
1. Install dependencies (npm ci)
2. Build with Vite (npm run build)
3. Copy dist/ to Nginx image
```

**Build command:**
```bash
cd frontend && npm ci && npm run build
```

**Output:** `frontend/dist/` (static assets)

### Build Validation Gates

Before any deployment:
- [ ] `npm ci` succeeds (no lockfile drift)
- [ ] TypeScript compiles with zero errors (`npx tsc --noEmit`)
- [ ] Prisma schema validates (`npx prisma validate`)
- [ ] Tests pass (`npm test`)
- [ ] Docker build succeeds locally

---

## 3. Render.com Deployment

### Infrastructure (render.yaml)

```yaml
databases:
  - name: deal-hunter-db
    plan: free  # Upgrade for production
    databaseName: dealhunter
    user: dealhunter

services:
  # Backend API
  - type: web
    name: deal-hunter-api
    runtime: docker
    dockerfilePath: ./docker/server.Dockerfile
    healthCheckPath: /health
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: deal-hunter-db
          property: connectionString
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        generateValue: true

  # Frontend Static Site
  - type: web
    name: deal-hunter-frontend
    env: static
    buildCommand: cd frontend && npm install && npm run build
    staticPublishPath: frontend/dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

### Deployment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Git Push to main                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Render Detects Push (Webhook)                  │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│   Backend Build         │     │   Frontend Build        │
│   (Docker)              │     │   (Static)              │
│                         │     │                         │
│ 1. docker build         │     │ 1. npm install          │
│ 2. Push to registry     │     │ 2. npm run build        │
│ 3. Health check         │     │ 3. Deploy to CDN        │
│ 4. Traffic cutover      │     │                         │
└─────────────────────────┘     └─────────────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Live on Render                           │
│   API: deal-hunter-api.onrender.com                        │
│   FE:  deal-hunter-frontend.onrender.com                   │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Commands

```bash
# Deploy via Git (automatic)
git push origin main

# Manual deploy via Render Dashboard
# 1. Go to dashboard.render.com
# 2. Select service
# 3. Click "Manual Deploy" > "Deploy latest commit"

# Check deployment status
# View in Render Dashboard > Events tab
```

---

## 4. Database Migrations

### Migration Strategy

1. **Migrations run on container startup** (not during build)
2. **Zero-downtime migrations only** - no table locks, no column drops without deprecation
3. **Forward-only** - never rollback migrations in production

### Creating Migrations

```bash
# Development: Create and apply migration
cd server
npx prisma migrate dev --name descriptive_name

# Production: Apply pending migrations (runs on startup)
npx prisma migrate deploy
```

### Migration Safety Rules

| Operation | Safe? | Alternative |
|-----------|-------|-------------|
| Add nullable column | YES | - |
| Add column with default | YES | - |
| Add index | YES (small tables) | Create CONCURRENTLY for large tables |
| Drop column | NO | 1. Stop reading, 2. Deploy, 3. Drop in next release |
| Rename column | NO | 1. Add new, 2. Migrate data, 3. Drop old |
| Change column type | NO | Add new column, migrate, drop old |

### Rollback Procedure

Since migrations are forward-only:
1. Create a new migration that reverses the change
2. Deploy the reversal migration
3. Never use `prisma migrate reset` in production

---

## 5. Environment Variables

### Required Variables

| Variable | Source | Description |
|----------|--------|-------------|
| `DATABASE_URL` | Render (auto) | PostgreSQL connection string |
| `JWT_SECRET` | Render (generated) | Auth token signing key |
| `NODE_ENV` | Static | `production` or `development` |
| `PORT` | Static | `5000` |
| `CORS_ORIGIN` | Static | Frontend URL for CORS |
| `LOG_LEVEL` | Static | `info` (prod) or `debug` (dev) |

### Secret Management

- **NEVER** commit secrets to git
- Use Render's environment variable UI for secrets
- Rotate `JWT_SECRET` if compromised (invalidates all sessions)
- Use `generateValue: true` in render.yaml for auto-generated secrets

### Adding New Variables

1. Add to `server/.env.example` (placeholder only)
2. Add to `render.yaml` (with appropriate source)
3. Document in this file
4. Deploy

---

## 6. Monitoring & Health Checks

### Health Check Endpoint

```
GET /health

Response (healthy):
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "database": "connected"
}

Response (unhealthy):
{
  "status": "error",
  "timestamp": "2024-01-15T10:30:00Z",
  "database": "disconnected"
}
```

### Render Health Check Config

- **Path:** `/health`
- **Interval:** 30 seconds
- **Timeout:** 10 seconds
- **Threshold:** 3 failures before restart

### Monitoring Checklist

- [ ] Health endpoint returns 200
- [ ] Database connection pool healthy
- [ ] No memory leaks (container stays under limit)
- [ ] Response times under 500ms (p95)
- [ ] Error rate under 1%

### Log Access

```bash
# Render Dashboard > Service > Logs tab
# Or use Render CLI:
render logs --service deal-hunter-api --tail
```

---

## 7. Rollback Procedure

### Application Rollback

1. **Identify bad deploy** in Render Dashboard > Events
2. Click on previous successful deploy
3. Click "Rollback to this deploy"
4. Wait for health checks to pass

### Database Rollback

Database changes cannot be automatically rolled back. For data issues:

1. **Stop traffic** - Set maintenance mode or scale to 0
2. **Assess damage** - Query to understand scope
3. **Restore from backup** (if catastrophic) OR
4. **Apply corrective migration** (if recoverable)
5. **Resume traffic**

### Emergency Contacts

| Situation | Action |
|-----------|--------|
| Site down | Check Render status page, then service logs |
| Database unreachable | Check Render DB status, connection limits |
| Secrets compromised | Rotate in Render UI, redeploy |

---

## 8. Deployment Checklist

### Pre-Deployment

- [ ] All tests passing locally
- [ ] TypeScript compiles without errors
- [ ] Prisma schema validates
- [ ] Docker builds successfully locally
- [ ] No secrets in committed code
- [ ] Migration is safe (see rules above)
- [ ] CHANGELOG updated

### Post-Deployment

- [ ] Health endpoint returns 200
- [ ] Can load frontend in browser
- [ ] Can make API request (e.g., GET /deals)
- [ ] Database queries working
- [ ] No errors in logs (first 5 minutes)
- [ ] Performance acceptable

### Rollback Triggers

Immediately rollback if:
- Health checks failing
- Error rate > 5%
- P95 latency > 2 seconds
- Data corruption detected
- Security vulnerability discovered

---

## 9. CI/CD Pipeline (Future)

When ready to add GitHub Actions:

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: cd server && npm ci && npm test
      - run: cd frontend && npm ci && npm run build

  # Render auto-deploys on push, so no deploy step needed
  # This just gates the push with tests
```

---

## Quick Reference

| Action | Command/Location |
|--------|------------------|
| Start local dev | `docker compose up --build` |
| Deploy to prod | `git push origin main` |
| View logs | Render Dashboard > Logs |
| Rollback | Render Dashboard > Events > Rollback |
| Add env var | Render Dashboard > Environment |
| Run migration | Automatic on deploy |
| Check health | `curl https://deal-hunter-api.onrender.com/health` |
