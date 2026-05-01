import { fetchCraigslistFeed, ingestCraigslistFromFeeds } from '../../src/services/craigslist';
import { prisma } from '../setup';

const rss = `
  <rss>
    <channel>
      <title>Craigslist electronics</title>
      <item>
        <title>$1,250 Sony Camera (Austin)</title>
        <link>https://austin.craigslist.org/ele/d/camera/123.html</link>
        <guid>listing-123</guid>
        <description><![CDATA[<p>Clean camera body</p>]]></description>
        <enclosure url="https://example.com/camera.jpg" />
        <pubDate>Fri, 01 May 2026 12:00:00 GMT</pubDate>
      </item>
      <item>
        <title>   </title>
      </item>
    </channel>
  </rss>
`;

describe('craigslist service', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('maps RSS feed items into normalized listings', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      text: async () => rss,
    })) as unknown as typeof fetch;

    const listings = await fetchCraigslistFeed(
      'https://austin.craigslist.org/search/ela?format=rss',
      10
    );

    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({
      id: 'listing-123',
      title: 'Sony Camera',
      description: 'Clean camera body',
      imageUrl: 'https://example.com/camera.jpg',
      price: 1250,
      category: 'electronics',
      location: 'Austin',
      url: 'https://austin.craigslist.org/ele/d/camera/123.html',
    });
  });

  it('throws for failed feed requests', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 503,
      text: async () => '',
    })) as unknown as typeof fetch;

    await expect(fetchCraigslistFeed('https://example.com/feed')).rejects.toThrow(
      'Feed request failed (503)'
    );
  });

  it('ingests successful feeds and records failed feed errors', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => rss,
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => '',
      }) as unknown as typeof fetch;

    const results = await ingestCraigslistFromFeeds([
      'https://austin.craigslist.org/search/ela?format=rss',
      'https://bad.example.com/rss',
    ]);

    expect(results[0]).toMatchObject({
      fetched: 1,
      accepted: 1,
      rejected: 0,
      errors: [],
    });
    expect(results[1].accepted).toBe(0);
    expect(results[1].errors[0]).toContain('Feed request failed (500)');

    const stored = await prisma.deal.findUnique({
      where: { source_sourceId: { source: 'craigslist', sourceId: 'listing-123' } },
    });
    expect(stored?.region).toBe('austin');
  });
});
