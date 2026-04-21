import { Decimal } from '@prisma/client/runtime/library';
import { TMVCalculator } from '../../src/domain/tmv';

const DAY_MS = 24 * 60 * 60 * 1000;

const createSample = (
  daysAgo: number,
  price: number,
  overrides: Partial<{
    status: string;
    listedDaysBeforeSale: number;
  }> = {}
) => {
  const soldAt = new Date(Date.now() - daysAgo * DAY_MS);
  const listedAt = overrides.listedDaysBeforeSale
    ? new Date(soldAt.getTime() - overrides.listedDaysBeforeSale * DAY_MS)
    : undefined;

  return {
    observedPrice: new Decimal(price),
    observedAt: soldAt,
    soldAt,
    listedAt,
    source: 'ebay',
    status: overrides.status ?? 'sold',
  };
};

describe('TMVCalculator', () => {
  const calculator = new TMVCalculator({
    minSamples: 8,
    freshnessWindow: 180,
    halfLifeDays: 30,
    minConfidence: 0.4,
  });

  it('rejects results when fewer than the minimum sold samples remain', () => {
    const samples = Array.from({ length: 7 }, (_, index) => createSample(index + 1, 100 + index));

    expect(calculator.calculate(samples)).toBeNull();
  });

  it('ignores unsold and stale samples before computing TMV', () => {
    const valid = Array.from({ length: 8 }, (_, index) => createSample(index + 1, 120 + index));
    const invalid = [
      createSample(10, 80, { status: 'active' }),
      createSample(220, 500),
    ];

    const result = calculator.calculate([...valid, ...invalid]);

    expect(result).not.toBeNull();
    expect(result?.sampleCount).toBe(8);
    expect(result?.tmv.toNumber()).toBeGreaterThan(120);
    expect(result?.tmv.toNumber()).toBeLessThan(128);
  });

  it('rejects high-price outliers using IQR filtering', () => {
    const samples = [
      ...Array.from({ length: 8 }, (_, index) => createSample(index + 1, 100 + index * 2)),
      createSample(2, 600),
    ];

    const result = calculator.calculate(samples);

    expect(result).not.toBeNull();
    expect(result?.sampleCount).toBe(8);
    expect(result?.tmv.toNumber()).toBeLessThan(120);
  });

  it('weights recent sales more heavily than older sales', () => {
    const recent = Array.from({ length: 4 }, (_, index) => createSample(index + 1, 160 + index));
    const old = Array.from({ length: 4 }, (_, index) => createSample(80 + index, 100 + index));

    const result = calculator.calculate([...recent, ...old]);

    expect(result).not.toBeNull();
    expect(result?.tmv.toNumber()).toBeGreaterThan(150);
  });

  it('rejects results when confidence falls below threshold due to volatility', () => {
    const volatileCalculator = new TMVCalculator({
      minSamples: 8,
      freshnessWindow: 180,
      halfLifeDays: 30,
      minConfidence: 0.65,
    });

    const samples = [90, 120, 180, 240, 300, 360, 420, 480].map((price, index) =>
      createSample(index + 1, price)
    );

    expect(volatileCalculator.calculate(samples)).toBeNull();
  });

  it('derives liquidity and estimated days to sell from listing history', () => {
    const samples = Array.from({ length: 8 }, (_, index) =>
      createSample(index * 3 + 1, 120 + index, { listedDaysBeforeSale: 5 + (index % 3) })
    );

    const result = calculator.calculate(samples);

    expect(result).not.toBeNull();
    expect(result?.liquidityScore).toBeGreaterThan(0);
    expect(result?.estimatedDaysToSell).toBeGreaterThanOrEqual(5);
    expect(result?.estimatedDaysToSell).toBeLessThanOrEqual(7);
  });
});
