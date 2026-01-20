export type CategoryVelocity = 'high' | 'medium' | 'low';

export type Condition = 'new' | 'used' | 'parts' | 'unknown';

export interface SoldListingInput {
  listingId: string;
  itemPrice: number;
  shippingCost: number;
  soldDate: string;
  rawCondition: string;
  title: string;
  category: string;
}

export interface SoldListing {
  listingId: string;
  itemPrice: number;
  shippingCost: number;
  soldDate: Date;
  rawCondition: string;
  title: string;
  category: string;
  condition: Condition;
}

export interface MarketMetricsInput {
  activeListingsCount: number;
  avgDaysToSell: number;
  sellThroughRate: number;
  recentSalesCount30d: number;
}

export interface MarketMetrics {
  activeListingsCount: number;
  avgDaysToSell: number;
  sellThroughRate: number;
  recentSalesCount30d: number;
}

export interface TMVResult {
  tmv: number | null;
  confidence: number;
  sampleSize: number;
  dataFreshnessDays: number;
  velocityScore: number;
  trend: string;
  trendRate: number;
  rawMedian: number | null;
  iqrFilteredMedian: number | null;
  timeWeightedMedian: number | null;
  outlierRemovalRatio: number;
  recencyDistribution: string;
  warnings: string[];
}

export interface ProfitAnalysis {
  purchasePrice: number;
  estimatedSalePrice: number;
  estimatedShipping: number;
  totalFees: number;
  netProfit: number;
  roiPercent: number;
  finalValueFee: number;
  paymentProcessingFee: number;
  fixedFees: number;
}

const CONDITION_MAPPING: Record<string, Condition> = {
  'new': 'new',
  'new other': 'new',
  'new with tags': 'new',
  'new without tags': 'new',
  'manufacturer refurbished': 'new',
  'seller refurbished': 'used',
  'like new': 'used',
  'used - like new': 'used',
  'used': 'used',
  'used - good': 'used',
  'used - acceptable': 'used',
  'open box': 'used',
  'pre-owned': 'used',
  'for parts': 'parts',
  'for parts or not working': 'parts',
  'parts only': 'parts',
  'broken': 'parts',
};

const CATEGORY_CONFIG: Record<string, [CategoryVelocity, number, number, number, number]> = {
  Electronics: ['high', 0.05, 8, 3600, 1.5],
  'Cell Phones': ['high', 0.08, 10, 1800, 1.5],
  Computers: ['high', 0.06, 8, 3600, 1.5],
  TVs: ['high', 0.04, 8, 3600, 1.5],
  Audio: ['medium', 0.02, 6, 10800, 1.5],
  Tools: ['medium', 0.01, 6, 21600, 1.5],
  'Automotive Parts': ['medium', 0.015, 8, 14400, 1.5],
  Gaming: ['high', 0.055, 8, 3600, 1.5],
  Collectibles: ['low', 0.005, 5, 43200, 2.0],
};

const DEFAULT_CONFIG: [CategoryVelocity, number, number, number, number] = [
  'medium',
  0.02,
  6,
  10800,
  1.5,
];

const EBAY_FEE_TABLE: Record<string, [number, boolean, number, boolean]> = {
  Electronics: [0.1315, false, 0, true],
  'Cell Phones': [0.15, false, 0, true],
  Computers: [0.1315, false, 0, true],
  'Automotive Parts': [0.15, false, 0, true],
  Tools: [0.1215, false, 0, true],
  Motors: [0.1, true, 250.0, false],
  Default: [0.1315, false, 0, true],
};

const PAYMENT_PROCESSING_RATE = 0.029;
const PAYMENT_PROCESSING_FIXED = 0.3;
const EBAY_ORDER_FEE = 0.3;

const FILTER_PATTERNS = [
  'lot of',
  'bundle',
  'parts only',
  'for parts',
  'read description',
  'broken',
  'as is',
  'not working',
  'damaged',
  'cracked screen',
];

const normalizeCondition = (raw: string): Condition => {
  const normalized = raw.toLowerCase().trim();
  return CONDITION_MAPPING[normalized] ?? 'unknown';
};

const parseDate = (value: string): Date | null => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

const ageDays = (soldDate: Date): number => {
  return (Date.now() - soldDate.getTime()) / 86400000;
};

const compValue = (listing: SoldListing): number => {
  return listing.itemPrice + listing.shippingCost;
};

const isSuspect = (listing: SoldListing): boolean => {
  const titleLower = listing.title.toLowerCase();
  if (FILTER_PATTERNS.some((pattern) => titleLower.includes(pattern))) {
    return true;
  }
  const value = compValue(listing);
  return value < 1.0 || value > 50000;
};

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};

const quantileInclusive = (values: number[], q: number): number => {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) {
    return sorted[0];
  }
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] === undefined) {
    return sorted[base];
  }
  return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
};

export class TMVEngine {
  private category: string;
  private velocityType: CategoryVelocity;
  private decayRate: number;
  private minSamples: number;
  private cacheTtl: number;
  private iqrMultiplier: number;

  constructor(category: string) {
    this.category = category;
    const config = CATEGORY_CONFIG[category] ?? DEFAULT_CONFIG;
    [this.velocityType, this.decayRate, this.minSamples, this.cacheTtl, this.iqrMultiplier] =
      config;
  }

  calculate(
    soldListings: SoldListing[],
    options: {
      conditionFilter?: Condition;
      marketMetrics?: MarketMetrics | null;
      maxAgeDays?: number | null;
    } = {}
  ): TMVResult {
    const warnings: string[] = [];
    let validated = this.validateAndDedupe(soldListings);

    if (options.maxAgeDays && options.maxAgeDays > 0) {
      const beforeFilter = validated.length;
      validated = validated.filter((listing) => ageDays(listing.soldDate) <= options.maxAgeDays!);
      if (validated.length < beforeFilter) {
        warnings.push(`Removed ${beforeFilter - validated.length} listings outside time window`);
      }
    }

    if (validated.length < this.minSamples) {
      return this.insufficientDataResult(validated.length);
    }

    const clean = validated.filter((listing) => !isSuspect(listing));
    if (clean.length < validated.length * 0.5) {
      warnings.push(`Removed ${validated.length - clean.length} suspect listings`);
    }

    let filtered = clean;
    if (options.conditionFilter) {
      const conditionMatches = clean.filter(
        (listing) => listing.condition === options.conditionFilter
      );
      if (conditionMatches.length < 3) {
        warnings.push(`Low sample for ${options.conditionFilter}, using all conditions`);
      } else {
        filtered = conditionMatches;
      }
    }

    if (filtered.length < this.minSamples) {
      return this.insufficientDataResult(filtered.length);
    }

    const rawValues = filtered.map(compValue);
    const rawMedian = median(rawValues);

    const { filteredListings, removalRatio } = this.iqrFilter(filtered);
    let iqrFiltered = filteredListings;
    let outlierRemovalRatio = removalRatio;
    if (iqrFiltered.length < 3) {
      warnings.push('IQR removed too many samples, using raw data');
      iqrFiltered = filtered;
      outlierRemovalRatio = 0;
    }

    const iqrMedian = median(iqrFiltered.map(compValue));
    const timeWeightedMedian = this.timeWeightedMedian(iqrFiltered);
    const recencyDistribution = this.analyzeRecency(iqrFiltered);
    const confidence = this.calculateConfidence(
      iqrFiltered,
      options.conditionFilter,
      clean,
      outlierRemovalRatio,
      recencyDistribution
    );
    const velocityScore = this.calculateVelocity(iqrFiltered, options.marketMetrics ?? null);
    const { trend, trendRate } = this.calculateTrendWindowed(iqrFiltered);
    const freshness = Math.min(...iqrFiltered.map((listing) => ageDays(listing.soldDate)));

    return {
      tmv: timeWeightedMedian,
      confidence,
      sampleSize: iqrFiltered.length,
      dataFreshnessDays: freshness,
      velocityScore,
      trend,
      trendRate,
      rawMedian,
      iqrFilteredMedian: iqrMedian,
      timeWeightedMedian,
      outlierRemovalRatio,
      recencyDistribution,
      warnings,
    };
  }

  validateAndDedupe(listings: SoldListing[]): SoldListing[] {
    const seenIds = new Set<string>();
    const validated: SoldListing[] = [];
    const now = Date.now();

    for (const listing of listings) {
      if (seenIds.has(listing.listingId)) {
        continue;
      }
      const soldTime = listing.soldDate.getTime();
      if (listing.itemPrice < 0 || listing.shippingCost < 0) {
        continue;
      }
      if (Number.isNaN(soldTime) || soldTime > now) {
        continue;
      }
      if (compValue(listing) <= 0) {
        continue;
      }
      validated.push(listing);
      seenIds.add(listing.listingId);
    }

    return validated;
  }

  iqrFilter(listings: SoldListing[]): { filteredListings: SoldListing[]; removalRatio: number } {
    if (listings.length < 4) {
      return { filteredListings: listings, removalRatio: 0 };
    }
    const values = listings.map(compValue).sort((a, b) => a - b);
    const q1 = quantileInclusive(values, 0.25);
    const q3 = quantileInclusive(values, 0.75);
    const iqr = q3 - q1;
    const lowerBound = q1 - this.iqrMultiplier * iqr;
    const upperBound = q3 + this.iqrMultiplier * iqr;
    const filteredListings = listings.filter((listing) => {
      const value = compValue(listing);
      return value >= lowerBound && value <= upperBound;
    });
    const removalRatio = (listings.length - filteredListings.length) / listings.length;
    return { filteredListings, removalRatio };
  }

  timeWeightedMedian(listings: SoldListing[]): number {
    if (listings.length === 0) {
      return 0;
    }
    const weightedValues = listings.map((listing) => {
      const weight = Math.exp(-this.decayRate * ageDays(listing.soldDate));
      return { value: compValue(listing), weight };
    });
    weightedValues.sort((a, b) => a.value - b.value);
    const totalWeight = weightedValues.reduce((sum, item) => sum + item.weight, 0);
    const target = totalWeight / 2;
    let cumulative = 0;
    for (const item of weightedValues) {
      cumulative += item.weight;
      if (cumulative >= target) {
        return item.value;
      }
    }
    return weightedValues[weightedValues.length - 1].value;
  }

  analyzeRecency(listings: SoldListing[]): string {
    if (listings.length === 0) {
      return 'unknown';
    }
    const ages = listings.map((listing) => ageDays(listing.soldDate));
    const medianAge = median(ages);
    if (medianAge < 14) {
      return 'recent';
    }
    if (medianAge < 45) {
      return 'mixed';
    }
    return 'stale';
  }

  calculateConfidence(
    filtered: SoldListing[],
    conditionFilter: Condition | undefined,
    allClean: SoldListing[],
    removalRatio: number,
    recencyDist: string
  ): number {
    let score = 100;

    if (filtered.length < 10) {
      score -= (10 - filtered.length) * 5;
    }

    const values = filtered.map(compValue);
    if (values.length >= 4) {
      const q1 = quantileInclusive(values, 0.25);
      const q3 = quantileInclusive(values, 0.75);
      const med = median(values);
      if (med > 0) {
        const varianceRatio = (q3 - q1) / med;
        const variancePenalty = Math.min(40, varianceRatio * 100);
        score -= variancePenalty;
      }
    }

    const minAge = Math.min(...filtered.map((listing) => ageDays(listing.soldDate)));
    if (minAge > 60) {
      score -= Math.min(30, (minAge - 60) * 0.5);
    }

    if (removalRatio > 0.3) {
      score -= Math.min(25, removalRatio * 50);
    }

    if (recencyDist === 'stale') {
      score -= 15;
    } else if (recencyDist === 'mixed') {
      score -= 5;
    }

    if (conditionFilter) {
      const matches = allClean.filter((listing) => listing.condition === conditionFilter);
      const matchRatio = allClean.length ? matches.length / allClean.length : 0;
      if (matchRatio < 0.3) {
        score -= 20;
      }
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  calculateVelocity(listings: SoldListing[], marketMetrics: MarketMetrics | null): number {
    if (!marketMetrics) {
      return 50;
    }
    const days = marketMetrics.avgDaysToSell;
    let daysScore = 0;
    if (days <= 2) {
      daysScore = 100;
    } else if (days >= 30) {
      daysScore = 0;
    } else {
      daysScore = Math.max(0, 100 - ((days - 2) / 28) * 100);
    }

    const active = marketMetrics.activeListingsCount;
    let saturationScore = 0;
    if (active < 50) {
      saturationScore = 100;
    } else if (active > 200) {
      saturationScore = 0;
    } else {
      saturationScore = Math.max(0, 100 - ((active - 50) / 150) * 100);
    }

    const sellThroughScore = marketMetrics.sellThroughRate * 100;

    const velocity =
      0.4 * daysScore + 0.3 * saturationScore + 0.3 * sellThroughScore;

    return Math.max(0, Math.min(100, velocity));
  }

  calculateTrendWindowed(listings: SoldListing[]): { trend: string; trendRate: number } {
    if (listings.length < 10) {
      return { trend: 'unknown', trendRate: 0 };
    }
    const now = Date.now();
    const recentWindow = now - 30 * 86400000;
    const olderWindow = now - 60 * 86400000;
    const recent = listings.filter((listing) => listing.soldDate.getTime() >= recentWindow);
    const older = listings.filter(
      (listing) =>
        listing.soldDate.getTime() >= olderWindow && listing.soldDate.getTime() < recentWindow
    );
    if (recent.length < 3 || older.length < 3) {
      return { trend: 'unknown', trendRate: 0 };
    }
    const recentMedian = median(recent.map(compValue));
    const olderMedian = median(older.map(compValue));
    if (olderMedian === 0) {
      return { trend: 'stable', trendRate: 0 };
    }
    const trendRate = (recentMedian - olderMedian) / olderMedian;
    let trend = 'stable';
    if (trendRate > 0.05) {
      trend = 'rising';
    } else if (trendRate < -0.05) {
      trend = 'falling';
    }
    return { trend, trendRate };
  }

  insufficientDataResult(sampleCount: number): TMVResult {
    return {
      tmv: null,
      confidence: 0,
      sampleSize: sampleCount,
      dataFreshnessDays: 999,
      velocityScore: 0,
      trend: 'unknown',
      trendRate: 0,
      rawMedian: null,
      iqrFilteredMedian: null,
      timeWeightedMedian: null,
      outlierRemovalRatio: 0,
      recencyDistribution: 'unknown',
      warnings: [`Insufficient data: ${sampleCount} samples (need ${this.minSamples})`],
    };
  }

  static normalizeCondition(raw: string): Condition {
    return normalizeCondition(raw);
  }

  static parseListing(input: SoldListingInput): SoldListing | null {
    const soldDate = parseDate(input.soldDate);
    if (!soldDate) {
      return null;
    }
    return {
      listingId: input.listingId,
      itemPrice: Number(input.itemPrice),
      shippingCost: Number(input.shippingCost),
      soldDate,
      rawCondition: input.rawCondition,
      title: input.title,
      category: input.category,
      condition: normalizeCondition(input.rawCondition),
    };
  }
}

export class ProfitCalculator {
  static calculate(params: {
    purchasePrice: number;
    salePrice: number;
    category: string;
    buyerShippingCharged?: number;
    shippingLabelCost?: number;
  }): ProfitAnalysis {
    const {
      purchasePrice,
      salePrice,
      category,
      buyerShippingCharged = 0,
      shippingLabelCost = 0,
    } = params;
    const [fvfRate, hasCap, capAmount, feeOnShipping] =
      EBAY_FEE_TABLE[category] ?? EBAY_FEE_TABLE.Default;
    const gross = feeOnShipping ? salePrice + buyerShippingCharged : salePrice;
    let finalValueFee = gross * fvfRate;
    if (hasCap && finalValueFee > capAmount) {
      finalValueFee = capAmount;
    }
    const paymentProcessingFee = gross * PAYMENT_PROCESSING_RATE + PAYMENT_PROCESSING_FIXED;
    const fixedFees = EBAY_ORDER_FEE;
    const totalFees = finalValueFee + paymentProcessingFee + fixedFees;
    const revenue = salePrice + buyerShippingCharged;
    const costs = purchasePrice + shippingLabelCost + totalFees;
    const netProfit = revenue - costs;
    const roiPercent = purchasePrice > 0 ? (netProfit / purchasePrice) * 100 : 0;

    return {
      purchasePrice,
      estimatedSalePrice: salePrice,
      estimatedShipping: buyerShippingCharged,
      totalFees,
      netProfit,
      roiPercent,
      finalValueFee,
      paymentProcessingFee,
      fixedFees,
    };
  }
}

export class DealScorer {
  static score(listingPrice: number, tmvResult: TMVResult, profit: ProfitAnalysis): number {
    if (!tmvResult.tmv || tmvResult.confidence < 60) {
      return 0;
    }
    const discount = (tmvResult.tmv - listingPrice) / tmvResult.tmv;
    const discountScore = Math.max(0, Math.min(100, discount * 200));
    const velocityScore = tmvResult.velocityScore;
    const marginScore = Math.max(0, Math.min(100, profit.roiPercent * 2));
    const confidenceScore = tmvResult.confidence;

    let trendMultiplier = 1.0;
    if (tmvResult.confidence >= 70) {
      if (tmvResult.trend === 'falling' && tmvResult.trendRate < -0.1) {
        trendMultiplier = 0.85;
      } else if (tmvResult.trend === 'rising' && tmvResult.trendRate > 0.1) {
        trendMultiplier = 1.1;
      }
    }

    const dealScore =
      (0.4 * discountScore +
        0.3 * velocityScore +
        0.2 * marginScore +
        0.1 * confidenceScore) *
      trendMultiplier;

    return Math.max(0, Math.min(100, Math.round(dealScore)));
  }
}

export const parseConditionFilter = (raw?: string): Condition | undefined => {
  if (!raw) {
    return undefined;
  }
  const normalized = raw.toLowerCase().trim();
  if (normalized === 'unknown') {
    return 'unknown';
  }
  if (CONDITION_MAPPING[normalized]) {
    return CONDITION_MAPPING[normalized];
  }
  return undefined;
};
