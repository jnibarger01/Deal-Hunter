import request from 'supertest';
import { ListingStatus } from '@prisma/client';
import app from '../../src/app';
import { prisma } from '../setup';

describe('Analysis API', () => {
  it('calculates tmv, score, and returns ranked deals', async () => {
    const deal = await prisma.deal.create({
      data: {
        title: 'Ranked Test Deal',
        price: 100,
        category: 'test',
        condition: 'good',
        source: 'manual',
        sourceId: 'ranked-test-1',
        status: 'active',
      },
    });

    const now = Date.now();
    const samples = Array.from({ length: 8 }).map((_, index) => {
      const listedAt = new Date(now - (index + 10) * 24 * 60 * 60 * 1000);
      const soldAt = new Date(now - index * 24 * 60 * 60 * 1000);

      return {
        dealId: deal.id,
        observedPrice: 120 + index,
        observedAt: soldAt,
        source: 'ebay',
        status: ListingStatus.sold,
        listedAt,
        soldAt,
      };
    });

    await prisma.marketSample.createMany({ data: samples });

    const tmvResponse = await request(app)
      .post('/api/v1/tmv/calculate')
      .send({ dealId: deal.id })
      .expect(200);

    expect(tmvResponse.body).toHaveProperty('dealId', deal.id);
    expect(tmvResponse.body).toHaveProperty('tmv');

    const tmvGetResponse = await request(app)
      .get(`/api/v1/tmv/${deal.id}`)
      .expect(200);

    expect(tmvGetResponse.body.dealId).toBe(deal.id);

    const scoreResponse = await request(app)
      .post('/api/v1/score')
      .send({
        dealId: deal.id,
        feeAssumptions: {
          platformFeeRate: 0.1,
          shippingCost: 5,
          fixedFees: 2,
        },
      })
      .expect(200);

    expect(scoreResponse.body).toHaveProperty('dealId', deal.id);
    expect(scoreResponse.body).toHaveProperty('compositeRank');

    const rankedResponse = await request(app)
      .get('/api/v1/ranked')
      .expect(200);

    expect(Array.isArray(rankedResponse.body)).toBe(true);
    expect(rankedResponse.body.length).toBeGreaterThan(0);
    expect(rankedResponse.body[0]).toHaveProperty('tmv');
    expect(rankedResponse.body[0]).toHaveProperty('score');
  });
});
