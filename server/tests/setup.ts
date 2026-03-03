import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'file:./prisma/test.db';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-for-local-tests-32-chars';

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
