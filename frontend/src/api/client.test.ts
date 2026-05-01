import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { LiveEbayDeal } from '../types';
import { api, resolveApiOrigin } from './client';

describe('frontend api client contract', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('requests TMV from the canonical /tmv/:dealId endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ dealId: 'deal-123', tmv: 450, confidence: 0.8, sampleCount: 12, volatility: 0.1, liquidityScore: 0.9, estimatedDaysToSell: 4, calculatedAt: '2026-04-19T00:00:00.000Z' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await api.getTMV('deal-123');

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/tmv/deal-123', expect.any(Object));
  });

  it('posts scoring requests to the canonical /score endpoint with dealId in the body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ dealId: 'deal-123', profitMargin: 0.25, velocityScore: 0.8, riskScore: 0.2, compositeRank: 88, calculatedAt: '2026-04-19T00:00:00.000Z' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await api.calculateScore('deal-123');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/score',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ dealId: 'deal-123' }),
      })
    );
  });

  it('requests ranked deals from the canonical /ranked endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ([]),
    });
    vi.stubGlobal('fetch', fetchMock);

    await api.getRankedDeals();

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/ranked', expect.any(Object));
  });

  it('types live ebay deals as the dedicated LiveEbayDeal contract', () => {
    expectTypeOf(api.getLiveEbayDeals).returns.resolves.toEqualTypeOf<LiveEbayDeal[]>();
  });

  it('requests live ebay deals from the canonical /deals/live/ebay endpoint with category and limit filters', async () => {
    const payload = {
      success: true,
      data: {
        source: 'ebay',
        category: 'gaming',
        deals: [
          {
            id: 'ebay-gaming-1',
            source: 'ebay',
            sourceId: 'gaming-1',
            title: 'PS5 Digital Edition',
            description: 'Fresh pull from Browse API',
            imageUrl: 'https://example.com/ps5.jpg',
            price: 220,
            condition: 'Used',
            category: 'gaming',
            location: 'Austin, TX',
            url: 'https://example.com/gaming-1',
            createdAt: '2026-04-21T00:00:00.000Z',
          },
        ],
      },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
    vi.stubGlobal('fetch', fetchMock);

    const deals = await api.getLiveEbayDeals({ category: 'gaming', limit: 6 });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/deals/live/ebay?category=gaming&limit=6',
      expect.any(Object)
    );
    expect(deals).toEqual(payload.data.deals);
  });

  it('requests ai deal intelligence from the canonical /deal-intelligence/:dealId endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { repairAnalysis: {}, marketDynamics: {}, negotiation: {} } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await api.getDealIntelligence('deal-123');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/deal-intelligence/deal-123',
      expect.any(Object)
    );
  });

  it('requests tmv assumptions from the canonical /tmv/assumptions endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { sampleSize: 0, recommendedMarkupPct: 0, recommendedFeePct: 13, recommendedDaysToSell: 7, confidence: 0.65, category: null, source: 'ebay' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await api.getTMVAssumptions({ source: 'ebay' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/tmv/assumptions?source=ebay',
      expect.any(Object)
    );
  });

  it('adds X-Operator-Token from local storage to connections requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          ebay: { status: 'configured', lastLivePullAt: null },
          craigslist: { schedulerEnabled: false, sources: [] },
          facebook: { status: 'not_configured' },
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    localStorage.setItem('deal-hunter-operator-token', 'operator-secret');

    await api.getConnections();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/connections',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Operator-Token': 'operator-secret',
        }),
      })
    );
  });

  it('requests tmv scenarios from the canonical /tmv/scenarios endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await api.getTMVScenarios();

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/tmv/scenarios', expect.any(Object));
  });

  it('uses same-origin API paths by default and rejects localhost in production config', () => {
    expect(resolveApiOrigin('', true)).toBe('');
    expect(resolveApiOrigin(undefined, true)).toBe('');
    expect(resolveApiOrigin('https://api.example.com/', true)).toBe('https://api.example.com');
    expect(() => resolveApiOrigin('http://localhost:5000', true)).toThrow(
      'VITE_API_URL must not point to localhost in production'
    );
    expect(() => resolveApiOrigin('http://user@localhost:5000', true)).toThrow(
      'VITE_API_URL must not point to localhost in production'
    );
    expect(() => resolveApiOrigin('http://0.0.0.0:5000', true)).toThrow(
      'VITE_API_URL must not point to localhost in production'
    );
    expect(() => resolveApiOrigin('http://[::ffff:127.0.0.1]:5000', true)).toThrow(
      'VITE_API_URL must not point to localhost in production'
    );
    expect(resolveApiOrigin('http://localhost:5000', false)).toBe('http://localhost:5000');
  });
});
