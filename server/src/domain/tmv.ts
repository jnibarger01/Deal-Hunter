import { Decimal } from '@prisma/client/runtime/library';

interface MarketSample {
  observedPrice: Decimal;
  observedAt: Date;
  condition?: string;
}

interface TMVConfig {
  minSamples: number;
  freshnessWindow: number; // days
  decayRate: number;
  minConfidence: number;
}

interface TMVResult {
  tmv: Decimal;
  confidence: number;
  sampleCount: number;
  volatility: Decimal;
  liquidityScore: number;
  estimatedDaysToSell: number | null;
}

export class TMVCalculator {
  constructor(private config: TMVConfig) {}

  calculate(samples: MarketSample[]): TMVResult | null {
    // 1. Filter fresh samples
    const freshSamples = this.filterFreshSamples(samples);
    
    if (freshSamples.length < this.config.minSamples) {
      return null; // Not enough data
    }

    // 2. Remove outliers (IQR method)
    const cleanSamples = this.removeOutliers(freshSamples);
    
    if (cleanSamples.length < this.config.minSamples) {
      return null; // Too many outliers
    }

    // 3. Apply exponential decay weighting
    const weightedSamples = this.applyDecayWeights(cleanSamples);

    // 4. Calculate weighted median (TMV)
    const tmv = this.weightedMedian(weightedSamples);

    // 5. Calculate volatility
    const volatility = this.calculateVolatility(cleanSamples, tmv);

    // 6. Calculate confidence
    const confidence = this.calculateConfidence(
      cleanSamples.length,
      volatility,
      weightedSamples
    );

    if (confidence < this.config.minConfidence) {
      return null; // Too uncertain
    }

    // 7. Calculate liquidity metrics
    const { liquidityScore, estimatedDaysToSell } = 
      this.calculateLiquidity(cleanSamples);

    return {
      tmv,
      confidence,
      sampleCount: cleanSamples.length,
      volatility,
      liquidityScore,
      estimatedDaysToSell,
    };
  }

  private filterFreshSamples(samples: MarketSample[]): MarketSample[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.freshnessWindow);
    
    return samples.filter(s => s.observedAt >= cutoffDate);
  }

  private removeOutliers(samples: MarketSample[]): MarketSample[] {
    const prices = samples.map(s => s.observedPrice.toNumber()).sort((a, b) => a - b);
    
    const q1 = this.percentile(prices, 25);
    const q3 = this.percentile(prices, 75);
    const iqr = q3 - q1;
    
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return samples.filter(s => {
      const price = s.observedPrice.toNumber();
      return price >= lowerBound && price <= upperBound;
    });
  }

  private applyDecayWeights(samples: MarketSample[]): Array<{sample: MarketSample, weight: number}> {
    const now = Date.now();
    
    return samples.map(sample => {
      const daysOld = (now - sample.observedAt.getTime()) / (1000 * 60 * 60 * 24);
      const weight = Math.exp(-this.config.decayRate * daysOld);
      
      return { sample, weight };
    });
  }

  private weightedMedian(weighted: Array<{sample: MarketSample, weight: number}>): Decimal {
    // Sort by price
    const sorted = weighted
      .map(w => ({ price: w.sample.observedPrice.toNumber(), weight: w.weight }))
      .sort((a, b) => a.price - b.price);
    
    const totalWeight = sorted.reduce((sum, item) => sum + item.weight, 0);
    const midWeight = totalWeight / 2;
    
    let cumWeight = 0;
    for (const item of sorted) {
      cumWeight += item.weight;
      if (cumWeight >= midWeight) {
        return new Decimal(item.price);
      }
    }
    
    return new Decimal(sorted[sorted.length - 1].price);
  }

  private calculateVolatility(samples: MarketSample[], tmv: Decimal): Decimal {
    const prices = samples.map(s => s.observedPrice.toNumber());
    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    
    // Coefficient of variation (normalized volatility)
    const cv = stdDev / tmv.toNumber();
    
    return new Decimal(cv);
  }

  private calculateConfidence(
    sampleCount: number,
    volatility: Decimal,
    weighted: Array<{sample: MarketSample, weight: number}>
  ): number {
    // Sample size factor (0-1)
    const sampleFactor = Math.min(sampleCount / 30, 1.0);
    
    // Volatility penalty (inverse)
    const volPenalty = 1 / (1 + volatility.toNumber());
    
    // Recency factor (more recent = higher confidence)
    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    const avgWeight = totalWeight / weighted.length;
    const recencyFactor = Math.min(avgWeight, 1.0);
    
    // Composite confidence
    return sampleFactor * 0.4 + volPenalty * 0.4 + recencyFactor * 0.2;
  }

  private calculateLiquidity(samples: MarketSample[]): {
    liquidityScore: number;
    estimatedDaysToSell: number | null;
  } {
    if (samples.length < 2) {
      return { liquidityScore: 0, estimatedDaysToSell: null };
    }

    // Sort by date
    const sorted = samples.sort((a, b) => a.observedAt.getTime() - b.observedAt.getTime());
    
    // Calculate days between sales
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const days = (sorted[i].observedAt.getTime() - sorted[i-1].observedAt.getTime()) / (1000 * 60 * 60 * 24);
      intervals.push(days);
    }
    
    const medianInterval = this.percentile(intervals, 50);
    const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
    
    // Liquidity score: inverse of median interval (normalized)
    const liquidityScore = 1 / (1 + medianInterval / 30); // 30 days as baseline
    
    return {
      liquidityScore,
      estimatedDaysToSell: Math.round(avgInterval),
    };
  }

  private percentile(sorted: number[], p: number): number {
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
}
