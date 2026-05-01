import request from 'supertest';
import app from '../../src/app';
import config from '../../src/config/env';
import { prisma } from '../setup';

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

  it('accepts marketplace deletion webhooks with header tokens only', async () => {
    config.marketplace.deleteToken = 'delete-token';

    await request(app)
      .post('/webhooks/marketplace-account-deletion?verification_token=delete-token')
      .send({ accountId: 'acct-1' })
      .expect(401);

    await request(app)
      .post('/webhooks/marketplace-account-deletion')
      .set('x-verification-token', 'delete-token')
      .send({ accountId: 'acct-2' })
      .expect(200);
  });

  it('deletes matching users for authorized marketplace deletion callbacks without logging raw payloads', async () => {
    config.marketplace.deleteToken = 'delete-token';
    const user = await prisma.user.create({
      data: {
        email: 'delete-me@example.com',
        password: 'hashed-password',
        isActive: true,
      },
    });

    const response = await request(app)
      .post('/webhooks/marketplace-account-deletion')
      .set('x-verification-token', 'delete-token')
      .send({ email: user.email, secretCookie: 'must-not-be-echoed' })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      deleted: true,
      userId: user.id,
    });
    expect(JSON.stringify(response.body)).not.toContain('must-not-be-echoed');
    await expect(prisma.user.findUnique({ where: { id: user.id } })).resolves.toBeNull();
  });

  it('deletes every user matched by authorized deletion identifiers', async () => {
    config.marketplace.deleteToken = 'delete-token';
    const emailUser = await prisma.user.create({
      data: {
        email: 'delete-email@example.com',
        password: 'hashed-password',
        isActive: true,
      },
    });
    const idUser = await prisma.user.create({
      data: {
        email: 'delete-id@example.com',
        password: 'hashed-password',
        isActive: true,
      },
    });

    const response = await request(app)
      .post('/webhooks/marketplace-account-deletion')
      .set('x-verification-token', 'delete-token')
      .send({ email: emailUser.email, userId: idUser.id })
      .expect(200);

    expect(response.body).toMatchObject({ success: true, deleted: true, deletedCount: 2 });
    await expect(prisma.user.findUnique({ where: { id: emailUser.id } })).resolves.toBeNull();
    await expect(prisma.user.findUnique({ where: { id: idUser.id } })).resolves.toBeNull();
  });
});
