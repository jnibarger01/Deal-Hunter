import { Decimal } from '@prisma/client/runtime/library';
import { DealScorer } from '../../src/domain/score';

describe('DealScorer', () => {
  it('calculates a composite score from deal, tmv, and fees', () => {
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
    };
    const fees = new Decimal(10);

    const result = scorer.calculateScore(deal, tmv, fees);

    expect(result.profitMargin.toNumber()).toBeCloseTo(40, 2);
    expect(result.velocityScore.toNumber()).toBeCloseTo(50, 2);
    expect(result.riskScore.toNumber()).toBeCloseTo(20, 2);
    expect(result.compositeRank.toNumber()).toBeCloseTo(51, 2);
  });

  it('caps volatility risk contribution at 50', () => {
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
    };

    const result = scorer.calculateScore(deal, tmv, new Decimal(0));

    expect(result.riskScore.toNumber()).toBeCloseTo(55, 2);
  });
});
