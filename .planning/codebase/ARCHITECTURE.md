# Architecture

**Analysis Date:** 2026-01-21

## Pattern Overview

**Overall:** Full-stack monorepo with decoupled frontend and backend services following MVC (backend) and component-driven (frontend) patterns.

**Key Characteristics:**
- Separate frontend (Vite/React) and backend (Express.js/Node.js) codebases within single repository
- Three-layer backend architecture: routes → controllers → services
- Frontend communicates with backend via REST API calls
- Business logic centralized in service layer (TMV engine, deal scoring, marketplace integrations)
- Database-driven user state management for watchlists, portfolios, and alerts

## Layers

**Presentation Layer (Frontend):**
- Purpose: Interactive React UI for deal discovery, analysis, and portfolio management
- Location: `/home/jace-nibarger/Deal-Hunter/` root (Vite-served)
- Contains: React components (`components/`), pages (App.tsx), types, constants, API client
- Depends on: Backend API via `services/api.ts`, external Google Gemini API
- Used by: Browser clients (localhost:3000)

**API Layer (Backend Routes):**
- Purpose: HTTP endpoint definitions, request validation, authentication/authorization
- Location: `server/src/routes/*.routes.ts`
- Contains: Express Router definitions with express-validator validation chains
- Depends on: Controllers for business logic, middleware for auth/error handling
- Key files:
  - `deal.routes.ts`: GET/POST deals, search, categories, stats
  - `auth.routes.ts`: Register, login, token refresh
  - `tmv.routes.ts`: TMV computation endpoint
  - `location.routes.ts`: Location target CRUD
  - `watchlist.routes.ts`: Watchlist item management
  - `portfolio.routes.ts`: Portfolio item tracking
  - `alert.routes.ts`: Alert configuration

**Controller Layer (Backend Business Logic Coordination):**
- Purpose: Handle HTTP request/response, coordinate between routes and services
- Location: `server/src/controllers/*.controller.ts`
- Contains: Request parsing, response formatting, error delegation
- Key files:
  - `deal.controller.ts`: Coordinates deal service and eBay service
  - `auth.controller.ts`: Coordinates auth service
  - `tmv.controller.ts`: Coordinates TMV service
  - `watchlist.controller.ts`: Coordinates watchlist service
  - `location.controller.ts`: Coordinates location service

**Service Layer (Backend Core Logic):**
- Purpose: Encapsulates business logic, marketplace integrations, calculations
- Location: `server/src/services/*.service.ts`
- Contains: Domain-specific algorithms, external API calls, data transformations
- Key services:
  - `tmv.service.ts` / `tmv-engine.ts`: True Market Value calculation, deal scoring, profit analysis
  - `ebay.service.ts`: eBay API OAuth and item search
  - `deal.service.ts`: Deal CRUD and filtering logic
  - `auth.service.ts`: JWT token generation, password hashing (bcryptjs)
  - `watchlist.service.ts`: Watchlist item persistence
  - `location.service.ts`: Location targeting and filtering
  - `ai.service.ts`: Google Gemini AI integrations for repair insights

**Data Access Layer (Prisma ORM):**
- Purpose: Database schema definition and query abstraction
- Location: `server/prisma/schema.prisma`
- Contains: PostgreSQL models with relationships
- Models: User, Deal, WatchlistItem, PortfolioItem, Alert, RefreshToken, MarketplaceSync

**Frontend API Client:**
- Purpose: HTTP communication bridge between React and backend
- Location: `/home/jace-nibarger/Deal-Hunter/services/api.ts`
- Contains: Fetch-based API calls, response parsing, deal transformation
- Exports: `searchDeals()`, `fetchLocations()`, `createLocation()`, `computeTMV()`

## Data Flow

**Deal Search & Display:**

1. User types search query in App.tsx search input
2. App.tsx triggers 400ms debounced `searchDeals()` API call
3. API client sends: `GET /api/v1/search?marketplace=ebay&query={q}&locationId={id}&filters={json}`
4. Deal controller delegates to deal service
5. Deal service calls EbayService.search() with location and filter context
6. EbayService obtains eBay OAuth token, calls eBay Browse API
7. Response returns itemSummaries array
8. API client transforms EbaySummary objects into Deal objects via `toDeal()` helper
9. Deal objects populate React state via `setDeals()`
10. App.tsx computes filteredDeals via useMemo (category, search, sort filters)
11. Filtered deals render as DealCard components in grid

**TMV Computation & Deal Scoring:**

1. Deal object may include `soldListings` array (comps from mock data or API)
2. App.tsx hydrates deals via `hydrateTMVDecisions()`
3. For each deal with sold listings, calls `computeTMV()` API
4. API client sends: `POST /api/v1/tmv/compute` with category, listingPrice, soldListings[]
5. TMV controller delegates to TMVService.computeDecisionPayload()
6. TMVService instantiates TMVEngine, parses listings, filters by condition
7. TMVEngine calculates:
   - Median true market value from comp listings (with outlier removal, time-weighting)
   - Velocity score (days-to-sell, market metrics)
   - Trend analysis
8. ProfitCalculator computes fees (FVF, payment processing, shipping) and net profit
9. DealScorer produces 0-100 deal score using price/TMV margin and profit ratio
10. recommendAction() maps score to action (buy_now/good/marginal/skip)
11. DecisionPayload returned, merged into deal state, displayed in UI

**Location-Based Filtering:**

1. App.tsx loads locations on mount via `fetchLocations()`
2. User can select a location or create new one
3. Search requests include locationId parameter
4. Backend passes postalCode + radiusMiles to EbayService
5. EbayService builds filter: `deliveryPostalCode:{code},deliveryRadius:{miles}`
6. eBay API returns items with delivery available in that radius
7. Price/category filters from location also applied

**User Authentication & Session:**

1. User submits email/password to register/login
2. Auth controller calls auth service
3. Auth service validates credentials, generates JWT (7d) and refresh token (30d)
4. Refresh token stored in PostgreSQL, JWT in memory/session
5. Protected routes require `authenticate` middleware checking Authorization header
6. `authorize('admin')` middleware checks user role from JWT claims

**State Management:**

- Frontend: React hooks (useState, useEffect, useMemo) for deal list, filters, locations, forms
- Backend: PostgreSQL via Prisma for users, watchlists, portfolios, alerts
- No Redux/Zustand; props drilling acceptable given shallow component hierarchy

## Key Abstractions

**TMVEngine:**
- Purpose: Encapsulates true market value algorithms, median calculations, outlier handling
- Location: `server/src/services/tmv-engine.ts`
- Pattern: Static utility class with static methods for parsing, calculating, scoring
- Used by: TMVService
- Exports: `TMVEngine.calculate()`, `DealScorer.score()`, `ProfitCalculator.calculate()`

**EbayService:**
- Purpose: Marketplace API abstraction
- Location: `server/src/services/ebay.service.ts`
- Pattern: Static class wrapping OAuth token exchange and item search
- Handles: eBay API authentication, filter string building, response parsing
- Extensible: Other marketplaces (Facebook, Craigslist) can follow same pattern

**AppError:**
- Purpose: Operational error handling with HTTP status codes
- Location: `server/src/middleware/errorHandler.ts`
- Pattern: Custom Error subclass with statusCode and isOperational flag
- Used by: All services and controllers for consistent error handling

**LocationTarget:**
- Purpose: Geographic search filtering with price bounds
- Location: Types defined in `/home/jace-nibarger/Deal-Hunter/types.ts`
- Pattern: Interface with id, label, coordinates (lat/lng), radiusMiles, filters object
- Persistence: Stored in database (inferred from routes/controllers), fetched on app load

## Entry Points

**Frontend Entry:**
- Location: `/home/jace-nibarger/Deal-Hunter/index.tsx`
- Triggers: Vite dev server mounts React app to `<div id="root">` in index.html
- Responsibilities: Initializes ReactDOM.createRoot, renders App component with StrictMode
- Bootstrap: `npm run dev` (Vite dev server on :3000)

**Backend Entry:**
- Location: `server/src/index.ts`
- Triggers: Node process or container startup
- Responsibilities:
  - Connects to PostgreSQL via Prisma
  - Initializes Express app with middleware
  - Binds HTTP server to port (default 5000)
  - Sets up graceful shutdown handlers (SIGTERM, SIGINT)
- Bootstrap: `npm run dev` in server/ (tsx watch src/index.ts) or `npm run build && npm start`

**App Entry (Express):**
- Location: `server/src/app.ts`
- Responsibilities:
  - Creates Express Application instance
  - Applies global middleware (CORS, Helmet, Morgan logging, rate-limit)
  - Mounts route handlers under `/api/v1/` namespace
  - Attaches error/404 handlers
- Middleware stack (in order):
  1. CORS (accepts from env.CORS_ORIGIN)
  2. Helmet (security headers)
  3. Morgan (request logging)
  4. express-rate-limit (100 req/15min by default)
  5. JSON/URL-encoded body parsers
  6. Route handlers
  7. 404 handler
  8. Global error handler

**Frontend App Entry:**
- Location: `/home/jace-nibarger/Deal-Hunter/App.tsx`
- Responsibilities:
  - Main layout (sidebar + main content area)
  - Tab navigation (Feed, Watchlist, Portfolio, Alerts)
  - Search bar with debounced query handling
  - Location selection and creation form
  - Deal grid rendering via DealCard components
  - Deal detail modal overlay via DealDetail component
- State: activeTab, selectedDeal, categoryFilter, searchQuery, sortBy, deals[], locations[]

## Error Handling

**Strategy:** Operational vs. Programming errors with status-code mapping

**Patterns:**

- **Service Layer:** Throws AppError with descriptive message and HTTP status
  ```typescript
  if (!listings.length) {
    throw new AppError('No comparable sales found', 400);
  }
  ```

- **Controller Layer:** Catches errors and delegates via `next(error)`
  ```typescript
  try {
    const results = await dealService.search();
    res.json(results);
  } catch (error) {
    next(error);  // Passes to global errorHandler middleware
  }
  ```

- **Global Handler:** `errorHandler` middleware maps AppError to response
  ```typescript
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { message: err.message }
    });
  }
  ```

- **Frontend:** API client throws errors, caught in useEffect with `setSearchError()`
  ```typescript
  const results = await searchDeals({...});
  if (isActive) setDeals(results);
  ```

## Cross-Cutting Concerns

**Logging:**
- Backend: Winston logger in `server/src/config/logger.ts`
- Query logging in development mode via Prisma event emitters
- Morgan HTTP request logging middleware
- Error stack traces logged with context (status, URL, method, IP)
- Frontend: console.error for API failures, no structured logging

**Validation:**
- Backend: express-validator (body, param, query validators in route definitions)
- Validation errors caught by `validate()` middleware, return 400 with error details
- Zod for environment variable schema validation at startup
- Frontend: Form validation on location creation (requires city OR zip)

**Authentication:**
- JWT tokens (7-day expiry) issued on login
- Refresh tokens (30-day expiry) stored in PostgreSQL
- `authenticate` middleware checks Authorization header, validates JWT signature
- `authorize(role)` middleware checks user.role from JWT claims
- Protected routes: /api/v1/deals POST, /api/v1/users/*, /api/v1/watchlist/*, /api/v1/portfolio/*

**Rate Limiting:**
- express-rate-limit: 100 requests per 15 minutes per IP
- Applied globally to all routes
- Configurable via env vars (RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS)

**Security:**
- Helmet: Sets security headers (CSP, X-Frame-Options, X-Content-Type-Options, etc.)
- CORS: Whitelist origin validation via env.CORS_ORIGIN
- Password hashing: bcryptjs with salt rounds (recommended 10+)
- JWT secret validation: min 32 characters via Zod schema

---

*Architecture analysis: 2026-01-21*
