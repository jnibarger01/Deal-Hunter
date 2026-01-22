# Coding Conventions

**Analysis Date:** 2026-01-21

## Naming Patterns

**Files:**
- Services: `.service.ts` (e.g., `auth.service.ts`, `deal.service.ts`) in `server/src/services/`
- Controllers: `.controller.ts` (e.g., `auth.controller.ts`) in `server/src/controllers/`
- Routes: `.routes.ts` (e.g., `auth.routes.ts`) in `server/src/routes/`
- Middleware: `.ts` plain names (e.g., `auth.ts`, `errorHandler.ts`) in `server/src/middleware/`
- Components: PascalCase (e.g., `DealCard.tsx`, `DealDetail.tsx`) in `components/`
- Config: lowercase (e.g., `database.ts`, `logger.ts`, `env.ts`) in `server/src/config/`

**Functions:**
- camelCase for all function names: `register()`, `login()`, `createDeal()`, `getDealById()`
- Async functions prefix context: `loadLocations()`, `hydrateTMVDecisions()`, `fetchLocations()`
- Private methods start with underscore: `_generateAuthTokens()` (though not consistently used)
- React hooks use standard patterns: `useState()`, `useMemo()`, `useEffect()`

**Variables:**
- camelCase for local variables and properties: `accessToken`, `refreshToken`, `userId`, `dealId`, `locationForm`
- camelCase for state variables: `activeTab`, `selectedDeal`, `categoryFilter`, `searchQuery`
- Boolean variables use prefixes: `isActive`, `isWatched`, `isOperational`, `loadingDeals`, `locationsLoading`
- Type-safe collections use snake_case or camelCase based on context: `activeListingsCount`, `sellThroughRate`, `recentSalesCount30d`

**Types/Interfaces:**
- PascalCase for all interfaces: `Deal`, `AuthService`, `TokenPayload`, `AuthTokens`, `DealFilters`, `DealSortOptions`, `PaginationOptions`
- PascalCase for enum members with SCREAMING_SNAKE_CASE values in some cases: `Marketplace.CRAIGSLIST`, `Category.TECH`
- Interface prefixes indicate purpose: `*Payload`, `*Options`, `*Data`, `*Input`, `*Result`, `*Config`
- Request interfaces extend Express types: `AuthRequest extends Request`

**Classes:**
- PascalCase with Service suffix: `AuthService`, `DealService`, `WatchlistService`
- Constructor pattern uses `export class Name { } export default new Name()`

## Code Style

**Formatting:**
- No explicit ESLint/Prettier config found in repository
- Indentation: 2 spaces (inferred from file structure)
- Line length: appears to follow standard conventions (no config specified)
- Quotes: single quotes preferred in TypeScript (e.g., `'user'`, `'email'`)

**Linting:**
- ESLint installed in `server/package.json` with TypeScript plugins
- Packages: `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint`
- Run with: `npm run lint` (defined in `server/package.json`)
- No custom ESLint config file found; uses defaults

**TypeScript:**
- `tsconfig.json` settings:
  - Target: `ESNext` (server), `ES2022` (client)
  - Module: `NodeNext` (server), `ESNext` (client)
  - Strict mode enabled: `strict: true`
  - JSX: `react-jsx`
  - Path aliases: `@/*` maps to root (client only)

## Import Organization

**Order:**
1. External dependencies (npm packages): `import express`, `import jwt`, `import bcrypt`
2. Relative imports with configured paths: `import from '@/...'`
3. Local relative imports: `import from '../config/...'`, `import from './...'`
4. Type-only imports: `import type { ... }`

**Path Aliases:**
- Client only: `@/*` resolves to repository root (defined in `tsconfig.json`)
- No aliases in server code; uses relative paths throughout
- Services accessed via relative paths: `../config/database`, `../services/auth.service`

**Patterns Observed:**
```typescript
// Typical service imports
import prisma from '../config/database';
import config from '../config/env';
import logger from '../config/logger';
import { AppError } from '../middleware/errorHandler';

// Type imports
import { User, RefreshToken } from '@prisma/client';
import { Deal, Marketplace } from '../types';
```

## Error Handling

**Patterns:**
- Custom `AppError` class extends `Error` with `statusCode` property (`server/src/middleware/errorHandler.ts`)
- Throw errors with status codes: `throw new AppError('User not found', 404)`
- Default status code 500 if not specified: `constructor(message: string, statusCode: number = 500)`
- Error handler distinguishes operational vs. unhandled errors
- JWT errors caught specifically: `jwt.JsonWebTokenError`, `jwt.TokenExpiredError`
- Try-catch in controller methods, errors passed to Express `next()` middleware

**Error Response Format:**
```typescript
{
  success: false,
  error: {
    message: 'Error message',
    stack?: '...' // only in development
  }
}
```

**Middleware Chain:**
- Controllers wrap service calls in try-catch and call `next(error)`
- Express error handler (`errorHandler.ts`) catches all errors
- Development mode includes stack traces in response

## Logging

**Framework:** Winston logger (`server/src/config/logger.ts`)

**Configuration:**
- Log level from env: `process.env.LOG_LEVEL || 'info'`
- Transport: Console (colorized) + File (`logs/error.log`, `logs/combined.log`)
- Timestamp format: `'YYYY-MM-DD HH:mm:ss'`
- Default metadata: `{ service: 'deal-hunter-api' }`

**Patterns:**
```typescript
logger.info('New user registered: ${email}');
logger.error('Error message', { stack: error.stack });
logger.error(`${err.statusCode} - ${err.message} - ${req.originalUrl}`);
logger.debug('Query: ' + e.query); // Development only
```

**Usage Locations:**
- `server/src/controllers/*`: Log auth events (`register`, `login`, `logout`)
- `server/src/index.ts`: Log server startup and shutdown
- `server/src/config/database.ts`: Log queries in development mode
- Error handler logs all errors with context

## Comments

**When to Comment:**
- Document public method purposes (not always consistent)
- Mark TODOs for unimplemented features: `// TODO: Implement email verification logic`
- Explain complex business logic (e.g., token generation, deal scoring)
- No JSDoc/TSDoc convention observed; type hints used instead

**Observed Patterns:**
```typescript
// Simple comment for next operation
const hashedPassword = await bcrypt.hash(data.password, 10);

// Method purpose comment before class methods
// Register new user
async register(data: RegisterData): Promise<...> { }

// TODO markers
// TODO: Implement email verification logic
async verifyEmail(token: string): Promise<void> { }
```

## Function Design

**Size:** Functions are kept reasonably small (20-100 lines typical)
- Service methods average 30-50 lines
- Controller methods average 20-30 lines
- Helper functions like `formatRelativeTime()` are 10-15 lines

**Parameters:**
- Service methods use typed interfaces for complex parameters: `DealFilters`, `DealSortOptions`, `PaginationOptions`
- Optional parameters marked in interfaces: `category?: string`
- Destructuring used for extracting values: `const { category, marketplace, minDealScore } = filters`

**Return Values:**
- Explicit return types on all async functions: `Promise<AuthTokens>`, `Promise<Deal>`
- Object returns use TypeScript interfaces
- Database results wrapped in pagination objects: `{ deals, pagination: { ... } }`
- Service methods return domain objects, not raw database results

**Async/Await:**
- All database operations use async/await
- Promise.all() used for concurrent operations: `Promise.all(items.map(async (deal) => {...}))`
- Error handling with try-catch in async functions

## Module Design

**Exports:**
- Named exports for classes: `export class AuthService { }`
- Default singleton export: `export default new AuthService()`
- Interface exports for type safety: `export interface DealFilters { }`
- Enum exports for constants: `export enum Marketplace { }`

**File Structure (Server):**
- `services/`: Business logic, database queries, external API calls
- `controllers/`: Request handling, response formatting, validation coordination
- `routes/`: Express route definitions with inline validation
- `middleware/`: Auth, validation, error handling, logging
- `config/`: Database, logger, environment config

**Barrel Files:** Not used; direct imports from specific files

**Service Pattern Observed:**
```typescript
// Service class with private helper methods
export class AuthService {
  async register(data: RegisterData): Promise<...> { }
  async login(data: LoginData): Promise<...> { }
  private async generateAuthTokens(user: User): Promise<AuthTokens> { }
}
export default new AuthService();

// Controller delegates to service
export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  }
}
export default new AuthController();

// Routes define validation then delegate to controller
router.post('/register', validate(registerValidation), authController.register);
```

## React/Frontend Conventions

**Component Pattern:**
- Functional components with `React.FC<Props>` type
- Props interface defined above component: `interface DealCardProps { }`
- Event handlers: `onClick: (deal: Deal) => void`

**State Management:**
- `useState()` for local component state
- `useMemo()` for derived/computed values
- `useEffect()` for side effects with dependency arrays

**Styling:**
- Tailwind CSS with full class names: `className="bg-slate-800/50 border border-slate-700"`
- No CSS modules or styled-components observed
- Conditional classes with ternary: `className={scoreColor}` where `scoreColor = '...'`

**Type Safety:**
- Enums for constants: `Marketplace.EBAY`, `Category.TECH`
- Interfaces for complex types: `Deal`, `LocationTarget`, `DecisionPayload`
- Optional properties marked: `isWatched?: boolean`

---

*Convention analysis: 2026-01-21*
