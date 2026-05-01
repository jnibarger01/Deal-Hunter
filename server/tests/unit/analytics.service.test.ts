import analyticsService from '../../src/services/analytics.service';
import config from '../../src/config/env';
import { prisma } from '../setup';

const createDeal = async (overrides: Record<string, unknown> = {}) =>
  prisma.deal.create({
    data: {
      title: 'Analytics Coverage Deal',
      price: 100,
      category: 'electronics',
      source: 'ebay',
      sourceId: `analytics-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: 'active',
      condition: 'Fair repair',
      location: 'Austin, TX',
      ...overrides,
    },
  });

describe('AnalyticsService', () => {
  const originalGeminiKey = config.apiKeys.gemini;
  const originalFetch = global.fetch;

  afterEach(() => {
    config.apiKeys.gemini = originalGeminiKey;
    global.fetch = originalFetch;
  });

  it('resolves default platform fee rates by source', () => {
    expect(analyticsService.getDefaultPlatformFeeRate('ebay')).toBe(0.13);
    expect(analyticsService.getDefaultPlatformFeeRate(' FB Marketplace ')).toBe(0.05);
    expect(analyticsService.getDefaultPlatformFeeRate('unknown-market')).toBe(0.1);
    expect(analyticsService.getDefaultPlatformFeeRate()).toBe(0.1);
  });

  it('returns TMV assumptions defaults when no ranked samples match', async () => {
    const result = await analyticsService.getTMVAssumptions({ source: 'ebay' });

    expect(result).toMatchObject({
      source: 'ebay',
      category: null,
      sampleSize: 0,
      recommendedFeePct: 13,
      recommendedDaysToSell: 7,
      confidence: 0.65,
    });
  });

  it('calculates TMV assumptions from active deals with TMV results', async () => {
    const deal = await createDeal({ category: 'electronics', price: 100 });
    await prisma.tMVResult.create({
      data: {
        dealId: deal.id,
        tmv: 150,
        confidence: 0.9,
        sampleCount: 12,
        volatility: 0.2,
        liquidityScore: 0.8,
        estimatedDaysToSell: 4,
      },
    });

    const result = await analyticsService.getTMVAssumptions({
      source: 'ebay',
      category: 'electronics',
    });

    expect(result.sampleSize).toBe(1);
    expect(result.recommendedMarkupPct).toBe(50);
    expect(result.recommendedFeePct).toBe(17.5);
    expect(result.recommendedDaysToSell).toBe(4);
    expect(result.confidence).toBe(0.9);
  });

  it('creates, lists, and deletes TMV scenarios', async () => {
    const created = await analyticsService.createTMVScenario({
      name: 'Coverage Scenario',
      category: 'electronics',
      source: 'ebay',
      buyPrice: 40,
      expectedSalePrice: 80,
      notes: 'test notes',
    });

    expect(created).toMatchObject({
      name: 'Coverage Scenario',
      buyPrice: 40,
      expectedSalePrice: 80,
      shippingCost: 0,
      platformFeePct: 0,
      prepCost: 0,
      taxPct: 0,
      notes: 'test notes',
    });

    const scenarios = await analyticsService.listTMVScenarios();
    expect(scenarios).toEqual([expect.objectContaining({ id: created.id })]);

    await analyticsService.deleteTMVScenario(created.id);
    await expect(prisma.tMVScenario.findUnique({ where: { id: created.id } })).resolves.toBeNull();
  });

  it('scores a deal using default and explicit fee assumptions', async () => {
    const deal = await createDeal({ source: 'some-new-market', price: 80 });
    await prisma.tMVResult.create({
      data: {
        dealId: deal.id,
        tmv: 120,
        confidence: 0.8,
        sampleCount: 10,
        volatility: 0.2,
        liquidityScore: 0.7,
        estimatedDaysToSell: 5,
      },
    });

    const defaultScore = await analyticsService.calculateAndPersistScore(deal.id);
    const explicitScore = await analyticsService.calculateAndPersistScore(deal.id, {
      platformFeeRate: 0.05,
      shippingCost: 4,
      fixedFees: 1,
    });

    expect(defaultScore).toHaveProperty('compositeRank');
    expect(explicitScore.feesApplied).toBeGreaterThan(0);
  });

  it('throws current score precondition errors', async () => {
    await expect(analyticsService.calculateAndPersistScore('missing')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Deal not found',
    });

    const deal = await createDeal();
    await expect(analyticsService.calculateAndPersistScore(deal.id)).rejects.toMatchObject({
      statusCode: 400,
      message: 'TMV must be calculated before scoring',
    });
  });

  it('returns deterministic fallback deal intelligence without Gemini', async () => {
    config.apiKeys.gemini = undefined;
    const deal = await createDeal();
    await prisma.tMVResult.create({
      data: {
        dealId: deal.id,
        tmv: 175,
        confidence: 0.8,
        sampleCount: 9,
        volatility: 0.2,
        liquidityScore: 0.8,
        estimatedDaysToSell: 5,
      },
    });

    const result = await analyticsService.getDealIntelligence(deal.id);

    expect(result.repairAnalysis.skillLevel).toBe('INTERMEDIATE');
    expect(result.marketDynamics.targetPrice).toBe(175);
    expect(result.marketDynamics.priceHistory).toHaveLength(6);
    expect(result.negotiation.openingScript).toContain('Austin, TX');
  });

  it('normalizes Gemini deal intelligence responses', async () => {
    config.apiKeys.gemini = 'gemini-test-key';
    const deal = await createDeal({ condition: 'Like new', location: null });
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    repairAnalysis: {
                      skillLevel: 'ADVANCED',
                      summary: 'AI repair summary',
                      partsCost: 25,
                    },
                    marketDynamics: {
                      targetPrice: 220,
                      priceHistory: [220, 210],
                    },
                    negotiation: {
                      targetOffer: 75,
                    },
                  }),
                },
              ],
            },
          },
        ],
      }),
    })) as unknown as typeof fetch;

    const result = await analyticsService.getDealIntelligence(deal.id);

    expect(result.repairAnalysis).toMatchObject({
      skillLevel: 'ADVANCED',
      summary: 'AI repair summary',
      partsCost: 25,
    });
    expect(result.repairAnalysis.likelyIssue).toBe('No obvious defect is called out in the listing details.');
    expect(result.marketDynamics.targetPrice).toBe(220);
    expect(result.marketDynamics.priceHistory).toHaveLength(6);
    expect(result.negotiation.targetOffer).toBe(75);
    expect(result.negotiation.openingScript).toContain('Analytics Coverage Deal');
  });

  it('falls back when Gemini is unavailable or malformed', async () => {
    config.apiKeys.gemini = 'gemini-test-key';
    const deal = await createDeal({ price: 50, condition: 'Good' });

    global.fetch = jest.fn(async () => ({
      ok: false,
      json: async () => ({}),
    })) as unknown as typeof fetch;

    const notOk = await analyticsService.getDealIntelligence(deal.id);
    expect(notOk.marketDynamics.targetPrice).toBe(150);

    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: '{' }] } }] }),
    })) as unknown as typeof fetch;

    const malformed = await analyticsService.getDealIntelligence(deal.id);
    expect(malformed.marketDynamics.targetPrice).toBe(150);
  });
});
