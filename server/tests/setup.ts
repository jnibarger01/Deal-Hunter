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
