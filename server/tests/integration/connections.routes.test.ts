import request from 'supertest';
import app from '../../src/app';
import config from '../../src/config/env';
import { prisma } from '../setup';

describe('Connections API', () => {
  const originalOperatorIngestToken = config.operatorIngestToken;

  beforeEach(() => {
    config.operatorIngestToken = 'operator-secret';
  });

  afterEach(() => {
    config.operatorIngestToken = originalOperatorIngestToken;
  });

  it('lists craigslist connection sources and scheduler status for operator-token requests', async () => {
    await prisma.ingestSource.create({
      data: {
        kind: 'craigslist_rss',
        enabled: true,
        config: {
          rssUrl: 'https://kansascity.craigslist.org/search/sss?format=rss',
        },
      },
    });

    const response = await request(app)
      .get('/api/v1/connections')
      .set('X-Operator-Token', 'operator-secret')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        craigslist: {
          schedulerEnabled: expect.any(Boolean),
          sources: [
            expect.objectContaining({
              kind: 'craigslist_rss',
              enabled: true,
              config: expect.objectContaining({
                rssUrl: 'https://kansascity.craigslist.org/search/sss?format=rss',
              }),
            }),
          ],
        },
        facebook: {
          status: 'not_configured',
        },
      },
    });
  });

  it('creates a craigslist ingest source for operator-token requests', async () => {
    const response = await request(app)
      .post('/api/v1/connections/craigslist/sources')
      .set('X-Operator-Token', 'operator-secret')
      .send({
        rssUrl: 'https://wichita.craigslist.org/search/sss?format=rss',
        enabled: true,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: expect.objectContaining({
        kind: 'craigslist_rss',
        enabled: true,
        config: expect.objectContaining({
          rssUrl: 'https://wichita.craigslist.org/search/sss?format=rss',
        }),
      }),
    });

    const stored = await prisma.ingestSource.findFirstOrThrow({
      where: {
        kind: 'craigslist_rss',
      },
    });

    expect(stored.config).toMatchObject({
      rssUrl: 'https://wichita.craigslist.org/search/sss?format=rss',
    });
  });

  it('updates an existing craigslist source enabled state for operator-token requests', async () => {
    const source = await prisma.ingestSource.create({
      data: {
        kind: 'craigslist_rss',
        enabled: true,
        config: {
          rssUrl: 'https://kansascity.craigslist.org/search/sss?format=rss',
        },
      },
    });

    const response = await request(app)
      .patch(`/api/v1/connections/craigslist/sources/${source.id}`)
      .set('X-Operator-Token', 'operator-secret')
      .send({ enabled: false })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: expect.objectContaining({
        id: source.id,
        enabled: false,
      }),
    });

    const updated = await prisma.ingestSource.findUniqueOrThrow({ where: { id: source.id } });
    expect(updated.enabled).toBe(false);
  });

  it('deletes an existing craigslist source for operator-token requests', async () => {
    const source = await prisma.ingestSource.create({
      data: {
        kind: 'craigslist_rss',
        enabled: true,
        config: {
          rssUrl: 'https://wichita.craigslist.org/search/sss?format=rss',
        },
      },
    });

    await request(app)
      .delete(`/api/v1/connections/craigslist/sources/${source.id}`)
      .set('X-Operator-Token', 'operator-secret')
      .expect(200);

    const deleted = await prisma.ingestSource.findUnique({ where: { id: source.id } });
    expect(deleted).toBeNull();
  });
});
