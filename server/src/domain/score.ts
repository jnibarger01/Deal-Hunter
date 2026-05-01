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

export interface FeeAssumptions {
  platformFeeRate?: number;
  shippingCost?: number;
  fixedFees?: number;
}

interface ScoreResult {
  profitMargin: Decimal;
  velocityScore: Decimal;
  riskScore: Decimal;
  compositeRank: Decimal; // 0-100
  feesApplied: Decimal;
}

export class DealScorer {
  calculateScore(
    deal: Deal,
    tmv: TMVResult,
    feeAssumptions: FeeAssumptions = {}
  ): ScoreResult {
    const fees = this.calculateFees(deal.price, feeAssumptions);

    const netProfit = tmv.tmv.minus(deal.price).minus(fees);
    const profitMargin = netProfit.dividedBy(deal.price);

    const velocityScore = new Decimal(tmv.liquidityScore);
    const riskScore = this.calculateRisk(tmv);

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
      feesApplied: fees,
    };
  }

  private calculateFees(dealPrice: Decimal, feeAssumptions: FeeAssumptions): Decimal {
    const platformFeeRate = feeAssumptions.platformFeeRate ?? 0;
    const shippingCost = feeAssumptions.shippingCost ?? 0;
    const fixedFees = feeAssumptions.fixedFees ?? 0;

    const platformFees = dealPrice.times(platformFeeRate);
    return platformFees.plus(shippingCost).plus(fixedFees);
  }

  private calculateRisk(tmv: TMVResult): Decimal {
    const confidenceRisk = (1 - tmv.confidence) * 0.4;
    const volatilityRisk = Math.min(tmv.volatility.toNumber(), 0.4);
    const liquidityRisk = (1 - Math.max(0, Math.min(1, tmv.liquidityScore))) * 0.2;

    return new Decimal(confidenceRisk + volatilityRisk + liquidityRisk);
  }

  private calculateComposite(
    profitMargin: Decimal,
    velocityScore: Decimal,
    riskScore: Decimal
  ): Decimal {
    const normalizedProfit = Math.min(Math.max(profitMargin.toNumber(), 0), 1);
    const normalizedVelocity = Math.min(Math.max(velocityScore.toNumber(), 0), 1);
    const normalizedRisk = Math.min(Math.max(riskScore.toNumber(), 0), 1);

    const composite =
      (normalizedProfit * 0.5 +
        normalizedVelocity * 0.3 +
        (1 - normalizedRisk) * 0.2) *
      100;

    return new Decimal(Math.min(Math.max(composite, 0), 100));
  }
}
