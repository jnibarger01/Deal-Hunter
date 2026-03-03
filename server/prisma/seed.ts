import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.categoryConfig.upsert({
    where: { category: 'default' },
    create: {
      category: 'default',
      decayRate: 0.099,
      minSamples: 8,
      freshnessWindow: 180,
    },
    update: {
      decayRate: 0.099,
      minSamples: 8,
      freshnessWindow: 180,
    },
  });

  await prisma.marketplaceSync.upsert({
    where: { id: 'seed-marketplace-sync' },
    create: {
      id: 'seed-marketplace-sync',
      marketplace: 'ebay',
      lastSyncedAt: new Date(0),
    },
    update: {
      marketplace: 'ebay',
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
