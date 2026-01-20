const EBAY_OAUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const EBAY_BROWSE_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search';

const buildEbayToken = async () => {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const err = new Error('Missing eBay credentials');
    err.status = 500;
    err.details = 'Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET in your environment.';
    throw err;
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'https://api.ebay.com/oauth/api_scope'
  });

  const response = await fetch(EBAY_OAUTH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    const err = new Error('eBay auth failed');
    err.status = response.status;
    err.details = text;
    throw err;
  }

  const payload = await response.json();
  return payload.access_token;
};

const buildFilter = ({ location, radiusMiles, filters }) => {
  const parts = [];

  if (location?.postalCode) {
    const radius = radiusMiles || 25;
    parts.push(`deliveryPostalCode:${location.postalCode}`);
    parts.push(`deliveryRadius:${radius}`);
  }

  if (filters?.minPrice != null) {
    parts.push(`price:[${filters.minPrice}..]`);
  }

  if (filters?.maxPrice != null) {
    parts.push(`price:[..${filters.maxPrice}]`);
  }

  return parts.join(',');
};

export const searchEbay = async ({ query, location, radiusMiles, filters }) => {
  const token = await buildEbayToken();
  const url = new URL(EBAY_BROWSE_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '24');

  const filter = buildFilter({ location, radiusMiles, filters });
  if (filter) {
    url.searchParams.set('filter', filter);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const text = await response.text();
    const err = new Error('eBay search failed');
    err.status = response.status;
    err.details = text;
    throw err;
  }

  const payload = await response.json();
  return {
    source: 'ebay',
    total: payload.total || 0,
    items: payload.itemSummaries || []
  };
};
