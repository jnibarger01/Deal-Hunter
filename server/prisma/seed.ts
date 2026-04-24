import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { categorySeedRows, regionalSeedRows, seasonalitySeedRows } from './seed-data';

const prisma = new PrismaClient();

export async function seedReferenceData(client: PrismaClient) {
  for (const row of categorySeedRows) {
    await client.categoryConfig.upsert({
      where: { category: row.category },
      create: row,
      update: {
        decayRate: row.decayRate,
        minSamples: row.minSamples,
        freshnessWindow: row.freshnessWindow,
      },
    });
  }

  for (const row of regionalSeedRows) {
    await client.regionalIndex.upsert({
      where: { region: row.region },
      create: row,
      update: {
        multiplier: row.multiplier,
      },
    });
  }

  for (const row of seasonalitySeedRows) {
    await client.seasonalityIndex.upsert({
      where: {
        category_month: {
          category: row.category,
          month: row.month,
        },
      },
      create: row,
      update: {
        multiplier: row.multiplier,
      },
    });
  }

  await client.marketplaceSync.upsert({
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

async function main() {
  await seedReferenceData(prisma);
}

if (require.main === module) {
  main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (error) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
