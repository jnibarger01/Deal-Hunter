import { execSync } from 'node:child_process';

const DEFAULT_TEST_ENV = {
  DATABASE_URL:
    'postgresql://dealhunter:dealhunter_dev_password@localhost:5433/dealhunter?schema=integration_tests',
  JWT_SECRET: 'test-jwt-secret-for-local-tests-32-chars',
  AUTH_REQUIRE_VERIFIED_EMAIL: 'false',
  FRONTEND_URL: 'http://localhost:5173',
} as const;

export function buildTestEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return {
    ...env,
    DATABASE_URL: DEFAULT_TEST_ENV.DATABASE_URL,
    JWT_SECRET: env.JWT_SECRET ?? DEFAULT_TEST_ENV.JWT_SECRET,
    AUTH_REQUIRE_VERIFIED_EMAIL:
      env.AUTH_REQUIRE_VERIFIED_EMAIL ?? DEFAULT_TEST_ENV.AUTH_REQUIRE_VERIFIED_EMAIL,
    FRONTEND_URL: env.FRONTEND_URL ?? DEFAULT_TEST_ENV.FRONTEND_URL,
  };
}

export function syncPrismaTestSchema(env: NodeJS.ProcessEnv): void {
  try {
    execSync('npx prisma db push --skip-generate', {
      env,
      stdio: 'ignore',
    });
  } catch (error) {
    const message =
      'Deal-Hunter test setup could not sync the Prisma schema. ' +
      'Ensure PostgreSQL is running and DATABASE_URL is valid. ' +
      'For local Docker dev, run `npm run docker:up` from the repo root first.';
    const wrapped = new Error(message);
    (wrapped as Error & { cause?: unknown }).cause = error;
    throw wrapped;
  }
}
