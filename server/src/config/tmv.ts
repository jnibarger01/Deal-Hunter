// TMV (True Market Value) Calculator Configuration

export interface TMVConfig {
  minSamples: number;
  freshnessWindow: number;
  halfLifeDays: number;
  minConfidence: number;
  soldWeightMultiplier: number;
  comparableSimilarityThreshold: number;
  demandThreshold: number;
  conditionFactors: Record<string, number>;
  regionalMultipliers: Record<string, number>;
}

const parseIntEnv = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const parseFloatEnv = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

export const tmvConfig: TMVConfig = {
  minSamples: parseIntEnv('TMV_MIN_SAMPLES', 8),
  freshnessWindow: parseIntEnv('TMV_FRESHNESS_WINDOW', 180),
  halfLifeDays: parseIntEnv('TMV_HALF_LIFE_DAYS', 7),
  minConfidence: parseFloatEnv('TMV_MIN_CONFIDENCE', 0.4),
  soldWeightMultiplier: parseFloatEnv('TMV_SOLD_WEIGHT_MULTIPLIER', 3),
  comparableSimilarityThreshold: parseFloatEnv('TMV_COMPARABLE_SIMILARITY_THRESHOLD', 0.8),
  demandThreshold: parseFloatEnv('TMV_DEMAND_THRESHOLD', 1),
  conditionFactors: {
    new: 1.0,
    like_new: 0.92,
    excellent: 0.85,
    good: 0.75,
    fair: 0.6,
    parts: 0.3,
  },
  regionalMultipliers: {
    SF_BAY: 1.15,
    NYC: 1.12,
    LA: 1.1,
    MIDWEST: 0.95,
    RURAL: 0.88,
  },
};

export default tmvConfig;
