import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://dealhunter:dealhunter_dev_password@localhost:5433/dealhunter?schema=public';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-for-local-tests-32-chars';
process.env.AUTH_REQUIRE_VERIFIED_EMAIL = process.env.AUTH_REQUIRE_VERIFIED_EMAIL ?? 'false';
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

execSync('npx prisma db push --skip-generate', {
  env: process.env,
  stdio: 'ignore',
});

const prisma = new PrismaClient();

beforeEach(async () => {
  await prisma.refreshToken.deleteMany({});
  await prisma.watchlistItem.deleteMany({});
  await prisma.portfolioItem.deleteMany({});
  await prisma.alert.deleteMany({});
  await prisma.score.deleteMany({});
  await prisma.tMVResult.deleteMany({});
  await prisma.marketSample.deleteMany({});
  await prisma.deal.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.marketplaceSync.deleteMany({});
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
