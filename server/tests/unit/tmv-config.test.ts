describe('tmvConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses provided numeric env values when valid', async () => {
    process.env.TMV_MIN_SAMPLES = '12';
    process.env.TMV_HALF_LIFE_DAYS = '9';
    process.env.TMV_MIN_CONFIDENCE = '0.7';
    process.env.TMV_SOLD_WEIGHT_MULTIPLIER = '4.5';

    const { tmvConfig } = await import('../../src/config/tmv');

    expect(tmvConfig.minSamples).toBe(12);
    expect(tmvConfig.halfLifeDays).toBe(9);
    expect(tmvConfig.minConfidence).toBeCloseTo(0.7, 5);
    expect(tmvConfig.soldWeightMultiplier).toBeCloseTo(4.5, 5);
  });

  it('falls back to defaults for invalid env values', async () => {
    process.env.TMV_MIN_SAMPLES = 'not-a-number';
    process.env.TMV_FRESHNESS_WINDOW = 'bad';
    process.env.TMV_MIN_CONFIDENCE = 'oops';
    process.env.TMV_DEMAND_THRESHOLD = 'NaN';

    const { tmvConfig } = await import('../../src/config/tmv');

    expect(tmvConfig.minSamples).toBe(8);
    expect(tmvConfig.freshnessWindow).toBe(180);
    expect(tmvConfig.minConfidence).toBeCloseTo(0.4, 5);
    expect(tmvConfig.demandThreshold).toBeCloseTo(1, 5);
  });
});
