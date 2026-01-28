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
    console.log(`
👉 Keyword: ${keyword}`);

    const listings = await ebay.searchActiveListings(keyword, undefined, 50, {
      buyerPostalCode: BUYER_POSTAL_CODE,
      maxDistance: MAX_DISTANCE,
    });

    console.log(`Found ${listings.length} listings`);

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
  }

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
