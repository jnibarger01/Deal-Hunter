import axios from 'axios';
import { chromium } from 'playwright';
import {
  normalizeFacebookMarketplaceItemUrl,
  parseFacebookCookieInput,
  scrapeFacebookListing,
  scrapeFacebookSearch,
  testFacebookConnection,
} from '../../src/services/facebook';

jest.mock('axios');
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn(),
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedChromium = chromium as jest.Mocked<typeof chromium>;

const listingHtml = (payload: unknown) => `
  <html>
    <head>
      <script type="application/ld+json">{malformed</script>
      <script type="application/ld+json">${JSON.stringify(payload)}</script>
    </head>
  </html>
`;

describe('facebook marketplace service', () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
    mockedChromium.launch.mockReset();
  });

  it('parses cookie JSON with defaults and explicit flags', () => {
    const cookies = parseFacebookCookieInput(JSON.stringify([
      { name: 'c_user', value: '1' },
      {
        name: 'xs',
        value: 'token',
        domain: '.facebook.com',
        path: '/marketplace',
        httpOnly: false,
        secure: false,
      },
    ]));

    expect(cookies).toEqual([
      {
        name: 'c_user',
        value: '1',
        domain: '.facebook.com',
        path: '/',
        httpOnly: true,
        secure: true,
      },
      {
        name: 'xs',
        value: 'token',
        domain: '.facebook.com',
        path: '/marketplace',
        httpOnly: false,
        secure: false,
      },
    ]);
    expect(() => parseFacebookCookieInput('{}')).toThrow('Cookie JSON must be an array');
    expect(() =>
      parseFacebookCookieInput(JSON.stringify([{ name: 'xs', value: 'token', domain: '.example.com' }]))
    ).toThrow('Facebook cookie domains must belong to facebook.com');
  });

  it('normalizes and scrapes HTTPS Facebook marketplace item URLs only', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: listingHtml([
        { name: 'No price', offers: {} },
        {
          sku: 'fb-1',
          name: 'Facebook Listing',
          description: 'Clean local item',
          image: ['https://example.com/image.jpg'],
          offers: { price: '125' },
          itemCondition: 'Used',
        },
      ]),
    });

    expect(normalizeFacebookMarketplaceItemUrl('https://facebook.com/marketplace/item/1')).toBe(
      'https://www.facebook.com/marketplace/item/1'
    );

    const result = await scrapeFacebookListing('https://facebook.com/marketplace/item/1', [
      { name: 'c_user', value: '1' },
    ]);

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://www.facebook.com/marketplace/item/1',
      expect.objectContaining({
        headers: expect.objectContaining({ Cookie: 'c_user=1' }),
        timeout: expect.any(Number),
      })
    );
    expect(result).toMatchObject({
      id: 'fb-1',
      source: 'facebook',
      sourceId: 'fb-1',
      title: 'Facebook Listing',
      description: 'Clean local item',
      imageUrl: 'https://example.com/image.jpg',
      price: 125,
      category: 'facebook',
      condition: 'Used',
    });
  });

  it.each([
    ['http URL', 'http://www.facebook.com/marketplace/item/1'],
    ['non-Facebook URL', 'https://evil.example/marketplace/item/1'],
    ['localhost URL', 'https://localhost/marketplace/item/1'],
    ['private IP URL', 'https://127.0.0.1/marketplace/item/1'],
    ['internal metadata URL', 'https://169.254.169.254/marketplace/item/1'],
  ])('rejects unsafe marketplace listing URL: %s', async (_label, url) => {
    await expect(scrapeFacebookListing(url, [{ name: 'c_user', value: '1' }])).rejects.toThrow(
      'Only HTTPS Facebook Marketplace item URLs are supported'
    );
    expect(mockedAxios.get).not.toHaveBeenCalled();
    expect(mockedChromium.launch).not.toHaveBeenCalled();
  });

  it('never forwards Facebook cookies to non-Facebook hosts', async () => {
    await expect(
      scrapeFacebookListing('https://example.com/marketplace/item/1', [{ name: 'xs', value: 'secret' }])
    ).rejects.toThrow('Only HTTPS Facebook Marketplace item URLs are supported');

    expect(mockedAxios.get).not.toHaveBeenCalled();
    expect(mockedChromium.launch).not.toHaveBeenCalled();
  });

  it('falls back to browser scraping when axios cannot parse a listing', async () => {
    const page = {
      goto: jest.fn(),
      content: jest.fn(async () => listingHtml({
        productID: 'fb-browser',
        name: 'Browser Listing',
        image: 'https://example.com/browser.jpg',
        price: 95,
      })),
    };
    const context = {
      addCookies: jest.fn(),
      newPage: jest.fn(async () => page),
    };
    const browser = {
      newContext: jest.fn(async () => context),
      close: jest.fn(),
    };
    mockedAxios.get.mockRejectedValueOnce(new Error('network'));
    mockedChromium.launch.mockResolvedValueOnce(browser as never);

    const result = await scrapeFacebookListing('https://facebook.com/marketplace/item/browser', [
      { name: 'xs', value: 'token', httpOnly: false },
    ]);

    expect(result.title).toBe('Browser Listing');
    expect(context.addCookies).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'xs',
        value: 'token',
        sameSite: 'Lax',
        expires: -1,
      }),
    ]);
    expect(browser.close).toHaveBeenCalled();
  });

  it('tests profile connection and scrapes search results through browser context', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: listingHtml({
          identifier: 'search-1',
          name: 'Search One',
          offers: { price: 55 },
        }),
      })
      .mockResolvedValueOnce({
        data: listingHtml({
          identifier: 'search-2',
          name: 'Search Two',
          offers: { price: 65 },
        }),
      });

    const profilePage = {
      goto: jest.fn(),
      title: jest.fn(async () => 'Operator Name | Facebook'),
      $$eval: jest.fn(),
    };
    const searchPage = {
      goto: jest.fn(),
      title: jest.fn(),
      $$eval: jest.fn(async () => [
        'https://facebook.com/marketplace/item/search-1',
        'https://facebook.com/marketplace/item/search-1',
        'https://facebook.com/marketplace/item/search-2',
      ]),
    };
    const context = {
      addCookies: jest.fn(),
      newPage: jest.fn()
        .mockResolvedValueOnce(profilePage)
        .mockResolvedValueOnce(searchPage),
    };
    const browser = {
      newContext: jest.fn(async () => context),
      close: jest.fn(),
    };
    mockedChromium.launch.mockResolvedValue(browser as never);

    const profile = await testFacebookConnection([{ name: 'c_user', value: '1' }]);
    const listings = await scrapeFacebookSearch(
      { query: 'camera', location: 'Austin', limit: 2 },
      [{ name: 'c_user', value: '1' }]
    );

    expect(profile.profileName).toBe('Operator Name');
    expect(listings.map((item) => item.sourceId)).toEqual(['search-1', 'search-2']);
    expect(profilePage.goto).toHaveBeenCalledWith(
      'https://www.facebook.com/me',
      { waitUntil: 'domcontentloaded', timeout: expect.any(Number) }
    );
    expect(searchPage.goto).toHaveBeenCalledWith(
      expect.stringContaining('query=camera%20Austin'),
      { waitUntil: 'domcontentloaded', timeout: expect.any(Number) }
    );
  });
});
