import request from 'supertest';
import app from '../../src/app';
import config from '../../src/config/env';

describe('App utility routes', () => {
  const originalDeleteToken = config.marketplace.deleteToken;

  afterEach(() => {
    config.marketplace.deleteToken = originalDeleteToken;
  });

  it('returns health payload', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      environment: config.env,
    });
  });

  it('rejects marketplace deletion webhooks without the configured token', async () => {
    config.marketplace.deleteToken = 'delete-token';

    await request(app)
      .post('/webhooks/marketplace-account-deletion')
      .send({ accountId: 'acct-1' })
      .expect(401);
  });

  it('accepts marketplace deletion webhooks with query or header tokens', async () => {
    config.marketplace.deleteToken = 'delete-token';

    await request(app)
      .post('/webhooks/marketplace-account-deletion?verification_token=delete-token')
      .send({ accountId: 'acct-1' })
      .expect(200);

    await request(app)
      .post('/webhooks/marketplace-account-deletion')
      .set('x-verification-token', 'delete-token')
      .send({ accountId: 'acct-2' })
      .expect(200);
  });
});
