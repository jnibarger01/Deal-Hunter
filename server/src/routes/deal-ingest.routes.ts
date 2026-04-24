import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';
import prisma from '../config/prisma';
import { authorizeOperatorOrAdmin } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { validate } from '../middleware/validation';
import asyncHandler from '../utils/asyncHandler';
import { ingestCraigslistFromFeeds } from '../services/craigslist';
import { decryptOperatorSecret } from '../services/operator-secret.service';
import {
  parseFacebookCookieInput,
  scrapeFacebookListing,
  scrapeFacebookSearch,
  type FacebookListing,
} from '../services/facebook';

const router = Router();
const FACEBOOK_SECRET_KIND = 'facebook_marketplace_cookies';

const ingestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many ingest requests, please try again later.',
});

const ingestValidation = [
  body('source').trim().notEmpty().withMessage('Source is required'),
  body('listings')
    .isArray({ min: 1 })
    .withMessage('Listings must be a non-empty array'),
];

const validateListing = (listing: unknown) => {
  const errors: string[] = [];

  if (!listing || typeof listing !== 'object') {
    return ['Listing must be an object'];
  }

  const listingRecord = listing as Record<string, unknown>;

  if (!listingRecord.id) {
    errors.push('id is required');
  }

  if (typeof listingRecord.title !== 'string' || listingRecord.title.trim().length === 0) {
    errors.push('title is required');
  }

  if (typeof listingRecord.category !== 'string' || listingRecord.category.trim().length === 0) {
    errors.push('category is required');
  }

  const price = Number(listingRecord.price);
  if (!Number.isFinite(price) || price < 0) {
    errors.push('price must be a positive number');
  }

  return errors;
};

const toOptionalString = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value : undefined;
};

const toOptionalNumber = (value: unknown): number | undefined => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getListingId = (listing: unknown): string | undefined => {
  if (!listing || typeof listing !== 'object') {
    return undefined;
  }

  const record = listing as Record<string, unknown>;
  return typeof record.id === 'string' ? record.id : undefined;
};

const upsertDealListing = async (source: string, listing: Record<string, unknown>) => {
  const sourceId = String(listing.id);
  const title = String(listing.title);
  const category = String(listing.category);
  const price = Number(listing.price);

  await prisma.deal.upsert({
    where: { source_sourceId: { source, sourceId } },
    create: {
      source,
      sourceId,
      title,
      description: toOptionalString(listing.description),
      imageUrl: toOptionalString(listing.imageUrl),
      price,
      condition: toOptionalString(listing.condition),
      category,
      location: toOptionalString(listing.location),
      region: toOptionalString(listing.region),
      zipPrefix: toOptionalString(listing.zipPrefix),
      url: toOptionalString(listing.url),
      views: toOptionalNumber(listing.views),
      saves: toOptionalNumber(listing.saves),
      inquiries: toOptionalNumber(listing.inquiries),
      daysListed: toOptionalNumber(listing.daysListed),
    },
    update: {
      title,
      description: toOptionalString(listing.description),
      imageUrl: toOptionalString(listing.imageUrl),
      price,
      condition: toOptionalString(listing.condition),
      category,
      location: toOptionalString(listing.location),
      region: toOptionalString(listing.region),
      zipPrefix: toOptionalString(listing.zipPrefix),
      url: toOptionalString(listing.url),
      views: toOptionalNumber(listing.views),
      saves: toOptionalNumber(listing.saves),
      inquiries: toOptionalNumber(listing.inquiries),
      daysListed: toOptionalNumber(listing.daysListed),
    },
  });
};

const loadStoredFacebookCookies = async () => {
  const secret = await prisma.operatorSecret.findUnique({ where: { kind: FACEBOOK_SECRET_KIND } });
  if (!secret) {
    throw new AppError('Facebook Marketplace cookies are not configured', 400);
  }

  const parsed = JSON.parse(decryptOperatorSecret(secret.value)) as { cookieJson: string };
  return parseFacebookCookieInput(parsed.cookieJson);
};

router.post(
  '/ingest/craigslist',
  authorizeOperatorOrAdmin,
  ingestLimiter,
  validate([
    body('rssUrls').optional().isArray({ min: 1 }),
    body('rssUrls.*').optional().isString().isURL(),
    body('maxPerFeed').optional().isInt({ min: 1, max: 200 }).toInt(),
  ]),
  asyncHandler(async (req, res) => {
    const bodyUrls = Array.isArray(req.body.rssUrls)
      ? (req.body.rssUrls as string[]).map((item) => item.trim()).filter(Boolean)
      : [];

    const feedUrls = bodyUrls.length > 0 ? bodyUrls : [];

    if (feedUrls.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Provide rssUrls array with one or more Craigslist feed URLs',
      });
      return;
    }

    const maxPerFeed = Number.isFinite(Number(req.body.maxPerFeed))
      ? Number(req.body.maxPerFeed)
      : 50;

    const results = await ingestCraigslistFromFeeds(feedUrls, maxPerFeed);

    const summary = results.reduce(
      (acc, item) => {
        acc.fetched += item.fetched;
        acc.accepted += item.accepted;
        acc.rejected += item.rejected;
        return acc;
      },
      { fetched: 0, accepted: 0, rejected: 0 }
    );

    res.json({
      success: true,
      data: {
        ...summary,
        results,
      },
    });
  })
);

router.post(
  '/ingest/facebook',
  authorizeOperatorOrAdmin,
  ingestLimiter,
  validate([
    body('urls').optional().isArray({ min: 1 }),
    body('urls.*').optional().isString().isURL(),
    body('search').optional().isObject(),
    body('search.query').optional().isString().trim().notEmpty(),
    body('search.location').optional().isString().trim().notEmpty(),
    body('search.limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  ]),
  asyncHandler(async (req, res) => {
    const cookies = await loadStoredFacebookCookies();
    const urls = Array.isArray(req.body.urls)
      ? (req.body.urls as string[]).map((item) => item.trim()).filter(Boolean)
      : [];

    const listings: FacebookListing[] = urls.length > 0
      ? await Promise.all(urls.map((url) => scrapeFacebookListing(url, cookies)))
      : req.body.search
        ? await scrapeFacebookSearch(req.body.search, cookies)
        : [];

    if (listings.length === 0) {
      throw new AppError('Provide urls or search payload for Facebook ingest', 400);
    }

    let accepted = 0;
    const errors: Array<{ index: number; id?: string; errors: string[] }> = [];

    for (let index = 0; index < listings.length; index += 1) {
      const listing = listings[index] as unknown as Record<string, unknown>;
      const listingErrors = validateListing(listing);
      if (listingErrors.length > 0) {
        errors.push({ index, id: getListingId(listing), errors: listingErrors });
        continue;
      }

      try {
        await upsertDealListing('facebook', listing);
        accepted += 1;
      } catch (error: unknown) {
        errors.push({
          index,
          id: getListingId(listing),
          errors: [error instanceof Error ? error.message : 'Failed to ingest Facebook listing'],
        });
      }
    }

    res.json({ accepted, rejected: errors.length, errors });
  })
);

router.post(
  '/ingest',
  authorizeOperatorOrAdmin,
  ingestLimiter,
  validate(ingestValidation),
  asyncHandler(async (req, res) => {
    const { source, listings } = req.body;
    const errors: Array<{ index: number; id?: string; errors: string[] }> = [];
    let accepted = 0;

    for (let index = 0; index < listings.length; index += 1) {
      const listing = listings[index] as Record<string, unknown>;
      const listingErrors = validateListing(listing);
      if (listingErrors.length > 0) {
        const listingId = getListingId(listing);
        errors.push({ index, id: listingId, errors: listingErrors });
        continue;
      }

      try {
        await upsertDealListing(String(source), listing);
        accepted += 1;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to ingest listing';
        const listingId = getListingId(listing);
        errors.push({
          index,
          id: listingId,
          errors: [message],
        });
      }
    }

    res.json({
      accepted,
      rejected: errors.length,
      errors,
    });
  })
);

export default router;
