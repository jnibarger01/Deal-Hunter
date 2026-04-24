export type CategorySeedRow = {
  category: string;
  decayRate: number;
  minSamples: number;
  freshnessWindow: number;
};

export type RegionalSeedRow = {
  region: string;
  multiplier: number;
};

export type SeasonalitySeedRow = {
  category: string;
  month: number;
  multiplier: number;
};

export const categorySeedRows: CategorySeedRow[] = [
  { category: 'default', decayRate: 0.099, minSamples: 8, freshnessWindow: 180 },
  { category: 'automotive', decayRate: 0.05, minSamples: 12, freshnessWindow: 365 },
  { category: 'gaming', decayRate: 0.11, minSamples: 10, freshnessWindow: 180 },
  { category: 'tech', decayRate: 0.13, minSamples: 12, freshnessWindow: 150 },
  { category: 'tvs', decayRate: 0.08, minSamples: 8, freshnessWindow: 240 },
  { category: 'speakers', decayRate: 0.07, minSamples: 8, freshnessWindow: 240 },
  { category: 'tools', decayRate: 0.05, minSamples: 8, freshnessWindow: 365 },
];

export const regionalSeedRows: RegionalSeedRow[] = [
  { region: 'kansascity', multiplier: 0.98 },
  { region: 'wichita', multiplier: 0.93 },
  { region: 'stlouis', multiplier: 0.97 },
  { region: 'chicago', multiplier: 1.08 },
  { region: 'dallas', multiplier: 1.05 },
  { region: 'houston', multiplier: 1.01 },
  { region: 'austin', multiplier: 1.07 },
  { region: 'denver', multiplier: 1.04 },
  { region: 'phoenix', multiplier: 1.02 },
  { region: 'losangeles', multiplier: 1.12 },
  { region: 'seattle', multiplier: 1.09 },
  { region: 'atlanta', multiplier: 1.03 },
  { region: 'nashville', multiplier: 1.01 },
  { region: 'minneapolis', multiplier: 1.02 },
  { region: 'newyork', multiplier: 1.15 },
  { region: 'boston', multiplier: 1.1 },
  { region: 'miami', multiplier: 1.06 },
];

export const seasonalitySeedRows: SeasonalitySeedRow[] = categorySeedRows.flatMap(({ category }) =>
  Array.from({ length: 12 }, (_, index) => ({
    category,
    month: index + 1,
    multiplier: 1,
  }))
);
