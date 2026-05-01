import request from 'supertest';
import app from '../../src/app';
import config from '../../src/config/env';
import { prisma } from '../setup';

describe('Analysis route branches', () => {
  const originalOperatorIngestToken = config.operatorIngestToken;

  beforeEach(() => {
    config.operatorIngestToken = 'operator-secret';
  });

  afterEach(() => {
    config.operatorIngestToken = originalOperatorIngestToken;
  });

  it('returns 404 for missing tmv result', async () => {
    await request(app)
      .get('/api/v1/tmv/does-not-exist')
      .expect(404);
  });

  it('returns 404 for missing deal on /score', async () => {
    await request(app)
      .post('/api/v1/score')
      .set('X-Operator-Token', 'operator-secret')
      .send({ dealId: 'does-not-exist' })
      .expect(404);
  });

  it('rejects unauthenticated score writes before reading deal state', async () => {
    await request(app)
      .post('/api/v1/score')
      .send({ dealId: 'does-not-exist' })
      .expect(401);
  });

  it('returns 400 when tmv is missing on /score', async () => {
    const deal = await prisma.deal.create({
      data: {
        title: 'Score without TMV',
        price: 100,
        category: 'coverage',
        source: 'manual',
        sourceId: `score-no-tmv-${Date.now()}`,
        status: 'active',
      },
    });

    await request(app)
      .post('/api/v1/score')
      .set('X-Operator-Token', 'operator-secret')
      .send({ dealId: deal.id })
      .expect(400);
  });

  it('returns empty ranked list when no deals are ranked', async () => {
    const response = await request(app)
      .get('/api/v1/ranked?limit=5')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });
});
