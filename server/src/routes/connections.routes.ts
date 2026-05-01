import { Router } from 'express';
import { body, param } from 'express-validator';
import config from '../config/env';
import prisma from '../config/prisma';
import { authorizeOperatorOrAdminIfConfigured } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { validate } from '../middleware/validation';
import asyncHandler from '../utils/asyncHandler';
import { ingestCraigslistFromFeeds } from '../services/craigslist';
import { decryptOperatorSecret, encryptOperatorSecret } from '../services/operator-secret.service';
import { parseFacebookCookieInput, testFacebookConnection } from '../services/facebook';

const router = Router();
const CRAIGSLIST_KIND = 'craigslist_rss';
const FACEBOOK_SECRET_KIND = 'facebook_marketplace_cookies';
const sourceIdValidation = [param('id').isString().trim().notEmpty()];

type IngestSourceConfig = {
  rssUrl?: string;
  lastAcceptedCount?: number;
  lastFetchedCount?: number;
  lastRejectedCount?: number;
  lastError?: string | null;
};

type StoredFacebookSecret = {
  cookieJson: string;
  profileName?: string;
  lastTestedAt?: string;
};

const readConfig = (value: unknown): IngestSourceConfig => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as IngestSourceConfig;
};

const readFacebookSecret = (value: string | null | undefined): StoredFacebookSecret | null => {
  if (!value) return null;
  try {
    return JSON.parse(decryptOperatorSecret(value)) as StoredFacebookSecret;
  } catch {
    return null;
  }
};

const serializeSource = (source: {
  id: string;
  kind: string;
  enabled: boolean;
  lastRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  config: unknown;
}) => ({
  id: source.id,
  kind: source.kind,
  enabled: source.enabled,
  lastRunAt: source.lastRunAt?.toISOString() ?? null,
  createdAt: source.createdAt.toISOString(),
  updatedAt: source.updatedAt.toISOString(),
  config: readConfig(source.config),
});

const buildConnectionsPayload = async () => {
  const [sources, marketplaceSync, facebookSecret] = await Promise.all([
    prisma.ingestSource.findMany({
      where: { kind: CRAIGSLIST_KIND },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.marketplaceSync.findFirst({
      where: { marketplace: 'ebay' },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.operatorSecret.findUnique({ where: { kind: FACEBOOK_SECRET_KIND } }),
  ]);
  const facebookState = readFacebookSecret(facebookSecret?.value);
  const ebayCredential = config.apiKeys.ebay;
  const hasOAuthClientCredentials = Boolean(
    config.apiKeys.ebayClientId && config.apiKeys.ebayClientSecret
  );
  const hasOAuthToken = Boolean(ebayCredential?.startsWith('v^1.1#'));
  const hasFindingAppId = Boolean(ebayCredential && !ebayCredential.startsWith('v^1.1#'));
  const ebayMissingEnv = [
    ...(!process.env.EBAY_APP_ID && !hasFindingAppId ? ['EBAY_APP_ID'] : []),
    ...(!process.env.EBAY_CLIENT_ID ? ['EBAY_CLIENT_ID'] : []),
    ...(!process.env.EBAY_CLIENT_SECRET ? ['EBAY_CLIENT_SECRET'] : []),
  ];
  const ebayAuthMode = hasOAuthClientCredentials
    ? 'oauth_client_credentials'
    : hasOAuthToken
      ? 'oauth_token'
      : hasFindingAppId
        ? 'finding_api_app_id'
        : 'missing';

  return {
    ebay: {
      status: ebayAuthMode === 'missing' ? 'missing_credentials' : 'configured',
      authMode: ebayAuthMode,
      missingEnv: ebayMissingEnv,
      lastLivePullAt: marketplaceSync?.lastSyncedAt?.toISOString() ?? null,
    },
    craigslist: {
      schedulerEnabled: config.craigslist.schedulerEnabled,
      sources: sources.map(serializeSource),
    },
    facebook: facebookState
      ? {
          status: 'configured' as const,
          profileName: facebookState.profileName ?? null,
          lastTestedAt: facebookState.lastTestedAt ?? null,
        }
      : {
          status: 'not_configured' as const,
          profileName: null,
          lastTestedAt: null,
        },
  };
};

router.get(
  '/',
  authorizeOperatorOrAdminIfConfigured,
  asyncHandler(async (_req, res) => {
    res.json({
      success: true,
      data: await buildConnectionsPayload(),
    });
  })
);

router.post(
  '/facebook/test',
  authorizeOperatorOrAdminIfConfigured,
  validate([body('cookieJson').isString().trim().notEmpty()]),
  asyncHandler(async (req, res) => {
    const cookieJson = String(req.body.cookieJson);
    const cookies = parseFacebookCookieInput(cookieJson);
    const profile = await testFacebookConnection(cookies);

    await prisma.operatorSecret.upsert({
      where: { kind: FACEBOOK_SECRET_KIND },
      create: {
        kind: FACEBOOK_SECRET_KIND,
        value: encryptOperatorSecret(
          JSON.stringify({
            cookieJson,
            profileName: profile.profileName,
            lastTestedAt: new Date().toISOString(),
          })
        ),
      },
      update: {
        value: encryptOperatorSecret(
          JSON.stringify({
            cookieJson,
            profileName: profile.profileName,
            lastTestedAt: new Date().toISOString(),
          })
        ),
      },
    });

    res.json({
      success: true,
      data: await buildConnectionsPayload(),
    });
  })
);

router.post(
  '/craigslist/sources',
  authorizeOperatorOrAdminIfConfigured,
  validate([body('rssUrl').isString().trim().isURL(), body('enabled').optional().isBoolean()]),
  asyncHandler(async (req, res) => {
    const rssUrl = String(req.body.rssUrl).trim();
    const enabled = req.body.enabled ?? true;

    const source = await prisma.ingestSource.create({
      data: {
        kind: CRAIGSLIST_KIND,
        enabled,
        config: {
          rssUrl,
          lastAcceptedCount: 0,
          lastFetchedCount: 0,
          lastRejectedCount: 0,
          lastError: null,
        },
      },
    });

    res.json({
      success: true,
      data: serializeSource(source),
    });
  })
);

router.patch(
  '/craigslist/sources/:id',
  authorizeOperatorOrAdminIfConfigured,
  validate([...sourceIdValidation, body('enabled').optional().isBoolean()]),
  asyncHandler(async (req, res) => {
    const source = await prisma.ingestSource.findFirst({
      where: { id: String(req.params.id), kind: CRAIGSLIST_KIND },
    });

    if (!source) {
      throw new AppError('Craigslist source not found', 404);
    }

    const updated = await prisma.ingestSource.update({
      where: { id: source.id },
      data: {
        enabled: req.body.enabled ?? source.enabled,
      },
    });

    res.json({
      success: true,
      data: serializeSource(updated),
    });
  })
);

router.delete(
  '/craigslist/sources/:id',
  authorizeOperatorOrAdminIfConfigured,
  validate(sourceIdValidation),
  asyncHandler(async (req, res) => {
    const source = await prisma.ingestSource.findFirst({
      where: { id: String(req.params.id), kind: CRAIGSLIST_KIND },
    });

    if (!source) {
      throw new AppError('Craigslist source not found', 404);
    }

    await prisma.ingestSource.delete({ where: { id: source.id } });

    res.json({
      success: true,
      data: { id: source.id },
    });
  })
);

router.post(
  '/craigslist/ingest',
  authorizeOperatorOrAdminIfConfigured,
  asyncHandler(async (_req, res) => {
    const sources = await prisma.ingestSource.findMany({
      where: { kind: CRAIGSLIST_KIND, enabled: true },
      orderBy: { createdAt: 'asc' },
    });

    const enabledSources = sources
      .map((source) => ({ source, config: readConfig(source.config) }))
      .filter((entry) => Boolean(entry.config.rssUrl));

    const rssUrls = enabledSources.map((entry) => entry.config.rssUrl as string);

    if (rssUrls.length > 0) {
      const results = await ingestCraigslistFromFeeds(rssUrls, config.craigslist.maxPerFeed);

      await Promise.all(
        enabledSources.map(async ({ source, config: sourceConfig }) => {
          const result = results.find((item) => item.feedUrl === sourceConfig.rssUrl);
          await prisma.ingestSource.update({
            where: { id: source.id },
            data: {
              lastRunAt: new Date(),
              config: {
                ...sourceConfig,
                lastAcceptedCount: result?.accepted ?? 0,
                lastFetchedCount: result?.fetched ?? 0,
                lastRejectedCount: result?.rejected ?? 0,
                lastError: result && result.errors.length > 0 ? result.errors.join('; ') : null,
              },
            },
          });
        })
      );
    }

    res.json({
      success: true,
      data: await buildConnectionsPayload().then((payload) => payload.craigslist),
    });
  })
);

export default router;
