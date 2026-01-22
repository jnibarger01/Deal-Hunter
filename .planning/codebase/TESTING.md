# Testing Patterns

**Analysis Date:** 2026-01-21

## Test Framework

**Runner:**
- Jest 29.7.0
- Config: `server/jest.config.js`
- Setup file: `server/tests/setup.ts`

**Assertion Library:**
- Jest built-in matchers: `expect()`

**Run Commands:**
```bash
npm run test              # Run all tests with coverage
npm run test:watch       # Run tests in watch mode
npm run test:integration # Run integration tests only (--testPathPattern=integration)
npm run test:local       # Full local integration test with PostgreSQL setup
```

**Coverage:**
- Collected from `src/**/*.ts`
- Ignored paths: `/node_modules/`, `/dist/`
- No coverage thresholds enforced

## Test File Organization

**Location:**
- Separate directory: `server/tests/`
- Integration tests: `server/tests/integration/`
- Setup utilities: `server/tests/setup.ts`

**Naming:**
- Pattern: `*.test.ts` (e.g., `auth.test.ts`, `deals.test.ts`, `watchlist.test.ts`)
- Files in `server/tests/integration/` directory

**Structure:**
```
server/tests/
├── setup.ts              # Shared setup with Prisma cleanup
├── integration/
│   ├── auth.test.ts
│   ├── deals.test.ts
│   └── watchlist.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
describe('Authentication API', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      // Test implementation
    });
  });
});
```

**Patterns:**

**Setup Pattern:**
```typescript
// Global beforeEach in setup.ts (server/tests/setup.ts)
beforeEach(async () => {
  // Delete in reverse order of dependencies
  await prisma.refreshToken.deleteMany({});
  await prisma.watchlistItem.deleteMany({});
  // ... cleanup all tables
});

// Per-test setup in beforeEach
describe('Watchlist API', () => {
  let accessToken: string;
  let userId: string;

  beforeEach(async () => {
    // Create user with registration
    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'user@example.com', password: 'Test123!' });

    accessToken = userResponse.body.data.tokens.accessToken;
    userId = userResponse.body.data.user.id;
  });
});
```

**Teardown Pattern:**
```typescript
// In setup.ts
afterAll(async () => {
  await prisma.$disconnect();
});
```

**Assertion Pattern:**
```typescript
expect(response.status).toBe(201);
expect(response.body.success).toBe(true);
expect(response.body.data.user).toHaveProperty('id');
expect(response.body.data.user.email).toBe(userData.email);
expect(response.body.data.user).not.toHaveProperty('password');
expect(response.body.data.tokens).toHaveProperty('accessToken');
expect(response.body.data.tokens).toHaveProperty('refreshToken');
```

## Integration Testing

**Framework:** Supertest for HTTP testing

**Pattern:**
```typescript
import request from 'supertest';
import app from '../../src/app';

const response = await request(app)
  .post('/api/v1/auth/register')
  .send(userData)
  .expect(201);

expect(response.body.success).toBe(true);
```

**Authentication in Tests:**
```typescript
// Get token from registration response
const userResponse = await request(app)
  .post('/api/v1/auth/register')
  .send({ email: 'user@example.com', password: 'Test123!' });

accessToken = userResponse.body.data.tokens.accessToken;

// Use token in authenticated requests
const response = await request(app)
  .get('/api/v1/watchlist')
  .set('Authorization', `Bearer ${accessToken}`)
  .expect(200);
```

**Admin Token Generation in Tests:**
```typescript
// Manual JWT token generation for admin users
const jwt = require('jsonwebtoken');
const config = require('../../src/config/env').default;

const admin = await prisma.user.create({
  data: {
    email: 'admin@example.com',
    password: 'hashedpassword',
    role: 'admin',
  },
});

adminToken = jwt.sign(
  { userId: admin.id, email: admin.email, role: admin.role },
  config.jwt.secret,
  { expiresIn: '1h' }
);
```

## Test Fixtures and Factories

**Test Data:**
Direct Prisma queries in test setup (no factory library used):

```typescript
// Create sample data
await prisma.user.create({
  data: {
    email: userCredentials.email,
    password: hashedPassword,
    firstName: 'Test',
    lastName: 'User',
  },
});

// Create multiple records
await prisma.deal.createMany({
  data: [
    {
      title: 'iPhone 13',
      price: 500,
      marketValue: 800,
      estimatedProfit: 200,
      dealScore: 85,
      roi: 40,
      category: 'tech',
      condition: 'good',
      itemUrl: 'https://example.com/1',
      marketplace: 'craigslist',
      status: 'active',
    },
    // ... more records
  ],
});
```

**Location:** Test data created inline in `beforeEach` blocks, no separate factory files

**Hash Generation in Tests:**
```typescript
import bcrypt from 'bcryptjs';

const hashedPassword = await bcrypt.hash(userCredentials.password, 10);
await prisma.user.create({
  data: {
    email: userCredentials.email,
    password: hashedPassword,
  },
});
```

## Database Setup

**Test Database:**
- Uses actual PostgreSQL instance (not in-memory)
- Connection via `DATABASE_URL` environment variable
- Setup defined in `server/jest.config.js`:
  ```javascript
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
  ```

**Setup File (`server/tests/setup.ts`):**
```typescript
import prisma from '../src/config/database';

// Clean up database before each test
beforeEach(async () => {
  // Delete in reverse order of dependencies
  await prisma.refreshToken.deleteMany({});
  await prisma.watchlistItem.deleteMany({});
  await prisma.portfolioItem.deleteMany({});
  await prisma.alert.deleteMany({});
  await prisma.deal.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.marketplaceSync.deleteMany({});
});

// Close database connection after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
```

**Schema Synchronization:**
- For local testing: `npm run test:local` runs `prisma db push` before tests
- Database URL: `postgresql://dealhunter:dealhunter_dev_password@localhost:5432/dealhunter?schema=public`

## Test Types

**Integration Tests:**
- Scope: Full request/response cycle through Express app
- Location: `server/tests/integration/*.test.ts`
- Coverage: Auth, deals, watchlist endpoints
- Use: Supertest with real database

**Patterns:**
- Setup database state
- Make HTTP request via supertest
- Assert response status, body structure, data values
- No mocking of services or database

**Unit Tests:** Not present in codebase

**E2E Tests:** Not implemented; integration tests serve as e2e

## Common Testing Patterns

**Async Testing:**
```typescript
it('should register a new user successfully', async () => {
  const userData = {
    email: 'test@example.com',
    password: 'Test123!',
  };

  const response = await request(app)
    .post('/api/v1/auth/register')
    .send(userData)
    .expect(201);

  expect(response.body.success).toBe(true);
});
```

**Error Testing:**
```typescript
it('should fail with weak password', async () => {
  const userData = {
    email: 'test@example.com',
    password: 'weak',
  };

  const response = await request(app)
    .post('/api/v1/auth/register')
    .send(userData)
    .expect(400);

  expect(response.body.success).toBe(false);
});
```

**Duplicate/Conflict Testing:**
```typescript
it('should fail with duplicate email', async () => {
  const userData = {
    email: 'test@example.com',
    password: 'Test123!',
  };

  // Register first time
  await request(app).post('/api/v1/auth/register').send(userData).expect(201);

  // Try to register again
  const response = await request(app)
    .post('/api/v1/auth/register')
    .send(userData)
    .expect(400);

  expect(response.body.success).toBe(false);
  expect(response.body.error.message).toContain('already exists');
});
```

**Multi-Step Workflows:**
```typescript
describe('Watchlist API', () => {
  let accessToken: string;
  let dealId: string;

  beforeEach(async () => {
    // Step 1: Register user
    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'user@example.com', password: 'Test123!' });

    accessToken = userResponse.body.data.tokens.accessToken;

    // Step 2: Create deal
    const deal = await prisma.deal.create({
      data: { /* ... */ },
    });
    dealId = deal.id;
  });

  it('should add deal to watchlist', async () => {
    const response = await request(app)
      .post('/api/v1/watchlist')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dealId, notes: 'Interesting deal' })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.item.dealId).toBe(dealId);
  });
});
```

**Authentication in Assertions:**
```typescript
it('should fail without authentication', async () => {
  const response = await request(app)
    .get('/api/v1/watchlist')
    .expect(401);

  expect(response.body.success).toBe(false);
});
```

## Validation Testing

**Express-Validator Integration:**
Tests validate input constraints:

```typescript
it('should fail with weak password', async () => {
  // Password < 8 chars, no uppercase, no number
  const userData = {
    email: 'test@example.com',
    password: 'weak',
  };

  const response = await request(app)
    .post('/api/v1/auth/register')
    .send(userData)
    .expect(400);

  expect(response.body.success).toBe(false);
});

it('should fail with invalid email', async () => {
  const userData = {
    email: 'invalid-email',
    password: 'Test123!',
  };

  const response = await request(app)
    .post('/api/v1/auth/register')
    .send(userData)
    .expect(400);

  expect(response.body.success).toBe(false);
});
```

Validation rules defined in routes: `server/src/routes/auth.routes.ts`
```typescript
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
];
```

## Coverage Analysis

**Current Coverage:**
- Covers: `src/**/*.ts`
- Tests exist for: Auth, deals, watchlist
- Missing: Most services have no direct unit tests (only integration coverage)
- Pattern: Integration tests provide coverage for service business logic

**Test Files Present:**
- `server/tests/integration/auth.test.ts` - Authentication endpoints
- `server/tests/integration/deals.test.ts` - Deal retrieval and filtering
- `server/tests/integration/watchlist.test.ts` - Watchlist management

---

*Testing analysis: 2026-01-21*
