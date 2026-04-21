import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://dealhunter:dealhunter_dev_password@localhost:5433/dealhunter?schema=public';

execSync('npx prisma db push --skip-generate', {
  env: process.env,
  stdio: 'ignore',
});

const prisma = new PrismaClient();

beforeEach(async () => {
  await prisma.score.deleteMany({});
  await prisma.tMVResult.deleteMany({});
  await prisma.marketSample.deleteMany({});
  await prisma.deal.deleteMany({});
  await prisma.marketplaceSync.deleteMany({});
  await prisma.categoryConfig.deleteMany({});
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
