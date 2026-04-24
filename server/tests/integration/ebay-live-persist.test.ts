import request from 'supertest';
import { prisma } from '../setup';

const searchLiveDealsMock = jest.fn();
const searchCompletedListingsMock = jest.fn();

jest.mock('../../src/services/ebay', () => ({
  __esModule: true,
  isLiveEbayCategory: (value: string) => ['automotive', 'gaming', 'tech', 'tvs', 'speakers', 'tools'].includes(value),
  EbayClient: jest.fn().mockImplementation(() => ({
    searchLiveDeals: searchLiveDealsMock,
    searchCompletedListings: searchCompletedListingsMock,
  })),
}));

describe('live eBay persistence flow', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalEbayApiKey = process.env.EBAY_API_KEY;

  beforeEach(() => {
    jest.resetModules();
    searchLiveDealsMock.mockReset();
    searchCompletedListingsMock.mockReset();
    process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://dealhunter:test@localhost:5433/dealhunter?schema=integration_tests';
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-for-local-tests-32-chars';
    process.env.EBAY_API_KEY = 'test-ebay-app-id';
  });

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }

    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }

    if (originalEbayApiKey === undefined) {
      delete process.env.EBAY_API_KEY;
    } else {
      process.env.EBAY_API_KEY = originalEbayApiKey;
    }
  });

  async function loadApp() {
    return require('../../src/app').default;
  }

  it('persists live ebay pulls, creates sold samples, and makes the deal visible in ranked results', async () => {
    searchLiveDealsMock.mockResolvedValueOnce([
      {
        id: 'ebay-ps5-1',
        source: 'ebay',
        sourceId: 'ps5-1',
        title: 'PS5 Digital Edition',
        price: 200,
        condition: 'good',
        category: 'gaming',
        location: 'Austin, TX',
        url: 'https://example.com/ps5-1',
        createdAt: '2026-04-21T00:00:00.000Z',
      },
    ]);

    searchCompletedListingsMock.mockResolvedValueOnce(
      Array.from({ length: 8 }).map((_, index) => ({
        itemId: `sold-${index}`,
        soldPrice: 340 + index * 5,
        soldDate: new Date(`2026-04-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`),
        condition: 'good',
      }))
    );

    const app = await loadApp();

    const liveResponse = await request(app)
      .get('/api/v1/deals/live/ebay?category=gaming&limit=1')
      .expect(200);

    expect(liveResponse.body.success).toBe(true);

    const persistedDeal = await prisma.deal.findUnique({
      where: { source_sourceId: { source: 'ebay', sourceId: 'ps5-1' } },
      include: {
        samples: true,
        tmvResult: true,
        score: true,
      },
    });

    expect(persistedDeal).toBeTruthy();
    expect(persistedDeal?.marketplace).toBe('ebay');
    expect(persistedDeal?.samples).toHaveLength(8);
    expect(persistedDeal?.tmvResult).toBeTruthy();
    expect(persistedDeal?.score).toBeTruthy();

    const rankedResponse = await request(app)
      .get('/api/v1/ranked?limit=5')
      .expect(200);

    expect(Array.isArray(rankedResponse.body)).toBe(true);
    expect(rankedResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'ebay',
          sourceId: 'ps5-1',
          title: 'PS5 Digital Edition',
          tmv: expect.objectContaining({
            tmv: expect.any(Number),
            sampleCount: 8,
          }),
          score: expect.objectContaining({
            compositeRank: expect.any(Number),
          }),
        }),
      ])
    );
  });

  it('preserves existing sold samples and analytics when a refresh returns no completed listings', async () => {
    const deal = await prisma.deal.create({
      data: {
        source: 'ebay',
        sourceId: 'ps5-existing',
        title: 'PS5 Digital Edition',
        price: 210,
        condition: 'good',
        category: 'gaming',
        location: 'Austin, TX',
        url: 'https://example.com/ps5-existing',
        marketplace: 'ebay',
        status: 'active',
      },
    });

    await prisma.marketSample.createMany({
      data: Array.from({ length: 8 }).map((_, index) => ({
        dealId: deal.id,
        observedPrice: 330 + index,
        observedAt: new Date(`2026-03-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`),
        source: 'ebay',
        condition: 'good',
        status: 'sold',
        finalPrice: 335 + index,
        soldAt: new Date(`2026-03-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`),
        title: 'PS5 Digital Edition',
      })),
    });

    searchLiveDealsMock.mockResolvedValueOnce([
      {
        id: 'ebay-ps5-existing',
        source: 'ebay',
        sourceId: 'ps5-existing',
        title: 'PS5 Digital Edition',
        price: 205,
        condition: 'good',
        category: 'gaming',
        location: 'Austin, TX',
        url: 'https://example.com/ps5-existing',
        createdAt: '2026-04-21T00:00:00.000Z',
      },
    ]);
    searchCompletedListingsMock.mockResolvedValueOnce([]);

    const app = await loadApp();

    await request(app)
      .get('/api/v1/deals/live/ebay?category=gaming&limit=1')
      .expect(200);

    const refreshedDeal = await prisma.deal.findUnique({
      where: { id: deal.id },
      include: { samples: true, tmvResult: true, score: true },
    });

    expect(refreshedDeal?.samples).toHaveLength(8);
    expect(refreshedDeal?.tmvResult).toBeTruthy();
    expect(refreshedDeal?.score).toBeTruthy();
  });
});
