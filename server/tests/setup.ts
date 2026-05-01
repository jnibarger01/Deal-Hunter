import { PrismaClient } from '@prisma/client';
import { buildTestEnvironment, syncPrismaTestSchema } from './setup-env';

process.env = buildTestEnvironment(process.env);
syncPrismaTestSchema(process.env);

const prisma = new PrismaClient();

async function resetDatabase() {
  await prisma.refreshToken.deleteMany({});
  await prisma.oneTimeToken.deleteMany({});
  await prisma.watchlistItem.deleteMany({});
  await prisma.portfolioItem.deleteMany({});
  await prisma.alert.deleteMany({});
  await prisma.score.deleteMany({});
  await prisma.tMVResult.deleteMany({});
  await prisma.tMVScenario.deleteMany({});
  await prisma.marketSample.deleteMany({});
  await prisma.deal.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.ingestSource.deleteMany({});
  await prisma.marketplaceSync.deleteMany({});
  await prisma.operatorSecret.deleteMany({});
}

beforeAll(async () => {
  await resetDatabase();
});

afterEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
