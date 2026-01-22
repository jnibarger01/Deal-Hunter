# Codebase Structure

**Analysis Date:** 2026-01-21

## Directory Layout

```
Deal-Hunter/
├── components/              # React UI components
│   ├── DealCard.tsx
│   └── DealDetail.tsx
├── services/                # Frontend API client layer
│   ├── api.ts              # REST API fetch methods
│   └── aiClient.ts         # Google Gemini AI client
├── server/                  # Backend Node.js application
│   ├── src/
│   │   ├── config/         # Environment, logger, database, swagger
│   │   ├── controllers/    # HTTP request handlers
│   │   ├── routes/         # Express route definitions
│   │   ├── services/       # Business logic (TMV, eBay, auth, etc.)
│   │   ├── middleware/     # Auth, error handling, validation
│   │   ├── app.ts          # Express app initialization
│   │   └── index.ts        # Server entry point
│   ├── prisma/             # Database schema and migrations
│   ├── tests/              # Jest test suite
│   ├── logs/               # Application logs (runtime)
│   ├── coverage/           # Test coverage reports
│   ├── package.json        # Dependencies and scripts
│   ├── tsconfig.json       # TypeScript config
│   ├── jest.config.js      # Jest test runner config
│   └── Dockerfile          # Production container image
├── nginx/                   # Reverse proxy configuration
├── dist/                    # Frontend build output (Vite)
├── .planning/               # GSD planning documents
├── .github/                 # GitHub workflows
├── index.html              # Frontend HTML entry
├── App.tsx                 # Root React component
├── types.ts                # Shared TypeScript types
├── constants.tsx           # Mock data and constants
├── vite.config.ts          # Vite bundler configuration
├── tsconfig.json           # Frontend TypeScript config
└── package.json            # Frontend dependencies
```

## Directory Purposes

**`/components`:**
- Purpose: Reusable React UI components
- Contains: `.tsx` files for Deal cards, detail views, modals
- Key files: `DealCard.tsx` (grid item display), `DealDetail.tsx` (full deal information overlay)

**`/services`:**
- Purpose: Frontend API client and external service integrations
- Contains: HTTP communication layer, API request/response handling
- Key files:
  - `api.ts`: Fetch-based HTTP client with endpoints (searchDeals, fetchLocations, computeTMV, createLocation)
  - `aiClient.ts`: Google Gemini API wrapper for repair insights

**`/server/src`:**
- Purpose: Backend application source code
- Structure: Layered architecture (routes → controllers → services → database)

**`/server/src/config`:**
- Purpose: Application configuration and initialization
- Key files:
  - `env.ts`: Environment variable validation with Zod schema
  - `database.ts`: Prisma client initialization with logging
  - `logger.ts`: Winston logger setup with file/console transports
  - `swagger.ts`: API documentation (if implemented)

**`/server/src/controllers`:**
- Purpose: HTTP request/response handlers
- Pattern: One controller file per domain (deal, auth, watchlist, location, tmv)
- Responsibilities: Parse requests, validate, delegate to services, format responses
- Key files:
  - `deal.controller.ts`: getAllDeals, searchDeals, getDealById, createDeal, updateDeal
  - `auth.controller.ts`: register, login, refreshToken, logout
  - `watchlist.controller.ts`: addWatchlistItem, removeWatchlistItem, getWatchlist
  - `location.controller.ts`: getLocations, createLocation, updateLocation
  - `tmv.controller.ts`: computeTMV

**`/server/src/routes`:**
- Purpose: Express Router definitions and endpoint validation
- Pattern: One routes file per domain
- Contains: Route definitions, middleware chains, express-validator validation rules
- Key files:
  - `deal.routes.ts`: GET /deals, GET /deals/:id, POST /deals, PUT /deals/:id, DELETE /deals/:id
  - `auth.routes.ts`: POST /auth/register, POST /auth/login, POST /auth/refresh
  - `watchlist.routes.ts`: GET /watchlist, POST /watchlist, DELETE /watchlist/:id
  - `location.routes.ts`: GET /locations, POST /locations, PUT /locations/:id
  - `tmv.routes.ts`: POST /tmv/compute
  - `portfolio.routes.ts`: GET /portfolio, POST /portfolio, PUT /portfolio/:id
  - `alert.routes.ts`: GET /alerts, POST /alerts, PUT /alerts/:id

**`/server/src/services`:**
- Purpose: Business logic, data transformations, external API integrations
- Pattern: One service class per domain, static methods or instance methods
- Key files:
  - `tmv.service.ts`: TMVService.computeDecisionPayload() - orchestrates TMV calculation
  - `tmv-engine.ts`: TMVEngine core algorithms (median, outlier filtering, velocity scoring)
  - `ebay.service.ts`: EbayService.search() - eBay API OAuth and item search
  - `auth.service.ts`: Password hashing, token generation, user validation
  - `deal.service.ts`: Deal filtering, sorting, category management
  - `watchlist.service.ts`: Watchlist item CRUD via Prisma
  - `location.service.ts`: Location persistence and querying
  - `ai.service.ts`: Google Gemini API calls for repair analysis

**`/server/src/middleware`:**
- Purpose: Cross-cutting concerns (auth, error handling, validation)
- Key files:
  - `auth.ts`: `authenticate` and `authorize(role)` middleware
  - `errorHandler.ts`: Global error handler, AppError class definition
  - `validation.ts`: Express-validator error catching middleware

**`/server/prisma`:**
- Purpose: Database schema and seed data
- Key files:
  - `schema.prisma`: PostgreSQL models (User, Deal, WatchlistItem, PortfolioItem, Alert, RefreshToken, MarketplaceSync)
  - `seed.ts`: Initial database population script

**`/server/tests`:**
- Purpose: Jest unit and integration tests
- Location: Mirrors source structure (e.g., `tests/services/tmv.service.test.ts`)
- Commands:
  - `npm test`: Run all tests with coverage
  - `npm run test:watch`: Watch mode
  - `npm run test:integration`: Integration tests only

**`/nginx`:**
- Purpose: Reverse proxy configuration for production deployment
- Contains: Nginx config directing traffic to frontend build and backend API

**`/dist`:**
- Purpose: Built frontend assets
- Generated: `npm run build` in root creates optimized Vite bundle
- Served by: Nginx or Express static middleware in production

## Key File Locations

**Entry Points:**

- **Frontend:**
  - `index.html`: HTML shell with root div and Tailwind CDN
  - `index.tsx`: React app initialization (ReactDOM.createRoot)
  - `App.tsx`: Root component (layout, navigation, deal grid)

- **Backend:**
  - `server/src/index.ts`: Node process entry, database connection, server startup
  - `server/src/app.ts`: Express app creation, middleware mounting, route registration

**Configuration:**

- `vite.config.ts`: Vite dev server (:3000), React plugin, path alias resolution (@/)
- `tsconfig.json`: Frontend TypeScript compiler options (ES2022, React-JSX, @ alias)
- `server/tsconfig.json`: Backend TypeScript compiler options (Node types, modules)
- `server/jest.config.js`: Jest test runner (ts-jest preset, coverage thresholds)
- `.env`: Runtime environment variables (DATABASE_URL, JWT_SECRET, API keys)
- `.env.example`: Template showing required env vars

**Core Logic:**

- **Deal Scoring & Valuation:**
  - `server/src/services/tmv-engine.ts`: Statistical market value calculation
  - `server/src/services/tmv.service.ts`: Profit analysis and deal score orchestration

- **Marketplace Integration:**
  - `server/src/services/ebay.service.ts`: eBay API client

- **Authentication:**
  - `server/src/services/auth.service.ts`: Password hashing, JWT generation
  - `server/src/middleware/auth.ts`: Token validation middleware

- **Data Access:**
  - `server/prisma/schema.prisma`: ORM model definitions

**Testing:**

- `server/jest.config.js`: Test runner configuration
- `server/tests/`: Test files organized by layer (services, controllers, routes)
- `server/coverage/`: Coverage reports (generated by `npm test`)

## Naming Conventions

**Files:**

- React components: PascalCase (`.tsx`), e.g., `DealCard.tsx`, `DealDetail.tsx`
- Services: camelCase with `.service.ts` suffix, e.g., `deal.service.ts`, `auth.service.ts`
- Routes: camelCase with `.routes.ts` suffix, e.g., `deal.routes.ts`, `auth.routes.ts`
- Controllers: camelCase with `.controller.ts` suffix, e.g., `deal.controller.ts`
- Middleware: camelCase, e.g., `auth.ts`, `errorHandler.ts`, `validation.ts`
- Config files: camelCase, e.g., `env.ts`, `logger.ts`, `database.ts`
- Tests: Match source file with `.test.ts` suffix, e.g., `deal.service.test.ts`

**Directories:**

- kebab-case for multi-word dirs (e.g., `.planning`, `.github`)
- lowercase single-word dirs (e.g., `components`, `services`, `routes`, `server`)

**TypeScript Classes & Interfaces:**

- Classes: PascalCase, e.g., `TMVService`, `EbayService`, `AppError`, `DealController`
- Interfaces: PascalCase with I prefix optional (convention varies), e.g., `Deal`, `LocationTarget`, `TMVRequest`, `EbaySearchFilters`
- Enums: PascalCase, e.g., `Marketplace`, `Category`

**Functions & Variables:**

- camelCase: `fetchLocations()`, `computeTMV()`, `createLocation()`, `searchDeals()`
- Constants: UPPER_SNAKE_CASE: `MOCK_DEALS`, `API_BASE`, `EBAY_OAUTH_URL`

## Where to Add New Code

**New Feature (e.g., messaging between flippers):**

1. **Database Schema:**
   - Add model in `server/prisma/schema.prisma`
   - Run `npm run prisma:migrate` in server/ to create migration

2. **Backend API:**
   - Create `server/src/services/message.service.ts` (business logic)
   - Create `server/src/controllers/message.controller.ts` (request handling)
   - Create `server/src/routes/message.routes.ts` (endpoint definitions)
   - Mount routes in `server/src/app.ts`: `apiRouter.use('/messages', messageRoutes);`

3. **Frontend:**
   - Create `components/MessageThread.tsx` (UI component)
   - Add fetch method to `services/api.ts`: `export const getMessages = async (...) => {...}`
   - Integrate into App.tsx or new page component
   - Add types to `types.ts` if needed

**New Component (e.g., DealAnalytics tab):**

1. Create component file: `components/DealAnalytics.tsx`
2. Add TypeScript interfaces to `types.ts` for analytics data if needed
3. Add API call to `services/api.ts` if backend data needed
4. Integrate into `App.tsx` tab navigation:
   ```tsx
   const [activeTab, setActiveTab] = useState<'Feed' | 'Watchlist' | 'Portfolio' | 'Alerts' | 'Analytics'>('Feed');
   // Add button in nav, render component
   ```

**New Service/Utility (e.g., cache layer):**

- Shared frontend utility: `services/cacheClient.ts`
- Backend service: `server/src/services/cache.service.ts`
- Follow naming convention: `{domain}.service.ts` or `{domain}Client.ts`
- Export functions/classes from service, import in controllers or other services

**Database Migration:**

1. Modify `server/prisma/schema.prisma`
2. Run: `npm run prisma:migrate -- --name <migration_name>`
3. Prisma generates migration file in `server/prisma/migrations/`
4. Commit migration file to git

**Test File:**

- Create alongside source: `server/tests/services/{domain}.service.test.ts`
- Follow Jest conventions:
  ```typescript
  describe('DealService', () => {
    it('should filter deals by category', () => {
      // Arrange, Act, Assert
    });
  });
  ```
- Run: `npm test` or `npm run test:watch`

## Special Directories

**`.planning/codebase`:**
- Purpose: GSD analysis documents (ARCHITECTURE.md, STRUCTURE.md, etc.)
- Generated: By `/gsd:map-codebase` command
- Committed: Yes (reference for future work)

**`server/coverage`:**
- Purpose: Test coverage reports
- Generated: By `npm test` (Jest output)
- Committed: No (generated artifact)
- View: `server/coverage/lcov-report/index.html` in browser

**`server/logs`:**
- Purpose: Application runtime logs
- Generated: By Winston logger during execution
- Committed: No (runtime artifacts)

**`dist`:**
- Purpose: Frontend production build
- Generated: By `npm run build` (Vite output)
- Committed: No (generated artifact)
- Contains: Minified CSS, JS, index.html ready for deployment

**`.github/workflows`:**
- Purpose: CI/CD automation
- Contains: GitHub Actions YAML configs for tests, builds, deployments
- Committed: Yes

---

*Structure analysis: 2026-01-21*
