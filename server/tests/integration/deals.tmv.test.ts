import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../setup';

describe('Deals TMV API', () => {
  let accessToken: string;

  beforeEach(async () => {
    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'tmv@example.com',
        password: 'Test123!',
      });

    accessToken = userResponse.body.data.tokens.accessToken;
  });

  it('returns 404 when deal is not found', async () => {
    const response = await request(app)
      .post('/api/v1/deals/missing-deal/calculate-tmv')
      .set('Authorization', `Bearer ${accessToken}`)
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
      .post(`/api/v1/deals/${deal.id}/calculate-tmv`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);

    expect(response.body.error).toBe('Insufficient data for TMV');
  });
});
