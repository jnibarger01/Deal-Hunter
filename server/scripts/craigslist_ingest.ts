import 'dotenv/config';
import config from '../src/config/env';
import prisma from '../src/config/prisma';
import { ingestCraigslistFromFeeds } from '../src/services/craigslist';

const parseCliFeedUrls = (): string[] => {
  const args = process.argv.slice(2);
  const urlArgs = args.filter((arg) => arg.startsWith('http://') || arg.startsWith('https://'));
  return urlArgs;
};

async function main() {
  const cliFeedUrls = parseCliFeedUrls();
  const feedUrls = cliFeedUrls.length > 0 ? cliFeedUrls : config.craigslist.rssUrls;

  if (feedUrls.length === 0) {
    throw new Error(
      'No Craigslist RSS feeds provided. Set CRAIGSLIST_RSS_URLS or pass feed URLs as CLI args.'
    );
  }

  console.log(`🦞 Craigslist ingest starting (${feedUrls.length} feed(s))...`);

  const results = await ingestCraigslistFromFeeds(feedUrls, config.craigslist.maxPerFeed);

  const summary = results.reduce(
    (acc, item) => {
      acc.fetched += item.fetched;
      acc.accepted += item.accepted;
      acc.rejected += item.rejected;
      return acc;
    },
    { fetched: 0, accepted: 0, rejected: 0 }
  );

  for (const result of results) {
    console.log(
      `• ${result.feedUrl}\n  fetched=${result.fetched} accepted=${result.accepted} rejected=${result.rejected}`
    );

    if (result.errors.length > 0) {
      result.errors.slice(0, 3).forEach((err) => console.warn(`  ⚠ ${err}`));
      if (result.errors.length > 3) {
        console.warn(`  ⚠ ...and ${result.errors.length - 3} more errors`);
      }
    }
  }

  console.log(
    `\n✅ Craigslist ingest complete. fetched=${summary.fetched} accepted=${summary.accepted} rejected=${summary.rejected}`
  );
}

main()
  .catch((error) => {
    console.error('❌ Craigslist ingest failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
