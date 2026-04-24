import request from 'supertest';

const searchLiveDealsMock = jest.fn();
const persistLiveEbayDealsMock = jest.fn();

jest.mock('../../src/services/analytics.service', () => ({
  __esModule: true,
  default: {
    persistLiveEbayDeals: persistLiveEbayDealsMock,
  },
}));

jest.mock('../../src/services/ebay', () => ({
  __esModule: true,
  isLiveEbayCategory: (value: string) => ['automotive', 'gaming', 'tech', 'tvs', 'speakers', 'tools'].includes(value),
  EbayClient: jest.fn().mockImplementation(() => ({
    searchLiveDeals: searchLiveDealsMock,
    searchCompletedListings: jest.fn(),
  })),
}));

describe('live eBay deals route', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalEbayApiKey = process.env.EBAY_API_KEY;
  const originalEbayClientId = process.env.EBAY_CLIENT_ID;
  const originalEbayClientSecret = process.env.EBAY_CLIENT_SECRET;

  beforeEach(() => {
    jest.resetModules();
    searchLiveDealsMock.mockReset();
    persistLiveEbayDealsMock.mockReset();
    process.env.DATABASE_URL = 'postgresql://unit-test';
    process.env.JWT_SECRET = 'test-jwt-secret-for-local-tests-32-chars';
    process.env.EBAY_API_KEY = 'legacy-app-id';
    delete process.env.EBAY_CLIENT_ID;
    delete process.env.EBAY_CLIENT_SECRET;
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

    if (originalEbayClientId === undefined) {
      delete process.env.EBAY_CLIENT_ID;
    } else {
      process.env.EBAY_CLIENT_ID = originalEbayClientId;
    }

    if (originalEbayClientSecret === undefined) {
      delete process.env.EBAY_CLIENT_SECRET;
    } else {
      process.env.EBAY_CLIENT_SECRET = originalEbayClientSecret;
    }
  });

  async function loadApp() {
    jest.doMock('../../src/config/prisma', () => ({
      __esModule: true,
      default: {
        $queryRaw: jest.fn(async () => [{ ok: 1 }]),
      },
    }));

    return require('../../src/app').default;
  }

  it('allows live eBay pulls when OAuth client credentials are configured without a pre-minted api key', async () => {
    delete process.env.EBAY_API_KEY;
    process.env.EBAY_CLIENT_ID = 'client-id';
    process.env.EBAY_CLIENT_SECRET = 'client-secret';

    const liveDeals = [
      {
        id: 'ebay-2002',
        source: 'ebay',
        sourceId: '2002',
        title: 'MacBook Air M2',
        price: 650,
        condition: 'Used',
        category: 'tech',
        location: 'Austin, TX',
        url: 'https://example.com/macbook',
        createdAt: '2026-04-21T00:00:00.000Z',
      },
    ];

    searchLiveDealsMock.mockResolvedValueOnce(liveDeals);
    persistLiveEbayDealsMock.mockResolvedValueOnce(liveDeals);

    const app = await loadApp();

    const response = await request(app)
      .get('/api/v1/deals/live/ebay?category=tech&limit=1')
      .expect(200);

    expect(searchLiveDealsMock).toHaveBeenCalledWith('tech', 1);
    expect(response.body.success).toBe(true);
    expect(response.body.data.deals).toHaveLength(1);
  });
});
