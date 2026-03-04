import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body, param, query } from 'express-validator';
import dealController from '../controllers/deal.controller';
import { validate } from '../middleware/validation';
import { authenticate, authorize } from '../middleware/auth';
import prisma from '../config/database';
import { DealScorer } from '../domain/score';
import asyncHandler from '../utils/asyncHandler';
import { ingestCraigslistFromFeeds } from '../services/craigslist';

const router = Router();

const ingestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many ingest requests, please try again later.',
});

// Validation rules
const createDealValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('marketplace').optional().trim(),
  body('itemUrl').optional().isURL().withMessage('Valid item URL is required'),
];

const updateDealValidation = [
  body('title').optional().trim().notEmpty(),
  body('price').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(['active', 'sold', 'expired']),
];

const idParamValidation = [
  param('id').isString().notEmpty().withMessage('Valid deal ID is required'),
];

const listDealsValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'price'])
    .withMessage('Invalid sortBy value'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Invalid sortOrder value'),
  query('minDealScore').optional().isFloat({ min: 0 }).toFloat(),
  query('maxPrice').optional().isFloat({ min: 0 }).toFloat(),
  query('status')
    .optional()
    .isIn(['active', 'sold', 'expired'])
    .withMessage('Invalid status value'),
  query('category').optional().isString().trim(),
  query('marketplace').optional().isString().trim(),
  query('search').optional().isString().trim(),
];

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

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sourceFeeDefaults: Record<string, number> = {
  ebay: 13,
  'fb market': 5,
  'fb marketplace': 5,
  craigslist: 3,
  offerup: 8,
};

const getListingId = (listing: unknown): string | undefined => {
  if (!listing || typeof listing !== 'object') {
    return undefined;
  }
  const record = listing as Record<string, unknown>;
  return typeof record.id === 'string' ? record.id : undefined;
};

// Public routes (no authentication required)
router.get('/', validate(listDealsValidation), dealController.getAllDeals);
router.get('/categories', dealController.getCategories);
router.get('/marketplaces', dealController.getMarketplaces);
router.get('/stats', dealController.getStats);
router.get(
  '/tmv-assumptions',
  asyncHandler(async (req, res) => {
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : undefined;
    const source = typeof req.query.source === 'string' ? req.query.source.trim() : undefined;

    const deals = await prisma.deal.findMany({
      where: {
        status: 'active',
        ...(category ? { category } : {}),
        ...(source ? { source } : {}),
        tmvResult: { isNot: null },
      },
      include: {
        tmvResult: true,
        score: true,
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    const margins = deals
      .filter((deal) => Number(deal.price) > 0 && deal.tmvResult)
      .map((deal) => (Number(deal.tmvResult!.tmv) - Number(deal.price)) / Number(deal.price));
    const daysToSell = deals
      .filter((deal) => deal.tmvResult?.estimatedDaysToSell !== null && deal.tmvResult?.estimatedDaysToSell !== undefined)
      .map((deal) => Number(deal.tmvResult!.estimatedDaysToSell));
    const confidenceScores = deals
      .filter((deal) => deal.tmvResult)
      .map((deal) => Number(deal.tmvResult!.confidence));

    const average = (values: number[]) =>
      values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

    const normalizedSource = source?.toLowerCase();
    const defaultFeePct = normalizedSource
      ? sourceFeeDefaults[normalizedSource] ?? 10
      : 10;

    const markupPct = Math.max(0, average(margins) * 100);
    const recommendedFeePct = deals.length ? Math.max(defaultFeePct, Math.min(20, markupPct * 0.35)) : defaultFeePct;
    const recommendedDaysToSell = daysToSell.length ? Math.max(1, Math.round(average(daysToSell))) : 7;
    const confidence = confidenceScores.length ? Math.max(0.4, Math.min(0.95, average(confidenceScores))) : 0.65;

    res.json({
      success: true,
      data: {
        category: category || null,
        source: source || null,
        sampleSize: deals.length,
        recommendedMarkupPct: Number(markupPct.toFixed(2)),
        recommendedFeePct: Number(recommendedFeePct.toFixed(2)),
        recommendedDaysToSell,
        confidence: Number(confidence.toFixed(2)),
      },
    });
  })
);
router.get(
  '/tmv-scenarios',
  asyncHandler(async (_req, res) => {
    const scenarios = await prisma.tMVScenario.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({
      success: true,
      data: scenarios.map((scenario) => ({
        ...scenario,
        buyPrice: Number(scenario.buyPrice),
        expectedSalePrice: Number(scenario.expectedSalePrice),
        shippingCost: Number(scenario.shippingCost),
        platformFeePct: Number(scenario.platformFeePct),
        prepCost: Number(scenario.prepCost),
        taxPct: Number(scenario.taxPct),
      })),
    });
  })
);
router.post(
  '/tmv-scenarios',
  validate([
    body('name').isString().trim().notEmpty().withMessage('name is required'),
    body('buyPrice').isFloat({ min: 0 }).withMessage('buyPrice must be >= 0'),
    body('expectedSalePrice').isFloat({ min: 0 }).withMessage('expectedSalePrice must be >= 0'),
    body('shippingCost').optional().isFloat({ min: 0 }),
    body('platformFeePct').optional().isFloat({ min: 0 }),
    body('prepCost').optional().isFloat({ min: 0 }),
    body('taxPct').optional().isFloat({ min: 0 }),
    body('category').optional().isString(),
    body('source').optional().isString(),
    body('notes').optional().isString(),
  ]),
  asyncHandler(async (req, res) => {
    const created = await prisma.tMVScenario.create({
      data: {
        name: String(req.body.name),
        category: toOptionalString(req.body.category),
        source: toOptionalString(req.body.source),
        buyPrice: toNumber(req.body.buyPrice),
        expectedSalePrice: toNumber(req.body.expectedSalePrice),
        shippingCost: toNumber(req.body.shippingCost),
        platformFeePct: toNumber(req.body.platformFeePct),
        prepCost: toNumber(req.body.prepCost),
        taxPct: toNumber(req.body.taxPct),
        notes: toOptionalString(req.body.notes),
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...created,
        buyPrice: Number(created.buyPrice),
        expectedSalePrice: Number(created.expectedSalePrice),
        shippingCost: Number(created.shippingCost),
        platformFeePct: Number(created.platformFeePct),
        prepCost: Number(created.prepCost),
        taxPct: Number(created.taxPct),
      },
    });
  })
);
router.delete(
  '/tmv-scenarios/:id',
  validate([param('id').isString().notEmpty().withMessage('Valid scenario ID is required')]),
  asyncHandler(async (req, res) => {
    await prisma.tMVScenario.delete({
      where: { id: String(req.params.id) },
    });

    res.json({
      success: true,
      message: 'TMV scenario deleted',
    });
  })
);
// GET /api/deals/ranked - Deals with TMV + Score sorted by compositeRank
router.get(
  '/ranked',
  asyncHandler(async (_req, res) => {
    const deals = await prisma.deal.findMany({
      where: {
        status: 'active',
        tmvResult: { isNot: null },
        score: { isNot: null },
      },
      include: { tmvResult: true, score: true },
      orderBy: { score: { compositeRank: 'desc' } },
      take: 100,
    });

    const ranked = deals.map((deal) => ({
      id: deal.id,
      source: deal.source,
      sourceId: deal.sourceId,
      title: deal.title,
      price: Number(deal.price),
      condition: deal.condition,
      category: deal.category,
      location: deal.location,
      url: deal.url,
      createdAt: deal.createdAt.toISOString(),
      tmv: deal.tmvResult
        ? {
            dealId: deal.tmvResult.dealId,
            tmv: Number(deal.tmvResult.tmv),
            confidence: Number(deal.tmvResult.confidence),
            sampleCount: deal.tmvResult.sampleCount,
            volatility: Number(deal.tmvResult.volatility),
            liquidityScore: Number(deal.tmvResult.liquidityScore),
            estimatedDaysToSell: deal.tmvResult.estimatedDaysToSell,
            calculatedAt: deal.tmvResult.calculatedAt.toISOString(),
          }
        : undefined,
      score: deal.score
        ? {
            dealId: deal.score.dealId,
            profitMargin: Number(deal.score.profitMargin),
            velocityScore: Number(deal.score.velocityScore),
            riskScore: Number(deal.score.riskScore),
            compositeRank: Number(deal.score.compositeRank),
          }
        : undefined,
    }));

    res.json(ranked);
  })
);

router.get('/:id', validate(idParamValidation), dealController.getDealById);

// POST /api/deals/:id/score - Score a deal using its TMV result
router.post(
  '/:id/score',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);

    const deal = await prisma.deal.findUnique({
      where: { id },
      include: { tmvResult: true },
    });

    if (!deal) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    if (!deal.tmvResult) {
      res.status(400).json({ error: 'TMV must be calculated before scoring' });
      return;
    }

    const normalizedSource = deal.source.toLowerCase();
    const feePct = sourceFeeDefaults[normalizedSource] ?? 10;

    const scorer = new DealScorer();
    const result = scorer.calculateScore(
      {
        price: deal.price,
        category: deal.category,
      },
      {
        tmv: deal.tmvResult.tmv,
        confidence: Number(deal.tmvResult.confidence),
        volatility: deal.tmvResult.volatility,
        liquidityScore: Number(deal.tmvResult.liquidityScore),
      },
      {
        platformFeeRate: feePct / 100,
      }
    );

    const score = await prisma.score.upsert({
      where: { dealId: id },
      create: {
        dealId: id,
        profitMargin: result.profitMargin,
        velocityScore: result.velocityScore,
        riskScore: result.riskScore,
        compositeRank: result.compositeRank,
      },
      update: {
        profitMargin: result.profitMargin,
        velocityScore: result.velocityScore,
        riskScore: result.riskScore,
        compositeRank: result.compositeRank,
        calculatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        dealId: score.dealId,
        profitMargin: Number(score.profitMargin),
        velocityScore: Number(score.velocityScore),
        riskScore: Number(score.riskScore),
        compositeRank: Number(score.compositeRank),
        calculatedAt: score.calculatedAt.toISOString(),
      },
    });
  })
);

// POST /api/deals/ingest/craigslist - Ingest Craigslist RSS feeds
router.post(
  '/ingest/craigslist',
  authenticate,
  authorize('admin'),
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

// POST /api/deals/ingest - Ingest new listings
router.post(
  '/ingest',
  authenticate,
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
            price,
            condition: toOptionalString(listing.condition),
            location: toOptionalString(listing.location),
            region: toOptionalString(listing.region),
            zipPrefix: toOptionalString(listing.zipPrefix),
            views: toOptionalNumber(listing.views),
            saves: toOptionalNumber(listing.saves),
            inquiries: toOptionalNumber(listing.inquiries),
            daysListed: toOptionalNumber(listing.daysListed),
          },
        });
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

// Protected routes (admin only)
router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(createDealValidation),
  dealController.createDeal
);

router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  validate([...idParamValidation, ...updateDealValidation]),
  dealController.updateDeal
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(idParamValidation),
  dealController.deleteDeal
);

export default router;
