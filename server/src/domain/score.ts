import { Decimal } from '@prisma/client/runtime/library';

interface TMVResult {
  tmv: Decimal;
  confidence: number;
  volatility: Decimal;
  liquidityScore: number;
}

interface Deal {
  price: Decimal;
  category: string;
}

interface ScoreResult {
  profitMargin: Decimal;
  velocityScore: Decimal;
  riskScore: Decimal;
  compositeRank: Decimal; // 0-100
}

export class DealScorer {
  calculateScore(deal: Deal, tmv: TMVResult, fees: Decimal): ScoreResult {
    // 1. Profit Margin
    const netProfit = tmv.tmv.minus(deal.price).minus(fees);
    const profitMargin = netProfit.dividedBy(deal.price).times(100);

    // 2. Velocity Score (liquidity-based)
    const velocityScore = new Decimal(tmv.liquidityScore * 100);

    // 3. Risk Score (inverse of confidence + volatility penalty)
    const riskScore = this.calculateRisk(tmv);

    // 4. Composite Rank (weighted)
    const compositeRank = this.calculateComposite(
      profitMargin,
      velocityScore,
      riskScore
    );

    return {
      profitMargin,
      velocityScore,
      riskScore,
      compositeRank,
    };
  }

  private calculateRisk(tmv: TMVResult): Decimal {
    // Risk = (1 - confidence) * 50 + volatility * 50
    const confidenceRisk = (1 - tmv.confidence) * 50;
    const volatilityRisk = Math.min(tmv.volatility.toNumber() * 100, 50);
    
    return new Decimal(confidenceRisk + volatilityRisk);
  }

  private calculateComposite(
    profitMargin: Decimal,
    velocityScore: Decimal,
    riskScore: Decimal
  ): Decimal {
    // Normalize profit margin to 0-100 scale
    const normalizedProfit = Math.min(Math.max(profitMargin.toNumber(), 0), 100);
    
    // Composite: 50% profit, 30% velocity, 20% inverse risk
    const composite = 
      normalizedProfit * 0.5 +
      velocityScore.toNumber() * 0.3 +
      (100 - riskScore.toNumber()) * 0.2;

    return new Decimal(Math.min(Math.max(composite, 0), 100));
  }
}
