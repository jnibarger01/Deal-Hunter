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

const normalizeCookies = (cookies: FacebookCookie[]): Cookie[] =>
  cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain ?? '.facebook.com',
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
      domain: typeof cookie.domain === 'string' ? cookie.domain : '.facebook.com',
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
    await page.goto('https://www.facebook.com/me', { waitUntil: 'domcontentloaded' });
    const title = await page.title();
    const profileName = title.replace(/\s*\|.*$/, '').trim() || 'Facebook Operator';
    return { profileName };
  });
}

export async function scrapeFacebookListing(url: string, cookies: FacebookCookie[]): Promise<FacebookListing> {
  const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
  try {
    const response = await axios.get<string>(url, {
      headers: {
        Cookie: cookieHeader,
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
      },
    });
    return parseListingFromHtml(response.data, url);
  } catch {
    return withFacebookContext(cookies, async (context) => {
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      const html = await page.content();
      return parseListingFromHtml(html, url);
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
    const location = params.location ? `&query=${encodeURIComponent(params.query)}&exact=false` : `&query=${encodeURIComponent(params.query)}`;
    await page.goto(`https://www.facebook.com/marketplace/search/?${location}`, { waitUntil: 'domcontentloaded' });
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
