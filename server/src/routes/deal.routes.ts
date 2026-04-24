import { Router, Request, Response } from 'express';
import axios from 'axios';
import rateLimit from 'express-rate-limit';
import { body, param, query } from 'express-validator';
import dealController from '../controllers/deal.controller';
import { validate } from '../middleware/validation';
import { authenticate, authorize } from '../middleware/auth';
import asyncHandler from '../utils/asyncHandler';
import config from '../config/env';
import analyticsService from '../services/analytics.service';
import { EbayClient, isLiveEbayCategory } from '../services/ebay';

const router = Router();

// Explicit 404 guard for the old analytics paths that used to live under /deals
// (now owned by analysis.routes.ts at the API root). Without this, requests like
// GET /deals/ranked or GET /deals/:id/score would fall through to getDealById
// and 404 with a confusing "Deal not found" instead of a clean route 404.
const legacyDealCollectionPaths = new Set(['ranked']);
const legacyDealNestedPrefixes = ['tmv'];
const legacyDealNestedPaths = new Set(['score']);

function isLegacyAnalyticsRoute(id: string, nestedPath: string) {
  return (
    legacyDealCollectionPaths.has(id) ||
    legacyDealNestedPaths.has(nestedPath) ||
    legacyDealNestedPrefixes.some((prefix) => nestedPath.startsWith(prefix))
  );
}

const liveEbayLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many live eBay requests, please try again later.',
});

function sendRouteNotFound(req: Request, res: Response) {
  return res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.originalUrl} not found`,
    },
  });
}

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

const liveEbayValidation = [
  query('category')
    .optional()
    .isString()
    .trim()
    .custom((value) => isLiveEbayCategory(value))
    .withMessage('Unsupported eBay live category'),
  query('limit').optional().isInt({ min: 1, max: 24 }).toInt(),
];

router.get('/', validate(listDealsValidation), dealController.getAllDeals);
// NOTE: public endpoint (Dashboard consumes it unauthenticated). Rate-limit only.
// If the Dashboard ever moves behind auth, add `authenticate` here and consider
// whether persistLiveEbayDeals should be admin-gated since it does DB writes.
router.get(
  '/live/ebay',
  liveEbayLimiter,
  validate(liveEbayValidation),
  asyncHandler(async (req, res) => {
    const hasLegacyCredential = Boolean(config.apiKeys.ebay);
    const hasOAuthClientCredentials = Boolean(
      config.apiKeys.ebayClientId && config.apiKeys.ebayClientSecret
    );
    const usesOAuthTokenOnly = Boolean(
      config.apiKeys.ebay?.startsWith('v^1.1#') && !hasOAuthClientCredentials
    );

    if (!hasLegacyCredential && !hasOAuthClientCredentials) {
      res.status(503).json({
        success: false,
        error: {
          message:
            'eBay credentials are not configured. Set EBAY_APP_ID or both EBAY_CLIENT_ID and EBAY_CLIENT_SECRET.',
        },
      });
      return;
    }

    const category = typeof req.query.category === 'string' && isLiveEbayCategory(req.query.category)
      ? req.query.category
      : 'tech';
    const limit = Number(req.query.limit ?? 12);
    const ebay = new EbayClient({
      appId: config.apiKeys.ebay ?? '',
      certId: '',
      devId: '',
      oauthClientId: config.apiKeys.ebayClientId,
      oauthClientSecret: config.apiKeys.ebayClientSecret,
      oauthEnvironment: config.apiKeys.ebayOAuthEnvironment,
    });

    try {
      const deals = await ebay.searchLiveDeals(category, limit);
      const persistedDeals = await analyticsService.persistLiveEbayDeals(ebay, deals);

      res.status(200).json({
        success: true,
        data: {
          source: 'ebay',
          category,
          deals: persistedDeals,
        },
      });
      return;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        res.status(503).json({
          success: false,
          error: {
            message: usesOAuthTokenOnly
              ? 'eBay OAuth token is invalid or expired. Configure EBAY_CLIENT_ID and EBAY_CLIENT_SECRET, or provide a valid EBAY_APP_ID.'
              : 'eBay credentials were rejected upstream. Verify EBAY_APP_ID or the OAuth client credentials.',
          },
        });
        return;
      }

      throw error;
    }
  })
);
router.get('/categories', dealController.getCategories);
router.get('/marketplaces', dealController.getMarketplaces);
router.get('/stats', dealController.getStats);
router.use('/:id', (req, res, next) => {
  const id = String(req.params.id);
  const nestedPath = req.path.replace(/^\//, '');

  if (isLegacyAnalyticsRoute(id, nestedPath)) {
    return sendRouteNotFound(req, res);
  }

  return next();
});
router.get('/:id', validate(idParamValidation), dealController.getDealById);

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
