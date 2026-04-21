describe('env config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('loads when required env vars are present', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

    const config = require('../../src/config/env').default;

    expect(config.database.url).toBe(process.env.DATABASE_URL);
    expect(config.apiVersion).toBe('v1');
  });

  it('throws when required env vars are missing or invalid', () => {
    delete process.env.DATABASE_URL;

    expect(() => require('../../src/config/env')).toThrow(
      'Invalid environment variables. Check .env file.'
    );
  });
});
