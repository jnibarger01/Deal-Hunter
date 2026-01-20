import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../setup';

describe('Deals API', () => {
  let accessToken: string;
  let adminToken: string;

  beforeEach(async () => {
    // Create regular user
    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'user@example.com',
        password: 'Test123!',
      });

    accessToken = userResponse.body.data.tokens.accessToken;

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: 'hashedpassword',
        role: 'admin',
      },
    });

    // Generate admin token manually for testing
    const jwt = require('jsonwebtoken');
    const config = require('../../src/config/env').default;
    adminToken = jwt.sign(
      { userId: admin.id, email: admin.email, role: admin.role },
      config.jwt.secret,
      { expiresIn: '1h' }
    );

    // Create sample deals
    await prisma.deal.createMany({
      data: [
        {
          title: 'iPhone 13',
          price: 500,
          marketValue: 800,
          estimatedProfit: 200,
          dealScore: 85,
          roi: 40,
          category: 'tech',
          condition: 'good',
          itemUrl: 'https://example.com/1',
          marketplace: 'craigslist',
          status: 'active',
        },
        {
          title: 'MacBook Pro',
          price: 1000,
          marketValue: 1500,
          estimatedProfit: 400,
          dealScore: 90,
          roi: 40,
          category: 'tech',
          condition: 'good',
          itemUrl: 'https://example.com/2',
          marketplace: 'ebay',
          status: 'active',
        },
      ],
    });
  });

  describe('GET /api/v1/deals', () => {
    it('should get all active deals', async () => {
      const response = await request(app).get('/api/v1/deals').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deals).toHaveLength(2);
      expect(response.body.data.pagination).toHaveProperty('total');
    });

    it('should filter deals by category', async () => {
      const response = await request(app)
        .get('/api/v1/deals?category=tech')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deals).toHaveLength(2);
      expect(response.body.data.deals[0].category).toBe('tech');
    });

    it('should filter deals by marketplace', async () => {
      const response = await request(app)
        .get('/api/v1/deals?marketplace=craigslist')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deals).toHaveLength(1);
      expect(response.body.data.deals[0].marketplace).toBe('craigslist');
    });

    it('should sort deals by dealScore descending', async () => {
      const response = await request(app)
        .get('/api/v1/deals?sortBy=dealScore&sortOrder=desc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deals[0].dealScore).toBeGreaterThanOrEqual(
        response.body.data.deals[1].dealScore
      );
    });

    it('should search deals by title', async () => {
      const response = await request(app)
        .get('/api/v1/deals?search=iPhone')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deals).toHaveLength(1);
      expect(response.body.data.deals[0].title).toContain('iPhone');
    });

    it('should paginate deals', async () => {
      const response = await request(app)
        .get('/api/v1/deals?page=1&limit=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deals).toHaveLength(1);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
    });
  });

  describe('GET /api/v1/deals/:id', () => {
    it('should get deal by id', async () => {
      const deals = await prisma.deal.findMany();
      const dealId = deals[0].id;

      const response = await request(app)
        .get(`/api/v1/deals/${dealId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deal.id).toBe(dealId);
    });

    it('should return 404 for non-existent deal', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/v1/deals/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/deals', () => {
    const newDeal = {
      title: 'Test Deal',
      price: 100,
      marketValue: 200,
      estimatedProfit: 80,
      dealScore: 75,
      roi: 80,
      category: 'test',
      condition: 'good',
      itemUrl: 'https://example.com/test',
      marketplace: 'test',
    };

    it('should create deal as admin', async () => {
      const response = await request(app)
        .post('/api/v1/deals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newDeal)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deal.title).toBe(newDeal.title);
    });

    it('should fail to create deal as regular user', async () => {
      const response = await request(app)
        .post('/api/v1/deals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(newDeal)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/deals')
        .send(newDeal)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid data', async () => {
      const response = await request(app)
        .post('/api/v1/deals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Test' }) // Missing required fields
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/deals/categories', () => {
    it('should get all categories', async () => {
      const response = await request(app)
        .get('/api/v1/deals/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categories).toContain('tech');
    });
  });

  describe('GET /api/v1/deals/marketplaces', () => {
    it('should get all marketplaces', async () => {
      const response = await request(app)
        .get('/api/v1/deals/marketplaces')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.marketplaces.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/deals/stats', () => {
    it('should get deal statistics', async () => {
      const response = await request(app)
        .get('/api/v1/deals/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalDeals');
      expect(response.body.data).toHaveProperty('avgDealScore');
      expect(response.body.data).toHaveProperty('avgProfit');
      expect(response.body.data).toHaveProperty('topCategories');
    });
  });
});
