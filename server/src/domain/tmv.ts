import { Decimal } from '@prisma/client/runtime/library';

type DecimalLike = Decimal | number;

export interface MarketSample {
  observedPrice: DecimalLike;
  observedAt: Date;
  source: string;
  status?: string | null;
  listedAt?: Date | null;
  soldAt?: Date | null;
  daysToSell?: number | null;
}

export interface TMVConfig {
  minSamples: number;
  freshnessWindow: number;
  halfLifeDays: number;
  minConfidence: number;
}

export interface TMVContext {
  targetCategory?: string | null;
}

export interface TMVResult {
  tmv: Decimal;
  confidence: number;
  sampleCount: number;
  volatility: Decimal;
  liquidityScore: number;
  estimatedDaysToSell: number | null;
}

type WeightedSample = {
  price: number;
  soldDate: Date;
  daysOld: number;
  weight: number;
  daysToSell: number | null;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const LN_2 = Math.log(2);

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const toNumber = (value: DecimalLike): number => {
  return value instanceof Decimal ? value.toNumber() : value;
};

export class TMVCalculator {
  constructor(private readonly config: TMVConfig) {}

  calculate(samples: MarketSample[], _context: TMVContext = {}): TMVResult | null {
    const soldSamples = this.filterSoldSamples(samples);
    const freshSamples = this.filterFreshSamples(soldSamples);

    if (freshSamples.length < this.config.minSamples) {
      return null;
    }

    const filteredPrices = this.removeOutliers(freshSamples);

    if (filteredPrices.length < this.config.minSamples) {
      return null;
    }

    const weightedSamples = this.applyTimeWeights(filteredPrices);
    const tmv = this.weightedMedian(weightedSamples) ?? this.weightedMean(weightedSamples);

    if (tmv === null || !Number.isFinite(tmv) || tmv <= 0) {
      return null;
    }

    const volatility = this.calculateVolatility(weightedSamples, tmv);
    const confidence = this.calculateConfidence(weightedSamples, volatility);

    if (confidence < this.config.minConfidence) {
      return null;
    }

    const { liquidityScore, estimatedDaysToSell } = this.calculateLiquidity(weightedSamples);

    return {
      tmv: new Decimal(Number(tmv.toFixed(2))),
      confidence,
      sampleCount: weightedSamples.length,
      volatility: new Decimal(Number(volatility.toFixed(4))),
      liquidityScore,
      estimatedDaysToSell,
    };
  }

  private filterSoldSamples(samples: MarketSample[]): MarketSample[] {
    return samples.filter((sample) => (sample.status ?? 'sold') === 'sold');
  }

  private filterFreshSamples(samples: MarketSample[]): MarketSample[] {
    const cutoff = Date.now() - this.config.freshnessWindow * MS_PER_DAY;

    return samples.filter((sample) => this.getSoldDate(sample).getTime() >= cutoff);
  }

  private removeOutliers(samples: MarketSample[]): MarketSample[] {
    const prices = samples.map((sample) => toNumber(sample.observedPrice)).sort((a, b) => a - b);
    const q1 = this.percentile(prices, 0.25);
    const q3 = this.percentile(prices, 0.75);
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return samples.filter((sample) => {
      const price = toNumber(sample.observedPrice);
      return price >= lowerBound && price <= upperBound;
    });
  }

  private applyTimeWeights(samples: MarketSample[]): WeightedSample[] {
    const decayRate = this.config.halfLifeDays > 0 ? LN_2 / this.config.halfLifeDays : 0;

    return samples.map((sample) => {
      const soldDate = this.getSoldDate(sample);
      const daysOld = Math.max(0, (Date.now() - soldDate.getTime()) / MS_PER_DAY);
      const weight = Math.exp(-decayRate * daysOld);
      const daysToSell = this.resolveDaysToSell(sample);

      return {
        price: toNumber(sample.observedPrice),
        soldDate,
        daysOld,
        weight,
        daysToSell,
      };
    });
  }

  private weightedMedian(samples: WeightedSample[]): number | null {
    const sorted = [...samples].sort((a, b) => a.price - b.price);
    const totalWeight = sorted.reduce((sum, sample) => sum + sample.weight, 0);

    if (totalWeight <= 0) {
      return null;
    }

    let runningWeight = 0;
    for (const sample of sorted) {
      runningWeight += sample.weight;
      if (runningWeight >= totalWeight / 2) {
        return sample.price;
      }
    }

    return sorted.at(-1)?.price ?? null;
  }

  private weightedMean(samples: WeightedSample[]): number | null {
    const totalWeight = samples.reduce((sum, sample) => sum + sample.weight, 0);

    if (totalWeight <= 0) {
      return null;
    }

    const weightedSum = samples.reduce((sum, sample) => sum + sample.price * sample.weight, 0);
    return weightedSum / totalWeight;
  }

  private calculateVolatility(samples: WeightedSample[], tmv: number): number {
    if (samples.length === 0 || tmv <= 0) {
      return 0;
    }

    const totalWeight = samples.reduce((sum, sample) => sum + sample.weight, 0);
    const weightedVariance =
      samples.reduce((sum, sample) => sum + sample.weight * Math.pow(sample.price - tmv, 2), 0) /
      totalWeight;

    return Math.sqrt(weightedVariance) / tmv;
  }

  private calculateConfidence(samples: WeightedSample[], volatility: number): number {
    const sampleCountScore = clamp(samples.length / (this.config.minSamples * 3), 0, 1);
    const volatilityScore = clamp(1 - volatility / 0.6, 0, 1);
    const recencyScore = clamp(
      samples.reduce((sum, sample) => sum + sample.weight, 0) / samples.length,
      0,
      1
    );

    const confidence = sampleCountScore * 0.45 + volatilityScore * 0.35 + recencyScore * 0.2;
    return Number(confidence.toFixed(4));
  }

  private calculateLiquidity(samples: WeightedSample[]): {
    liquidityScore: number;
    estimatedDaysToSell: number | null;
  } {
    const soldDates = [...samples].map((sample) => sample.soldDate).sort((a, b) => a.getTime() - b.getTime());
    const windowDays = Math.max(
      1,
      (soldDates.at(-1)!.getTime() - soldDates[0]!.getTime()) / MS_PER_DAY || 1
    );
    const salesPer30Days = samples.length / Math.max(windowDays / 30, 1);
    const liquidityScore = Number(clamp(salesPer30Days / 12, 0, 1).toFixed(4));

    const explicitDaysToSell = samples
      .map((sample) => sample.daysToSell)
      .filter((value): value is number => value !== null && value > 0)
      .sort((a, b) => a - b);

    if (explicitDaysToSell.length > 0) {
      return {
        liquidityScore,
        estimatedDaysToSell: Math.round(this.percentile(explicitDaysToSell, 0.5)),
      };
    }

    if (soldDates.length < 2) {
      return { liquidityScore, estimatedDaysToSell: null };
    }

    const gaps = soldDates
      .slice(1)
      .map((date, index) => (date.getTime() - soldDates[index]!.getTime()) / MS_PER_DAY)
      .filter((gap) => gap > 0)
      .sort((a, b) => a - b);

    return {
      liquidityScore,
      estimatedDaysToSell: gaps.length > 0 ? Math.round(this.percentile(gaps, 0.5)) : null,
    };
  }

  private resolveDaysToSell(sample: MarketSample): number | null {
    if (sample.daysToSell != null && sample.daysToSell > 0) {
      return sample.daysToSell;
    }

    if (sample.listedAt && sample.soldAt) {
      const days = (sample.soldAt.getTime() - sample.listedAt.getTime()) / MS_PER_DAY;
      return days > 0 ? days : null;
    }

    return null;
  }

  private getSoldDate(sample: MarketSample): Date {
    return sample.soldAt ?? sample.observedAt;
  }

  private percentile(values: number[], percentile: number): number {
    if (values.length === 0) {
      return 0;
    }

    const index = (values.length - 1) * percentile;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return values[lower]!;
    }

    const weight = index - lower;
    return values[lower]! * (1 - weight) + values[upper]! * weight;
  }
}
