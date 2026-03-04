import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../setup';

const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

describe('Deals extra routes', () => {
  let userToken: string;
  let dealId: string;

  beforeEach(async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail('deal-extra'),
        password: 'Test123!',
      })
      .expect(201);

    userToken = response.body.data.tokens.accessToken;

    const deal = await prisma.deal.create({
      data: {
        title: 'Route Coverage Deal',
        price: 100,
        category: 'coverage',
        source: 'ebay',
        sourceId: `coverage-${Date.now()}`,
        status: 'active',
      },
    });
    dealId = deal.id;
  });

  it('returns tmv assumptions with defaults when no samples exist', async () => {
    const response = await request(app)
      .get('/api/v1/deals/tmv-assumptions?source=ebay')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.sampleSize).toBe(0);
    expect(response.body.data.recommendedFeePct).toBe(13);
  });

  it('returns tmv assumptions using calculated averages', async () => {
    await prisma.tMVResult.create({
      data: {
        dealId,
        tmv: 150,
        confidence: 0.9,
        sampleCount: 10,
        volatility: 0.2,
        liquidityScore: 0.8,
        estimatedDaysToSell: 4,
      },
    });

    const response = await request(app)
      .get('/api/v1/deals/tmv-assumptions?source=ebay&category=coverage')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.sampleSize).toBe(1);
    expect(response.body.data.recommendedDaysToSell).toBe(4);
    expect(response.body.data.recommendedMarkupPct).toBeGreaterThan(0);
  });

  it('supports tmv scenario CRUD', async () => {
    const created = await request(app)
      .post('/api/v1/deals/tmv-scenarios')
      .send({
        name: 'Coverage Scenario',
        buyPrice: 40,
        expectedSalePrice: 80,
      })
      .expect(201);

    expect(created.body.success).toBe(true);
    expect(created.body.data.shippingCost).toBe(0);
    expect(created.body.data.platformFeePct).toBe(0);

    const list = await request(app)
      .get('/api/v1/deals/tmv-scenarios')
      .expect(200);
    expect(list.body.success).toBe(true);
    expect(Array.isArray(list.body.data)).toBe(true);
    expect(list.body.data.length).toBeGreaterThan(0);

    await request(app)
      .delete(`/api/v1/deals/tmv-scenarios/${created.body.data.id}`)
      .expect(200);
  });

  it('returns ranked deals payload for deals with tmv and score', async () => {
    await prisma.tMVResult.create({
      data: {
        dealId,
        tmv: 130,
        confidence: 0.7,
        sampleCount: 8,
        volatility: 0.3,
        liquidityScore: 0.75,
        estimatedDaysToSell: 6,
      },
    });

    await prisma.score.create({
      data: {
        dealId,
        profitMargin: 0.2,
        velocityScore: 0.6,
        riskScore: 0.3,
        compositeRank: 72,
      },
    });

    const response = await request(app)
      .get('/api/v1/deals/ranked')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('tmv');
    expect(response.body[0]).toHaveProperty('score');
  });

  it('scores a deal and handles not-found / missing tmv branches', async () => {
    await request(app)
      .post('/api/v1/deals/does-not-exist/score')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(404);

    await request(app)
      .post(`/api/v1/deals/${dealId}/score`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(400);

    await prisma.tMVResult.create({
      data: {
        dealId,
        tmv: 140,
        confidence: 0.85,
        sampleCount: 12,
        volatility: 0.2,
        liquidityScore: 0.9,
        estimatedDaysToSell: 5,
      },
    });

    const success = await request(app)
      .post(`/api/v1/deals/${dealId}/score`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(success.body.success).toBe(true);
    expect(success.body.data).toHaveProperty('compositeRank');
  });

  it('uses source fee fallback when source is unknown', async () => {
    const unknownSourceDeal = await prisma.deal.create({
      data: {
        title: 'Unknown Source',
        price: 80,
        category: 'coverage',
        source: 'some-new-market',
        sourceId: `unknown-${Date.now()}`,
        status: 'active',
      },
    });

    await prisma.tMVResult.create({
      data: {
        dealId: unknownSourceDeal.id,
        tmv: 100,
        confidence: 0.7,
        sampleCount: 8,
        volatility: 0.2,
        liquidityScore: 0.8,
        estimatedDaysToSell: 7,
      },
    });

    const response = await request(app)
      .post(`/api/v1/deals/${unknownSourceDeal.id}/score`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.compositeRank).toBeDefined();
  });
});
