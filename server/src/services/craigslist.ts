import { XMLParser } from 'fast-xml-parser';
import prisma from '../config/prisma';

type CraigslistListing = {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  price: number;
  category: string;
  location?: string;
  url?: string;
  publishedAt?: Date;
};

type CraigslistIngestResult = {
  feedUrl: string;
  fetched: number;
  accepted: number;
  rejected: number;
  errors: string[];
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
});

const toArray = <T>(value: T | T[] | undefined): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const extractPrice = (title: string): number => {
  const match = title.match(/\$([0-9][\d,]*(?:\.\d{1,2})?)/);
  if (!match) return 0;
  const parsed = Number.parseFloat(match[1].replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const cleanTitle = (title: string): string => {
  return title
    .replace(/^\s*\$[0-9][\d,]*(?:\.\d{1,2})?\s*/i, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s+-\s*$/, '')
    .trim();
};

const extractLocationFromTitle = (title: string): string | undefined => {
  const match = title.match(/\(([^)]+)\)\s*$/);
  return match?.[1]?.trim();
};

const getHostRegion = (url?: string): string | undefined => {
  if (!url) return undefined;
  try {
    const host = new URL(url).host;
    return host.split('.')[0];
  } catch {
    return undefined;
  }
};

const cleanText = (value?: string): string | undefined => {
  if (!value) return undefined;
  const cleaned = value
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || undefined;
};

const extractImageUrl = (item: {
  enclosure?: { '@_url'?: string } | Array<{ '@_url'?: string }>;
  'media:content'?: { '@_url'?: string } | Array<{ '@_url'?: string }>;
}): string | undefined => {
  const enclosure = toArray(item.enclosure)[0]?.['@_url'];
  const media = toArray(item['media:content'])[0]?.['@_url'];
  return enclosure || media;
};

const inferCategory = (feedTitle?: string): string => {
  if (!feedTitle) return 'general';
  const normalized = feedTitle.toLowerCase();

  if (normalized.includes('electronics')) return 'electronics';
  if (normalized.includes('furniture')) return 'furniture';
  if (normalized.includes('appliance')) return 'appliances';
  if (normalized.includes('auto')) return 'automotive';
  if (normalized.includes('tools')) return 'tools';
  if (normalized.includes('general')) return 'general';

  return 'general';
};

export const fetchCraigslistFeed = async (
  feedUrl: string,
  maxPerFeed = 50
): Promise<CraigslistListing[]> => {
  const response = await fetch(feedUrl, {
    headers: {
      'User-Agent': 'DealHunterBot/1.0 (+https://github.com/jnibarger01/Deal-Hunter)',
    },
  });

  if (!response.ok) {
    throw new Error(`Feed request failed (${response.status}) for ${feedUrl}`);
  }

  const xml = await response.text();
  const parsed = parser.parse(xml) as {
    rss?: {
      channel?: {
        title?: string;
        item?: Array<{
          title?: string;
          link?: string;
          guid?: string | { '#text'?: string };
          description?: string;
          'content:encoded'?: string;
          enclosure?: { '@_url'?: string } | Array<{ '@_url'?: string }>;
          'media:content'?: { '@_url'?: string } | Array<{ '@_url'?: string }>;
          pubDate?: string;
        }>;
      };
    };
  };

  const channel = parsed?.rss?.channel;
  const items = toArray(channel?.item).slice(0, maxPerFeed);
  const category = inferCategory(channel?.title);

  const mapped: Array<CraigslistListing | null> = items.map((item, idx) => {
    const rawTitle = item.title?.trim() ?? '';
    const title = cleanTitle(rawTitle);
    const url = item.link?.trim();
    const guidValue = typeof item.guid === 'string' ? item.guid : item.guid?.['#text'];
    const id = (guidValue || url || `${feedUrl}#${idx}`).trim();

    if (!title || !id) {
      return null;
    }

    return {
      id,
      title,
      description: cleanText(item['content:encoded'] ?? item.description),
      imageUrl: extractImageUrl(item),
      price: extractPrice(rawTitle),
      category,
      location: extractLocationFromTitle(rawTitle),
      url,
      publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
    };
  });

  return mapped.filter((item): item is CraigslistListing => item !== null);
};

export const ingestCraigslistFromFeeds = async (
  feedUrls: string[],
  maxPerFeed = 50
): Promise<CraigslistIngestResult[]> => {
  const results: CraigslistIngestResult[] = [];

  for (const feedUrl of feedUrls) {
    const result: CraigslistIngestResult = {
      feedUrl,
      fetched: 0,
      accepted: 0,
      rejected: 0,
      errors: [],
    };

    try {
      const listings = await fetchCraigslistFeed(feedUrl, maxPerFeed);
      result.fetched = listings.length;

      for (const listing of listings) {
        try {
          const region = getHostRegion(listing.url);

          await prisma.deal.upsert({
            where: {
              source_sourceId: {
                source: 'craigslist',
                sourceId: listing.id,
              },
            },
            create: {
              source: 'craigslist',
              sourceId: listing.id,
              title: listing.title,
              description: listing.description,
              imageUrl: listing.imageUrl,
              price: listing.price,
              category: listing.category,
              location: listing.location,
              region,
              url: listing.url,
              marketplace: 'Craigslist',
              itemUrl: listing.url,
            },
            update: {
              title: listing.title,
              description: listing.description,
              imageUrl: listing.imageUrl,
              price: listing.price,
              category: listing.category,
              location: listing.location,
              region,
              url: listing.url,
              itemUrl: listing.url,
            },
          });

          result.accepted += 1;
        } catch (error) {
          result.rejected += 1;
          result.errors.push(
            `Failed listing ${listing.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown feed error');
      result.rejected = result.fetched;
    }

    results.push(result);
  }

  return results;
};
