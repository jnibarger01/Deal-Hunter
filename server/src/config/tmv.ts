// TMV (True Market Value) Calculator Configuration

export interface TMVConfig {
  minSamples: number;
  freshnessWindow: number;
  halfLifeDays: number;
  minConfidence: number;
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
};

export default tmvConfig;
