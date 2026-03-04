import dotenv from 'dotenv';
import prisma from '../src/config/database';
import { EbayClient } from '../src/services/ebay';
import config from '../src/config/env';

dotenv.config();

const KEYWORDS = [
  'automotive',
  'tech',
  'camera',
  'macbook',
  'pc',
  'gaming pc',
];

const BUYER_POSTAL_CODE = '64101'; // Kansas City, MO
const MAX_DISTANCE = 50; // miles
const SOLD_DAYS_BACK = 90;

async function main() {
  if (!config.apiKeys.ebay) {
    throw new Error('EBAY_API_KEY is not set');
  }

  const ebay = new EbayClient({
    appId: config.apiKeys.ebay,
    certId: '',
    devId: '',
  });

  console.log('🔎 Fetching eBay listings near Kansas City...');

  for (const keyword of KEYWORDS) {
    console.log(`\n👉 Keyword: ${keyword}`);

    // --- 1. Ingest active listings as Deals ---
    const listings = await ebay.searchActiveListings(keyword, undefined, 50, {
      buyerPostalCode: BUYER_POSTAL_CODE,
      maxDistance: MAX_DISTANCE,
    });

    console.log(`Found ${listings.length} active listings`);

    for (const item of listings) {
      await prisma.deal.upsert({
        where: {
          source_sourceId: { source: 'ebay', sourceId: item.itemId },
        },
        update: {
          title: item.title,
          price: item.currentPrice,
          condition: item.condition,
          category: item.categoryName || 'Unknown',
          location: item.location || 'Kansas City, MO',
          url: item.viewItemURL,
          region: 'US-midwest',
          zipPrefix: BUYER_POSTAL_CODE.slice(0, 3),
        },
        create: {
          source: 'ebay',
          sourceId: item.itemId,
          title: item.title,
          price: item.currentPrice,
          condition: item.condition,
          category: item.categoryName || 'Unknown',
          location: item.location || 'Kansas City, MO',
          region: 'US-midwest',
          zipPrefix: BUYER_POSTAL_CODE.slice(0, 3),
          url: item.viewItemURL,
          views: null,
          saves: null,
          inquiries: null,
          daysListed: null,
        },
      });
    }

    // --- 2. Ingest sold/completed listings as MarketSamples ---
    const soldItems = await ebay.searchCompletedListings(keyword, undefined, SOLD_DAYS_BACK);
    console.log(`Found ${soldItems.length} sold items (last ${SOLD_DAYS_BACK} days)`);

    for (const sold of soldItems) {
      // Find or create a Deal to attach the sample to (match by source+sourceId)
      let deal = await prisma.deal.findUnique({
        where: { source_sourceId: { source: 'ebay', sourceId: sold.itemId } },
      });

      if (!deal) {
        // Create a placeholder deal for orphaned sold items so they can still contribute to TMV
        deal = await prisma.deal.create({
          data: {
            source: 'ebay',
            sourceId: sold.itemId,
            title: `${keyword} (sold)`,
            price: sold.soldPrice,
            condition: sold.condition,
            category: keyword,
            region: 'US-midwest',
            zipPrefix: BUYER_POSTAL_CODE.slice(0, 3),
            status: 'sold',
          },
        });
      }

      // Upsert a MarketSample for this sold item
      const existingSample = await prisma.marketSample.findFirst({
        where: {
          dealId: deal.id,
          source: 'ebay',
          observedAt: sold.soldDate,
        },
      });

      if (!existingSample) {
        await prisma.marketSample.create({
          data: {
            dealId: deal.id,
            observedPrice: sold.soldPrice,
            observedAt: sold.soldDate,
            source: 'ebay',
            condition: sold.condition,
            status: 'sold',
            finalPrice: sold.soldPrice,
            soldAt: sold.soldDate,
            region: 'US-midwest',
            zipPrefix: BUYER_POSTAL_CODE.slice(0, 3),
          },
        });
      }
    }
  }

  // Update the marketplace sync timestamp
  await prisma.marketplaceSync.updateMany({
    where: { marketplace: 'ebay' },
    data: { lastSyncedAt: new Date() },
  });

  console.log('\n✅ Ingest complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
