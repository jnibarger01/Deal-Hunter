import axios from 'axios';
import { load } from 'cheerio';
import { chromium, type BrowserContext, type Cookie } from 'playwright';

export type FacebookCookie = {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
};

export type FacebookListing = {
  id: string;
  source: 'facebook';
  sourceId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  price: number;
  category: string;
  location?: string;
  url: string;
  condition?: string;
};

type FacebookProfile = {
  profileName: string;
};

const FACEBOOK_MARKETPLACE_ITEM_PATH = /^\/marketplace\/item\/[^/]+\/?$/;
const FACEBOOK_HOSTS = new Set(['facebook.com', 'www.facebook.com']);
const FACEBOOK_REQUEST_TIMEOUT_MS = 15_000;

export function normalizeFacebookMarketplaceItemUrl(input: string): string {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error('Only HTTPS Facebook Marketplace item URLs are supported');
  }

  if (parsed.protocol !== 'https:' || !FACEBOOK_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error('Only HTTPS Facebook Marketplace item URLs are supported');
  }

  if (!FACEBOOK_MARKETPLACE_ITEM_PATH.test(parsed.pathname)) {
    throw new Error('Only HTTPS Facebook Marketplace item URLs are supported');
  }

  return `https://www.facebook.com${parsed.pathname.replace(/\/$/, '')}`;
}

function normalizeFacebookCookieDomain(domain?: string): string {
  const hostname = (domain ?? '.facebook.com').trim().replace(/^\./, '').toLowerCase();
  if (hostname !== 'facebook.com' && !hostname.endsWith('.facebook.com')) {
    throw new Error('Facebook cookie domains must belong to facebook.com');
  }
  return '.facebook.com';
}

const normalizeCookies = (cookies: FacebookCookie[]): Cookie[] =>
  cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: normalizeFacebookCookieDomain(cookie.domain),
    path: cookie.path ?? '/',
    httpOnly: cookie.httpOnly ?? true,
    secure: cookie.secure ?? true,
    sameSite: 'Lax',
    expires: -1,
  }));

export function parseFacebookCookieInput(cookieInput: string): FacebookCookie[] {
  const parsed = JSON.parse(cookieInput) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('Cookie JSON must be an array');
  }

  return parsed.map((item) => {
    const cookie = item as Record<string, unknown>;
    return {
      name: String(cookie.name ?? ''),
      value: String(cookie.value ?? ''),
      domain: normalizeFacebookCookieDomain(typeof cookie.domain === 'string' ? cookie.domain : undefined),
      path: typeof cookie.path === 'string' ? cookie.path : '/',
      httpOnly: typeof cookie.httpOnly === 'boolean' ? cookie.httpOnly : true,
      secure: typeof cookie.secure === 'boolean' ? cookie.secure : true,
    };
  });
}

async function withFacebookContext<T>(cookies: FacebookCookie[], callback: (context: BrowserContext) => Promise<T>) {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium';
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    const context = await browser.newContext();
    await context.addCookies(normalizeCookies(cookies));
    return await callback(context);
  } finally {
    await browser.close();
  }
}

const parseListingFromHtml = (html: string, url: string): FacebookListing => {
  const $ = load(html);
  const scripts = $('script[type="application/ld+json"]')
    .map((_, el) => $(el).text())
    .get();

  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script) as Record<string, unknown> | Array<Record<string, unknown>>;
      const entries = Array.isArray(parsed) ? parsed : [parsed];
      for (const entry of entries) {
        const offer = (entry.offers as Record<string, unknown> | undefined) ?? {};
        const image = entry.image;
        const price = Number(offer.price ?? entry.price ?? 0);
        if (!entry.name || !price) continue;
        return {
          id: String(entry.sku ?? entry.productID ?? entry.identifier ?? url),
          source: 'facebook',
          sourceId: String(entry.sku ?? entry.productID ?? entry.identifier ?? url),
          title: String(entry.name),
          description: typeof entry.description === 'string' ? entry.description : undefined,
          imageUrl: typeof image === 'string' ? image : Array.isArray(image) ? String(image[0]) : undefined,
          price,
          category: 'facebook',
          location: undefined,
          url,
          condition: typeof entry.itemCondition === 'string' ? entry.itemCondition : undefined,
        };
      }
    } catch {
      // ignore malformed ld+json blocks
    }
  }

  throw new Error('No Facebook listing data found');
};

export async function testFacebookConnection(cookies: FacebookCookie[]): Promise<FacebookProfile> {
  return withFacebookContext(cookies, async (context) => {
    const page = await context.newPage();
    await page.goto('https://www.facebook.com/me', {
      waitUntil: 'domcontentloaded',
      timeout: FACEBOOK_REQUEST_TIMEOUT_MS,
    });
    const title = await page.title();
    const profileName = title.replace(/\s*\|.*$/, '').trim() || 'Facebook Operator';
    return { profileName };
  });
}

export async function scrapeFacebookListing(url: string, cookies: FacebookCookie[]): Promise<FacebookListing> {
  const safeUrl = normalizeFacebookMarketplaceItemUrl(url);
  const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
  try {
    const response = await axios.get<string>(safeUrl, {
      headers: {
        Cookie: cookieHeader,
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
      },
      timeout: FACEBOOK_REQUEST_TIMEOUT_MS,
    });
    return parseListingFromHtml(response.data, safeUrl);
  } catch {
    return withFacebookContext(cookies, async (context) => {
      const page = await context.newPage();
      await page.goto(safeUrl, {
        waitUntil: 'domcontentloaded',
        timeout: FACEBOOK_REQUEST_TIMEOUT_MS,
      });
      const html = await page.content();
      return parseListingFromHtml(html, safeUrl);
    });
  }
}

export async function scrapeFacebookSearch(
  params: { query: string; location?: string; limit?: number },
  cookies: FacebookCookie[]
): Promise<FacebookListing[]> {
  const limit = Math.min(params.limit ?? 10, 50);
  return withFacebookContext(cookies, async (context) => {
    const page = await context.newPage();
    const query = params.location ? `${params.query} ${params.location}` : params.query;
    await page.goto(`https://www.facebook.com/marketplace/search/?query=${encodeURIComponent(query)}&exact=false`, {
      waitUntil: 'domcontentloaded',
      timeout: FACEBOOK_REQUEST_TIMEOUT_MS,
    });
    const urls = await page.$$eval('a[href*="/marketplace/item/"]', (anchors) =>
      Array.from(new Set((anchors as Array<{ href?: string }>).map((a) => a.href).filter(Boolean) as string[]))
    );
    const selected = urls.slice(0, limit);
    const listings: FacebookListing[] = [];
    for (const url of selected) {
      listings.push(await scrapeFacebookListing(url, cookies));
    }
    return listings;
  });
}
