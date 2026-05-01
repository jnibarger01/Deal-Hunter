import request from 'supertest';
import app from '../../src/app';
import config from '../../src/config/env';
import { prisma } from '../setup';

describe('TMV API', () => {
  const originalOperatorIngestToken = config.operatorIngestToken;

  beforeEach(() => {
    config.operatorIngestToken = 'operator-secret';
  });

  afterEach(() => {
    config.operatorIngestToken = originalOperatorIngestToken;
  });

  it('rejects unauthenticated tmv calculation writes', async () => {
    await request(app)
      .post('/api/v1/tmv/calculate')
      .send({ dealId: 'missing-deal' })
      .expect(401);
  });

  it('returns 404 when deal is not found', async () => {
    const response = await request(app)
      .post('/api/v1/tmv/calculate')
      .set('X-Operator-Token', 'operator-secret')
      .send({ dealId: 'missing-deal' })
      .expect(404);

    expect(response.body.error).toBe('Deal not found');
  });

  it('returns 400 when there are insufficient samples', async () => {
    const deal = await prisma.deal.create({
      data: {
        title: 'TMV Deal',
        price: 100,
        category: 'test',
        source: 'tmv',
        sourceId: 'tmv-1',
      },
    });

    const response = await request(app)
      .post('/api/v1/tmv/calculate')
      .set('X-Operator-Token', 'operator-secret')
      .send({ dealId: deal.id })
      .expect(400);

    expect(response.body.error).toBe('Insufficient data for TMV');
  });
});
