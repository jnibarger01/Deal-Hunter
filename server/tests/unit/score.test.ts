import { Decimal } from '@prisma/client/runtime/library';
import { DealScorer } from '../../src/domain/score';

describe('DealScorer', () => {
  it('calculates a composite score from deal, tmv, and fee assumptions', () => {
    const scorer = new DealScorer();
    const deal = {
      price: new Decimal(100),
      category: 'tech',
    };
    const tmv = {
      tmv: new Decimal(150),
      confidence: 0.8,
      volatility: new Decimal(0.1),
      liquidityScore: 0.5,
      estimatedDaysToSell: 7,
    };

    const result = scorer.calculateScore(deal, tmv, {
      platformFeeRate: 0.1,
      shippingCost: 5,
      fixedFees: 2,
    });

    expect(result.feesApplied.toNumber()).toBeCloseTo(17, 2);
    expect(result.profitMargin.toNumber()).toBeCloseTo(0.33, 2);
    expect(result.velocityScore.toNumber()).toBeCloseTo(0.57, 2);
    expect(result.riskScore.toNumber()).toBeCloseTo(0.225, 2);
    expect(result.compositeRank.toNumber()).toBeCloseTo(50.04, 2);
  });

  it('caps volatility risk contribution at 0.4 and includes liquidity risk', () => {
    const scorer = new DealScorer();
    const deal = {
      price: new Decimal(100),
      category: 'misc',
    };
    const tmv = {
      tmv: new Decimal(120),
      confidence: 0.9,
      volatility: new Decimal(2.5),
      liquidityScore: 0.2,
      estimatedDaysToSell: 20,
    };

    const result = scorer.calculateScore(deal, tmv);

    expect(result.riskScore.toNumber()).toBeCloseTo(0.42, 2);
  });

  it('rejects low-confidence TMV results from ranking', () => {
    const scorer = new DealScorer();

    expect(() =>
      scorer.calculateScore(
        {
          price: new Decimal(100),
          category: 'misc',
        },
        {
          tmv: new Decimal(130),
          confidence: 0.39,
          volatility: new Decimal(0.1),
          liquidityScore: 0.8,
        }
      )
    ).toThrow('TMV confidence is below the minimum ranking threshold');
  });
});
