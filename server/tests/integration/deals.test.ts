import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../setup';

describe('Deals API', () => {
  beforeEach(async () => {
    await prisma.deal.createMany({
      data: [
        {
          title: 'iPhone 13',
          price: 500,
          category: 'tech',
          condition: 'good',
          source: 'craigslist',
          sourceId: 'deal-1',
          url: 'https://example.com/1',
          status: 'active',
        },
        {
          title: 'MacBook Pro',
          price: 1000,
          category: 'tech',
          condition: 'good',
          source: 'ebay',
          sourceId: 'deal-2',
          url: 'https://example.com/2',
          status: 'active',
        },
      ],
    });
  });

  it('gets all active deals', async () => {
    const response = await request(app).get('/api/v1/deals').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.deals).toHaveLength(2);
    expect(response.body.data.pagination.total).toBe(2);
  });

  it('filters deals by category and search', async () => {
    const response = await request(app)
      .get('/api/v1/deals?category=tech&search=iPhone')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.deals).toHaveLength(1);
    expect(response.body.data.deals[0].title).toContain('iPhone');
  });

  it('sorts deals by price descending', async () => {
    const response = await request(app)
      .get('/api/v1/deals?sortBy=price&sortOrder=desc')
      .expect(200);

    expect(response.body.data.deals[0].price).toBeGreaterThanOrEqual(response.body.data.deals[1].price);
  });

  it('gets a deal by id', async () => {
    const deal = await prisma.deal.findFirstOrThrow({ where: { sourceId: 'deal-1' } });

    const response = await request(app)
      .get(`/api/v1/deals/${deal.id}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.deal.id).toBe(deal.id);
  });

  it('returns 404 for a missing deal', async () => {
    const response = await request(app)
      .get('/api/v1/deals/00000000-0000-0000-0000-000000000000')
      .expect(404);

    expect(response.body.success).toBe(false);
  });
});
