import { describe, expect, it } from 'vitest';
import { adaptDealIntelligenceView } from './dealIntelligence';
import type { Deal } from '../types';

const baseDeal: Deal = {
  id: 'deal-1',
  source: 'ebay',
  sourceId: 'source-1',
  title: 'Canon EOS R6',
  description: null,
  imageUrl: null,
  price: 1000,
  condition: 'good',
  category: 'tech',
  location: 'Austin, TX',
  url: 'https://example.com/deal-1',
  createdAt: '2026-04-20T00:00:00.000Z',
};

describe('adaptDealIntelligenceView', () => {
  it('builds a typed fallback view when the intelligence endpoint has no data', () => {
    const view = adaptDealIntelligenceView(baseDeal, null, null);

    expect(view.description).toContain('Seller is offering this tech listing');
    expect(view.marketValue).toBe(1350);
    expect(view.dealScore).toBeGreaterThanOrEqual(72);
    expect(view.repairAnalysis.skillLevel).toBe('BEGINNER');
    expect(view.marketDynamics.targetPrice).toBe(1350);
    expect(view.marketDynamics.priceHistory).toHaveLength(6);
    expect(view.negotiation.targetOffer).toBe(750);
  });

  it('prefers API intelligence while normalizing short price histories', () => {
    const view = adaptDealIntelligenceView(
      {
        ...baseDeal,
        score: {
          dealId: 'deal-1',
          profitMargin: 0.22,
          velocityScore: 0.71,
          riskScore: 0.18,
          compositeRank: 91,
          calculatedAt: '2026-04-20T00:00:00.000Z',
        },
      },
      {
        repairAnalysis: {
          skillLevel: 'ADVANCED',
          summary: 'API repair summary',
          likelyIssue: 'API issue',
          partsCost: 125,
        },
        marketDynamics: {
          summary: 'API market summary',
          targetPrice: 1600,
          priceHistory: [1700, 1650, 1600],
        },
        negotiation: {
          targetOffer: 825,
          openingScript: 'API negotiation script',
        },
      },
      {
        dealId: 'deal-1',
        tmv: 1550,
        confidence: 0.84,
        sampleCount: 10,
        volatility: 0.11,
        liquidityScore: 0.8,
        estimatedDaysToSell: 5,
        calculatedAt: '2026-04-20T00:00:00.000Z',
      }
    );

    expect(view.marketValue).toBe(1550);
    expect(view.dealScore).toBe(91);
    expect(view.repairAnalysis.summary).toBe('API repair summary');
    expect(view.marketDynamics.summary).toBe('API market summary');
    expect(view.marketDynamics.targetPrice).toBe(1600);
    expect(view.marketDynamics.priceHistory).toEqual([1700, 1650, 1600, 1600, 1600, 1600]);
    expect(view.negotiation.openingScript).toBe('API negotiation script');
  });
});
