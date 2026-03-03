import { Decimal } from '@prisma/client/runtime/library';

interface MarketSample {
  observedPrice: Decimal;
  observedAt: Date;
  condition?: string | null;
  status?: string | null;
  finalPrice?: Decimal | null;
  listedAt?: Date | null;
  soldAt?: Date | null;
  daysToSell?: number | null;
  region?: string | null;
  zipPrefix?: string | null;
  title?: string | null;
  description?: string | null;
  features?: string | null;
  views?: number | null;
  saves?: number | null;
  inquiries?: number | null;
}

interface TMVConfig {
  minSamples: number;
  freshnessWindow: number; // days
  decayRate?: number;
  halfLifeDays?: number;
  minConfidence: number;
  conditionFactors?: Record<string, number>;
  comparableSimilarityThreshold?: number;
}

interface TMVContext {
  targetCondition?: string | null;
  targetRegion?: string | null;
  targetTitle?: string | null;
  targetDescription?: string | null;
  targetCategory?: string | null;
}

interface TMVResult {
  tmv: Decimal;
  confidence: number;
  sampleCount: number;
  volatility: Decimal;
  liquidityScore: number;
  estimatedDaysToSell: number | null;
}

const DEFAULT_CONDITION_FACTORS: Record<string, number> = {
  new: 1.0,
  like_new: 0.92,
  excellent: 0.85,
  good: 0.75,
  fair: 0.6,
  parts: 0.3,
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const LN_2 = Math.log(2);

type PreparedSample = {
  sample: MarketSample;
  normalizedPrice: number;
  rawPrice: number;
  weightBase: number;
  date: Date;
  region?: string | null;
  text: string;
};

export class TMVCalculator {
  constructor(private config: TMVConfig) {}

  calculate(samples: MarketSample[], context: TMVContext = {}): TMVResult | null {
    const soldSamples = this.filterSoldSamples(samples);

    if (soldSamples.length < this.config.minSamples) {
      return null;
    }

    const freshSamples = this.filterFreshSamples(soldSamples);

    if (freshSamples.length < this.config.minSamples) {
      return null;
    }

    const prepared = this.prepareSamples(freshSamples);
    const filtered = this.removeOutliers(prepared);

    if (filtered.length < this.config.minSamples) {
      return null;
    }

    const comparable = this.filterComparables(filtered, context);

    if (comparable.length < this.config.minSamples) {
      return null;
    }

    const weighted = this.applyWeights(comparable);
    const weightedMedian = this.weightedMedian(weighted);
    const weightedMean = this.weightedMean(weighted);
    const weightedTmv = this.isFiniteNumber(weightedMedian) && weightedMedian > 0
      ? weightedMedian
      : weightedMean;

    if (!this.isFiniteNumber(weightedTmv) || weightedTmv <= 0) {
      return null;
    }

    const volatility = this.calculateVolatility(
      weighted.map(w => w.normalizedPrice),
      weightedTmv
    );

    const confidence = this.calculateConfidence(
      weighted.length,
      volatility,
      weighted.map(w => w.weight)
    );

    if (confidence < this.config.minConfidence) {
      return null;
    }

    const { liquidityScore, estimatedDaysToSell } =
      this.calculateLiquidity(weighted.map(w => w.sample));

    const conditionFactor = this.getConditionFactor(context.targetCondition);
    const tmv = new Decimal(weightedTmv * conditionFactor);

    return {
      tmv,
      confidence,
      sampleCount: weighted.length,
      volatility,
      liquidityScore,
      estimatedDaysToSell,
    };
  }

  private filterSoldSamples(samples: MarketSample[]): MarketSample[] {
    return samples.filter(sample => sample.status === 'sold');
  }

  private filterFreshSamples(samples: MarketSample[]): MarketSample[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.freshnessWindow);

    return samples.filter(sample => this.getSampleDate(sample) >= cutoffDate);
  }

  private prepareSamples(samples: MarketSample[]): PreparedSample[] {
    return samples.map(sample => {
      const price = this.getSamplePrice(sample);
      const conditionFactor = this.getConditionFactor(sample.condition);
      const normalizedPrice = price / conditionFactor;
      const date = this.getSampleDate(sample);
      const weightBase = this.calculateTimeWeight(date);
      const text = this.buildSampleText(sample);

      return {
        sample,
        normalizedPrice,
        rawPrice: price,
        weightBase,
        date,
        region: sample.region,
        text,
      };
    });
  }

  private removeOutliers(samples: PreparedSample[]): PreparedSample[] {
    const prices = samples
      .map(s => s.normalizedPrice)
      .sort((a, b) => a - b);

    const q1 = this.percentile(prices, 25);
    const q3 = this.percentile(prices, 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return samples.filter(s => s.normalizedPrice >= lowerBound && s.normalizedPrice <= upperBound);
  }

  private filterComparables(samples: PreparedSample[], context: TMVContext): PreparedSample[] {
    const threshold = this.config.comparableSimilarityThreshold ?? 0.8;
    const targetText = this.buildTargetText(context);

    if (!targetText) {
      return samples;
    }

    const targetVector = this.textToVector(targetText);

    return samples.filter(sample => {
      if (!sample.text) {
        return true;
      }
      const sampleVector = this.textToVector(sample.text);
      const similarity = this.cosineSimilarity(targetVector, sampleVector);
      return similarity >= threshold;
    });
  }

  private applyWeights(samples: PreparedSample[]): Array<PreparedSample & { weight: number }> {
    return samples.map(sample => ({
      ...sample,
      weight: sample.weightBase,
    }));
  }

  private weightedMedian(samples: Array<PreparedSample & { weight: number }>): number {
    const sorted = [...samples].sort((a, b) => a.normalizedPrice - b.normalizedPrice);
    const totalWeight = sorted.reduce((sum, sample) => sum + sample.weight, 0);

    if (totalWeight <= 0) {
      return 0;
    }

    let cumulativeWeight = 0;
    for (const sample of sorted) {
      cumulativeWeight += sample.weight;
      if (cumulativeWeight >= totalWeight / 2) {
        return sample.normalizedPrice;
      }
    }

    return sorted[sorted.length - 1]?.normalizedPrice ?? 0;
  }

  private weightedMean(samples: Array<PreparedSample & { weight: number }>): number {
    const totalWeight = samples.reduce((sum, s) => sum + s.weight, 0);

    if (totalWeight <= 0) {
      return 0;
    }

    const weightedSum = samples.reduce(
      (sum, s) => sum + s.normalizedPrice * s.weight,
      0
    );

    return weightedSum / totalWeight;
  }

  private calculateVolatility(prices: number[], tmv: number): Decimal {
    if (prices.length === 0 || tmv === 0) {
      return new Decimal(0);
    }

    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / tmv;

    return new Decimal(cv);
  }

  private calculateConfidence(sampleCount: number, volatility: Decimal, weights: number[]): number {
    const sampleFactor = Math.min(sampleCount / 30, 1.0);
    const volPenalty = 1 / (1 + volatility.toNumber());
    const avgWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length;
    const recencyFactor = Math.min(avgWeight, 1.0);

    return sampleFactor * 0.4 + volPenalty * 0.4 + recencyFactor * 0.2;
  }

  private calculateLiquidity(samples: MarketSample[]): {
    liquidityScore: number;
    estimatedDaysToSell: number | null;
  } {
    const durations: number[] = [];

    for (const sample of samples) {
      if (sample.daysToSell != null) {
        durations.push(sample.daysToSell);
        continue;
      }

      if (sample.soldAt && sample.listedAt) {
        const days = (sample.soldAt.getTime() - sample.listedAt.getTime()) / MS_PER_DAY;
        durations.push(days);
      }
    }

    if (durations.length < 2) {
      return { liquidityScore: 0, estimatedDaysToSell: null };
    }

    durations.sort((a, b) => a - b);
    const medianInterval = this.percentile(durations, 50);
    const avgInterval = durations.reduce((sum, i) => sum + i, 0) / durations.length;
    const liquidityScore = 1 / (1 + medianInterval / 30);

    return {
      liquidityScore,
      estimatedDaysToSell: Math.round(avgInterval),
    };
  }

  private calculateTimeWeight(date: Date): number {
    const ageInDays = (Date.now() - date.getTime()) / MS_PER_DAY;
    const halfLifeDays = this.config.halfLifeDays ?? 7;

    if (halfLifeDays <= 0) {
      return 1;
    }

    const decayRate = this.config.decayRate ?? (LN_2 / halfLifeDays);
    return Math.exp(-decayRate * ageInDays);
  }

  private getConditionFactor(condition?: string | null): number {
    if (!condition) {
      return DEFAULT_CONDITION_FACTORS.good;
    }

    const key = condition.toLowerCase().replace(/\s+/g, '_');
    return this.config.conditionFactors?.[key] ?? DEFAULT_CONDITION_FACTORS[key] ?? DEFAULT_CONDITION_FACTORS.good;
  }

  private getSamplePrice(sample: MarketSample): number {
    const soldPrice = sample.status === 'sold' && sample.finalPrice ? sample.finalPrice : null;
    const price = soldPrice ?? sample.observedPrice;
    return price.toNumber();
  }

  private getSampleDate(sample: MarketSample): Date {
    return sample.soldAt ?? sample.observedAt ?? sample.listedAt ?? new Date(0);
  }

  private buildSampleText(sample: MarketSample): string {
    if (sample.features) {
      try {
        const parsed = JSON.parse(sample.features);
        if (parsed && typeof parsed === 'object') {
          const values = Object.values(parsed as Record<string, unknown>)
            .map(value => (value ? String(value) : ''))
            .join(' ');
          return `${sample.title ?? ''} ${sample.description ?? ''} ${values}`.trim();
        }
      } catch {
        // ignore invalid JSON and fall back to title/description only
      }
    }

    return `${sample.title ?? ''} ${sample.description ?? ''}`.trim();
  }

  private buildTargetText(context: TMVContext): string {
    return `${context.targetTitle ?? ''} ${context.targetDescription ?? ''}`.trim();
  }

  private textToVector(text: string): Map<string, number> {
    const vector = new Map<string, number>();
    const tokens = text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);

    for (const token of tokens) {
      vector.set(token, (vector.get(token) ?? 0) + 1);
    }

    return vector;
  }

  private cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (const [key, value] of a.entries()) {
      normA += value * value;
      const bValue = b.get(key);
      if (bValue) {
        dot += value * bValue;
      }
    }

    for (const value of b.values()) {
      normB += value * value;
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) {
      return 0;
    }

    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (upper >= sorted.length) {
      return sorted[lower];
    }

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  private isFiniteNumber(value: number): boolean {
    return Number.isFinite(value);
  }
}
