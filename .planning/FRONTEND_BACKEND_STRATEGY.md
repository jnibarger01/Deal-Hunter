# Deal-Hunter Frontend/Backend Strategy

## Overview

This document defines the communication patterns, data flow, and architectural boundaries between the frontend (React SPA) and backend (Express API) of Deal-Hunter.

---

## Architecture Principles

### Strict Separation

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React SPA)                   │
│  - UI rendering                                             │
│  - Client-side routing                                      │
│  - State management (local + server cache)                  │
│  - Input validation (UX only, not security)                 │
│  - NO direct database access                                │
│  - NO business logic                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ REST API (JSON)
                              │ Authentication: JWT Bearer
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND (Express API)                  │
│  - Authentication & authorization                           │
│  - Input validation (security)                              │
│  - Business logic (TMV, Scoring)                           │
│  - Database access (Prisma)                                │
│  - External API integration (eBay)                         │
│  - Rate limiting & security                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Prisma ORM
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE (PostgreSQL)                  │
│  - Single source of truth                                   │
│  - All persistence                                          │
└─────────────────────────────────────────────────────────────┘
```

### Rules

1. **Frontend NEVER bypasses API** - No direct DB connections, no external API calls
2. **Backend is stateless** - All state lives in database or client
3. **API is the contract** - Frontend and backend can be deployed independently
4. **Database is truth** - Cache is ephemeral, database is authoritative

---

## API Design

### Base URL

| Environment | Base URL |
|-------------|----------|
| Local (direct) | `http://localhost:5000` |
| Local (nginx) | `http://localhost:8080/api` |
| Production | `https://deal-hunter-api.onrender.com` |

### Endpoints

#### Health & Status
```
GET  /health                    # Service health check
```

#### Authentication
```
POST /auth/register             # Create account
POST /auth/login                # Get tokens
POST /auth/refresh              # Refresh access token
POST /auth/logout               # Invalidate refresh token
```

#### Deals
```
GET  /deals                     # List deals (paginated, filterable)
GET  /deals/:id                 # Get single deal with TMV/score
POST /deals/sync                # Trigger marketplace sync (admin)
```

#### TMV Engine
```
POST /tmv/calculate             # Calculate TMV for a deal
GET  /tmv/:dealId               # Get TMV result for deal
```

#### Scoring
```
POST /score                     # Calculate scores for deal
GET  /ranked                    # Get deals ranked by composite score
```

#### User Features
```
GET  /watchlist                 # User's watchlist
POST /watchlist                 # Add deal to watchlist
DELETE /watchlist/:dealId       # Remove from watchlist

GET  /portfolio                 # User's portfolio
POST /portfolio                 # Add deal to portfolio
PUT  /portfolio/:id             # Update portfolio item
DELETE /portfolio/:id           # Remove from portfolio

GET  /alerts                    # User's alerts
POST /alerts                    # Create alert
PUT  /alerts/:id                # Update alert
DELETE /alerts/:id              # Delete alert
```

### Request/Response Format

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <access_token>  # For protected routes
```

**Success Response:**
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

**Error Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "price", "message": "Must be positive number" }
    ]
  }
}
```

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Valid token, insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Unexpected backend error |

---

## Authentication Flow

### JWT Strategy

```
┌──────────┐     POST /auth/login      ┌──────────┐
│ Frontend │ ────────────────────────► │ Backend  │
│          │     { email, password }   │          │
│          │ ◄──────────────────────── │          │
│          │  { accessToken (15m),     │          │
│          │    refreshToken (7d) }    │          │
└──────────┘                           └──────────┘

     │
     │ Store tokens:
     │ - accessToken: memory only (not localStorage)
     │ - refreshToken: httpOnly cookie (preferred) or secure storage
     ▼

┌──────────┐     GET /deals            ┌──────────┐
│ Frontend │ ────────────────────────► │ Backend  │
│          │  Authorization: Bearer    │          │
│          │  <accessToken>            │          │
└──────────┘                           └──────────┘

     │
     │ When accessToken expires (401):
     ▼

┌──────────┐     POST /auth/refresh    ┌──────────┐
│ Frontend │ ────────────────────────► │ Backend  │
│          │  { refreshToken }         │          │
│          │ ◄──────────────────────── │          │
│          │  { accessToken (new) }    │          │
└──────────┘                           └──────────┘
```

### Token Storage (Frontend)

```typescript
// Access token: In-memory only (survives page lifecycle, not refresh)
let accessToken: string | null = null;

// Refresh token: HttpOnly cookie (set by backend) - PREFERRED
// OR if cookies not viable: encrypted localStorage with short expiry

// NEVER store access tokens in localStorage (XSS vulnerable)
```

### Protected Route Middleware (Backend)

```typescript
// server/src/middleware/auth.ts
export const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: { code: 'TOKEN_EXPIRED' } });
  }
};
```

---

## Frontend Architecture

### Directory Structure

```
frontend/src/
├── api/
│   ├── client.ts           # Axios/fetch wrapper with interceptors
│   ├── auth.ts             # Auth API calls
│   ├── deals.ts            # Deal API calls
│   ├── watchlist.ts        # Watchlist API calls
│   └── types.ts            # API response types
│
├── components/
│   ├── layout/             # App shell (Header, Sidebar, Layout)
│   └── ui/                 # Reusable components (Card, Button, Table)
│
├── hooks/
│   ├── useAuth.ts          # Auth state & methods
│   ├── useDeals.ts         # Deal fetching with caching
│   ├── useWatchlist.ts     # Watchlist mutations
│   └── useTMV.ts           # TMV calculations
│
├── pages/
│   ├── Dashboard.tsx       # Home/overview
│   ├── Deals.tsx           # Deal list
│   ├── DealDetail.tsx      # Single deal view
│   ├── Watchlist.tsx       # User watchlist
│   ├── Portfolio.tsx       # User portfolio
│   └── Settings.tsx        # User settings
│
├── types/
│   └── index.ts            # Shared TypeScript types
│
├── App.tsx                 # Router setup
└── main.tsx                # Entry point
```

### API Client

```typescript
// frontend/src/api/client.ts
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add auth token
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken(); // From auth store
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle 401, refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        await refreshAccessToken();
        return apiClient(error.config);
      } catch {
        // Refresh failed, redirect to login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

### Data Fetching Pattern

```typescript
// frontend/src/hooks/useDeals.ts
import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { Deal, PaginatedResponse } from '../types';

interface UseDealsOptions {
  page?: number;
  limit?: number;
  category?: string;
  minProfit?: number;
}

export function useDeals(options: UseDealsOptions = {}) {
  const [data, setData] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });

  useEffect(() => {
    const fetchDeals = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (options.page) params.set('page', String(options.page));
        if (options.limit) params.set('limit', String(options.limit));
        if (options.category) params.set('category', options.category);
        if (options.minProfit) params.set('minProfit', String(options.minProfit));

        const response = await apiClient.get<PaginatedResponse<Deal>>(
          `/deals?${params}`
        );
        setData(response.data.data);
        setMeta(response.data.meta);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch'));
      } finally {
        setLoading(false);
      }
    };

    fetchDeals();
  }, [options.page, options.limit, options.category, options.minProfit]);

  return { data, loading, error, meta };
}
```

### State Management Strategy

| State Type | Storage | Example |
|------------|---------|---------|
| Server state | React Query / SWR / custom hooks | Deals, TMV results |
| Auth state | Context + memory | Current user, tokens |
| UI state | Component local state | Form inputs, modals |
| URL state | React Router | Filters, pagination |

**No Redux needed for v1** - Keep it simple with hooks and context.

---

## Backend Architecture

### Directory Structure

```
server/src/
├── index.ts                # Entry point, server startup
├── app.ts                  # Express app configuration
│
├── config/
│   ├── database.ts         # Prisma client setup
│   ├── environment.ts      # Env var validation
│   ├── logger.ts           # Winston configuration
│   └── tmv.ts              # TMV algorithm constants
│
├── controllers/
│   ├── authController.ts   # Auth request handlers
│   ├── dealController.ts   # Deal request handlers
│   └── watchlistController.ts
│
├── routes/
│   ├── index.ts            # Route aggregator
│   ├── authRoutes.ts       # /auth/*
│   ├── dealRoutes.ts       # /deals/*
│   └── watchlistRoutes.ts  # /watchlist/*
│
├── services/
│   ├── authService.ts      # Auth business logic
│   ├── dealService.ts      # Deal CRUD + queries
│   ├── ebayService.ts      # eBay API integration
│   └── watchlistService.ts
│
├── domain/
│   ├── tmv.ts              # TMV calculation engine
│   ├── score.ts            # Deal scoring engine
│   └── deal.ts             # Deal domain logic
│
├── middleware/
│   ├── auth.ts             # JWT verification
│   ├── errorHandler.ts     # Global error handling
│   └── validation.ts       # Request validation
│
└── utils/
    └── asyncHandler.ts     # Async route wrapper
```

### Request Flow

```
Request
    │
    ▼
┌─────────────────┐
│ Express Router  │  Route matching
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Middleware      │  Auth, validation, rate limiting
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Controller      │  Parse request, call service, format response
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Service         │  Business logic, orchestration
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Domain          │  Core algorithms (TMV, Scoring)
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Prisma          │  Database access
└─────────────────┘
    │
    ▼
Response
```

### Error Handling

```typescript
// server/src/middleware/errorHandler.ts
export const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Known errors
  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details: err.details,
      },
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: err.message,
      },
    });
  }

  // Unknown errors - don't leak details
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
};
```

---

## Data Flow Examples

### 1. Fetching Ranked Deals

```
Frontend                          Backend                           Database
────────                          ───────                           ────────
GET /ranked?limit=20
    ────────────────────────►
                                  Parse query params
                                  Validate pagination

                                  dealService.getRankedDeals()
                                      ────────────────────────►
                                                                    SELECT deals.*,
                                                                           scores.*
                                                                    FROM deals
                                                                    JOIN scores ON ...
                                                                    ORDER BY composite_rank
                                                                    LIMIT 20
                                      ◄────────────────────────

                                  Format response
    ◄────────────────────────
{ data: [...], meta: {...} }

Render deal cards
```

### 2. Adding to Watchlist

```
Frontend                          Backend                           Database
────────                          ───────                           ────────
POST /watchlist
{ dealId: "abc-123" }
    ────────────────────────►
                                  Verify JWT
                                  Extract userId from token
                                  Validate dealId exists

                                  watchlistService.add(userId, dealId)
                                      ────────────────────────►
                                                                    INSERT INTO watchlist_items
                                                                    (user_id, deal_id)
                                                                    VALUES (...)
                                      ◄────────────────────────

    ◄────────────────────────
{ data: { id: "...", dealId: "abc-123" } }

Update UI (optimistic or refetch)
```

### 3. TMV Calculation

```
Frontend                          Backend                           Database
────────                          ───────                           ────────
POST /tmv/calculate
{ dealId: "abc-123" }
    ────────────────────────►
                                  Validate request

                                  tmvService.calculate(dealId)
                                  │
                                  │ Fetch deal
                                  │   ────────────────────────►
                                  │                              SELECT * FROM deals
                                  │                              WHERE id = 'abc-123'
                                  │   ◄────────────────────────
                                  │
                                  │ Fetch market samples
                                  │   ────────────────────────►
                                  │                              SELECT * FROM market_samples
                                  │                              WHERE category = deal.category
                                  │                              AND observed_at > (now - 180d)
                                  │   ◄────────────────────────
                                  │
                                  │ tmvEngine.compute(samples)
                                  │   - Filter outliers (IQR)
                                  │   - Apply time decay weights
                                  │   - Calculate weighted median
                                  │   - Compute confidence score
                                  │   - Calculate liquidity
                                  │
                                  │ Store result
                                  │   ────────────────────────►
                                  │                              INSERT INTO tmv_results
                                  │                              (deal_id, tmv, confidence, ...)
                                  │   ◄────────────────────────

    ◄────────────────────────
{
  data: {
    dealId: "abc-123",
    tmv: 450.00,
    confidence: 0.85,
    sampleCount: 24,
    liquidityScore: 0.72,
    estimatedDaysToSell: 8
  }
}

Display TMV badge on deal card
```

---

## CORS Configuration

```typescript
// server/src/app.ts
import cors from 'cors';

const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true, // Allow cookies for refresh token
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
```

### Environment-Specific Origins

| Environment | CORS_ORIGIN |
|-------------|-------------|
| Local | `http://localhost:5173` |
| Production | `https://deal-hunter-frontend.onrender.com` |

---

## Rate Limiting

```typescript
// server/src/app.ts
import rateLimit from 'express-rate-limit';

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 attempts per hour
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts' } },
});

app.use(globalLimiter);
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);
```

---

## Testing Strategy

### Backend Tests

```
server/tests/
├── unit/
│   ├── domain/
│   │   ├── tmv.test.ts      # TMV algorithm unit tests
│   │   └── score.test.ts    # Scoring algorithm unit tests
│   └── services/
│       └── dealService.test.ts
│
├── integration/
│   ├── api/
│   │   ├── deals.test.ts    # Deal endpoints
│   │   └── auth.test.ts     # Auth endpoints
│   └── database/
│       └── migrations.test.ts
│
└── setup.ts                  # Test database setup
```

### Frontend Tests

```
frontend/src/
├── __tests__/
│   ├── components/
│   │   └── DealCard.test.tsx
│   ├── hooks/
│   │   └── useDeals.test.ts
│   └── pages/
│       └── Dashboard.test.tsx
```

### Test Commands

```bash
# Backend
cd server && npm test           # Run all tests
cd server && npm test -- --coverage  # With coverage

# Frontend
cd frontend && npm test         # Run all tests
cd frontend && npm test -- --coverage
```

---

## Performance Considerations

### Backend

1. **Database indexing** - Index frequently queried columns (category, composite_rank)
2. **Connection pooling** - Prisma manages pool, set appropriate limits
3. **Pagination** - Never return unbounded lists
4. **Caching** - Consider Redis for TMV results (future)

### Frontend

1. **Code splitting** - Vite handles automatic chunk splitting
2. **Lazy loading** - Load routes on demand
3. **Image optimization** - Use appropriate formats, lazy load
4. **API response caching** - SWR/React Query with stale-while-revalidate

---

## Security Checklist

### Backend
- [ ] JWT secrets are strong and rotated
- [ ] Passwords hashed with bcrypt (cost factor 12+)
- [ ] SQL injection prevented (Prisma parameterized queries)
- [ ] Rate limiting on auth endpoints
- [ ] CORS restricted to frontend origin
- [ ] Helmet security headers enabled
- [ ] Input validation on all endpoints
- [ ] No sensitive data in logs

### Frontend
- [ ] No secrets in client code
- [ ] Access tokens in memory only
- [ ] XSS prevention (React auto-escapes)
- [ ] HTTPS only in production
- [ ] CSP headers configured
