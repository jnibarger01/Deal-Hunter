# Deal Hunter - Development Guide

Guide for setting up and developing Deal Hunter locally.

## Quick Start

### 1. Prerequisites

- Node.js 20+
- PostgreSQL 16+ OR Docker
- Git

### 2. Clone & Install

```bash
# Clone repository
git clone https://github.com/yourusername/Deal-Hunter.git
cd Deal-Hunter

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 3. Choose Development Method

#### Option A: Docker (Recommended)

Easiest way to get started with all services:

```bash
# Copy environment file
cp server/.env.example server/.env

# Start all services (PostgreSQL, Redis, Backend, Frontend)
docker-compose up

# Backend: http://localhost:5000
# Frontend: http://localhost:3000
# PostgreSQL: localhost:5432
# Redis: localhost:6379
```

#### Option B: Local Development

Run services individually for faster iteration:

**Terminal 1 - Database:**
```bash
# Start PostgreSQL (if not using Docker)
# macOS
brew services start postgresql@16

# Ubuntu/Debian
sudo service postgresql start

# Create database
createdb dealhunter
```

**Terminal 2 - Backend:**
```bash
cd server

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Setup database
npx prisma generate
npx prisma migrate dev
npm run prisma:seed

# Start backend server
npm run dev
```

**Terminal 3 - Frontend:**
```bash
# Create frontend env
echo "VITE_API_URL=http://localhost:5000/api/v1" > .env.local
echo "GEMINI_API_KEY=your-key-here" >> .env.local

# Start frontend
npm run dev
```

## Project Structure

```
Deal-Hunter/
├── .github/
│   └── workflows/          # CI/CD pipelines
├── server/                 # Backend API
│   ├── src/
│   │   ├── config/        # Configuration (env, db, logger)
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/    # Express middleware
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── types/         # TypeScript types
│   │   ├── utils/         # Utilities
│   │   ├── app.ts         # Express app setup
│   │   └── index.ts       # Entry point
│   ├── tests/
│   │   ├── integration/   # Integration tests
│   │   ├── unit/          # Unit tests
│   │   └── setup.ts       # Test configuration
│   ├── prisma/
│   │   ├── schema.prisma  # Database schema
│   │   └── seed.ts        # Database seeding
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── components/             # React components
├── services/              # Frontend services
├── types.ts               # Frontend types
├── App.tsx                # Main React component
├── index.tsx              # React entry point
├── docker-compose.yml     # Development Docker config
├── docker-compose.prod.yml # Production Docker config
└── package.json           # Frontend dependencies
```

## Development Workflow

### Making Changes

1. **Create a feature branch**
```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes**
   - Backend code in `server/src/`
   - Frontend code in root directory
   - Tests in `server/tests/`

3. **Test your changes**
```bash
# Backend tests
cd server
npm test

# Run specific test file
npm test -- auth.test.ts

# Watch mode
npm run test:watch
```

4. **Check code quality**
```bash
# Lint backend
cd server
npm run lint

# Build to check for TypeScript errors
npm run build
```

5. **Commit and push**
```bash
git add .
git commit -m "feat: add new feature"
git push origin feature/your-feature-name
```

### Database Changes

When modifying the database schema:

```bash
cd server

# 1. Edit prisma/schema.prisma

# 2. Create migration
npx prisma migrate dev --name describe_your_change

# 3. Migration is automatically applied

# 4. Regenerate Prisma Client (usually automatic)
npx prisma generate
```

### API Development

**Creating a new endpoint:**

1. **Define route** (`server/src/routes/example.routes.ts`):
```typescript
import { Router } from 'express';
import exampleController from '../controllers/example.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, exampleController.getAll);
router.post('/', authenticate, exampleController.create);

export default router;
```

2. **Create controller** (`server/src/controllers/example.controller.ts`):
```typescript
import { Request, Response, NextFunction } from 'express';
import exampleService from '../services/example.service';

export class ExampleController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await exampleService.getAll();
      res.json({ success: true, data: { items } });
    } catch (error) {
      next(error);
    }
  }
}

export default new ExampleController();
```

3. **Create service** (`server/src/services/example.service.ts`):
```typescript
import prisma from '../config/database';

export class ExampleService {
  async getAll() {
    return await prisma.example.findMany();
  }
}

export default new ExampleService();
```

4. **Add to app.ts**:
```typescript
import exampleRoutes from './routes/example.routes';

apiRouter.use('/example', exampleRoutes);
```

5. **Write tests** (`server/tests/integration/example.test.ts`):
```typescript
import request from 'supertest';
import app from '../../src/app';

describe('Example API', () => {
  it('should get all items', async () => {
    const response = await request(app)
      .get('/api/v1/example')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

### Frontend Development

**Adding a new component:**

```typescript
// components/NewComponent.tsx
import React from 'react';

interface NewComponentProps {
  title: string;
}

export const NewComponent: React.FC<NewComponentProps> = ({ title }) => {
  return (
    <div>
      <h2>{title}</h2>
    </div>
  );
};
```

**Calling the API:**

```typescript
// Use fetch or your preferred HTTP client
const response = await fetch('http://localhost:5000/api/v1/deals', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
```

## Testing

### Running Tests

```bash
cd server

# All tests
npm test

# Watch mode
npm run test:watch

# Integration tests only
npm run test:integration

# With coverage
npm test -- --coverage

# Specific test file
npm test -- auth.test.ts
```

### Writing Tests

Always write tests for:
- New API endpoints
- Authentication logic
- Business logic in services
- Edge cases and error handling

Example test:
```typescript
describe('Deal Service', () => {
  it('should filter deals by category', async () => {
    // Arrange
    await createTestDeals();

    // Act
    const result = await dealService.getAllDeals({ category: 'tech' });

    // Assert
    expect(result.deals).toHaveLength(2);
    expect(result.deals[0].category).toBe('tech');
  });
});
```

## Debugging

### Backend Debugging

**VS Code launch.json:**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "program": "${workspaceFolder}/server/src/index.ts",
      "runtimeArgs": ["-r", "tsx"],
      "cwd": "${workspaceFolder}/server",
      "envFile": "${workspaceFolder}/server/.env"
    }
  ]
}
```

**Console logging:**
```typescript
import logger from '../config/logger';

logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', { error });
```

### Database Debugging

```bash
# Open Prisma Studio
cd server
npm run prisma:studio

# View in browser at http://localhost:5555
```

```typescript
// Log Prisma queries
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

## Common Tasks

### Reset Database

```bash
cd server

# CAUTION: This deletes all data!
npx prisma migrate reset

# Reseed
npm run prisma:seed
```

### Add New Dependency

```bash
# Backend
cd server
npm install package-name
npm install -D @types/package-name  # If TypeScript types available

# Frontend
npm install package-name
```

### Update Dependencies

```bash
# Check for updates
npm outdated

# Update all
npm update

# Update specific package
npm install package-name@latest
```

### Clean Build

```bash
# Backend
cd server
rm -rf dist node_modules
npm install
npm run build

# Frontend
rm -rf dist node_modules
npm install
npm run build
```

## Environment Variables

### Backend (.env)

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:pass@localhost:5432/dealhunter
JWT_SECRET=dev-secret-min-32-chars
GEMINI_API_KEY=your-key
```

### Frontend (.env.local)

```env
VITE_API_URL=http://localhost:5000/api/v1
GEMINI_API_KEY=your-key
```

## Tips & Best Practices

### Code Style

- Use TypeScript strict mode
- Follow ESLint rules
- Use Prettier for formatting
- Write descriptive commit messages
- Keep functions small and focused
- Comment complex logic

### API Design

- Use RESTful conventions
- Return consistent response format
- Include proper HTTP status codes
- Validate all inputs
- Handle errors gracefully
- Document endpoints

### Database

- Use transactions for related operations
- Add indexes for frequently queried fields
- Use proper data types
- Avoid N+1 queries
- Use migrations for schema changes

### Security

- Never commit secrets
- Validate all user input
- Use parameterized queries (Prisma does this)
- Implement rate limiting
- Use HTTPS in production
- Keep dependencies updated

## Troubleshooting

### Port Already in Use

```bash
# Find process
lsof -i :5000
# Kill process
kill -9 <PID>
```

### Database Connection Error

```bash
# Check PostgreSQL is running
pg_isadmin

# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL
```

### Prisma Client Out of Sync

```bash
npx prisma generate
```

### Tests Failing

```bash
# Make sure test database is clean
npm test -- --clearCache
```

## Resources

- [Express.js Documentation](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Documentation](https://react.dev/)

## Getting Help

- Check existing issues on GitHub
- Read error messages carefully
- Use `logger.debug()` liberally
- Ask in team chat/Slack
