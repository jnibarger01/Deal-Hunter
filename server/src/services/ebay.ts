import axios from 'axios';
import EbayAuthToken from 'ebay-oauth-nodejs-client';

interface EbayConfig {
  appId: string;
  certId: string;
  devId: string;
  oauthClientId?: string;
  oauthClientSecret?: string;
  oauthEnvironment?: 'PRODUCTION' | 'SANDBOX';
}

export type LiveEbayCategory = 'automotive' | 'gaming' | 'tech' | 'tvs' | 'speakers' | 'tools';

interface EbayListing {
  itemId: string;
  title: string;
  description: string;
  imageUrl: string;
  currentPrice: number;
  condition: string;
  categoryName: string;
  location: string;
  viewItemURL: string;
}

export interface LiveEbayDeal {
  id: string;
  source: 'ebay';
  sourceId: string;
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  condition: string;
  category: LiveEbayCategory;
  location: string;
  url: string;
  createdAt: string;
}

const LIVE_CATEGORY_KEYWORDS: Record<LiveEbayCategory, string[]> = {
  automotive: ['toyota', 'tacoma', 'head unit', 'stereo', 'oem', 'aftermarket'],
  gaming: ['ps5', 'xbox', 'nintendo switch', 'steam deck', 'gaming'],
  tech: ['macbook', 'camera', 'sony', 'nikon', 'laptop', 'monitor'],
  tvs: ['sony tv', 'lg oled', 'samsung qled', '4k tv'],
  speakers: ['jbl', 'sonos', 'soundbar', 'subwoofer', 'speaker'],
  tools: ['milwaukee', 'dewalt', 'makita', 'impact driver', 'tool kit'],
};

export function isLiveEbayCategory(value: string): value is LiveEbayCategory {
  return Object.prototype.hasOwnProperty.call(LIVE_CATEGORY_KEYWORDS, value);
}

export function getLiveEbayKeywords(category: LiveEbayCategory): string {
  return LIVE_CATEGORY_KEYWORDS[category].join(' OR ');
}

interface EbaySoldItem {
  itemId: string;
  soldPrice: number;
  soldDate: Date;
  condition: string;
}

type EbayApiItem = {
  itemId?: string[];
  title?: string[];
  subtitle?: string[];
  galleryURL?: string[];
  sellingStatus?: Array<{
    currentPrice?: Array<{
      __value__?: string;
    }>;
  }>;
  condition?: Array<{
    conditionDisplayName?: string[];
  }>;
  primaryCategory?: Array<{
    categoryName?: string[];
  }>;
  location?: string[];
  viewItemURL?: string[];
  listingInfo?: Array<{
    endTime?: string[];
  }>;
};

type EbayApiResponse = {
  findItemsAdvancedResponse?: Array<{
    searchResult?: Array<{
      item?: EbayApiItem[];
    }>;
  }>;
  findCompletedItemsResponse?: Array<{
    searchResult?: Array<{
      item?: EbayApiItem[];
    }>;
  }>;
};

type EbayBrowseItem = {
  itemId?: string;
  title?: string;
  shortDescription?: string;
  image?: {
    imageUrl?: string;
  };
  price?: {
    value?: string;
  };
  condition?: string;
  categories?: Array<{
    categoryName?: string;
  }>;
  itemLocation?: {
    city?: string;
    stateOrProvince?: string;
    country?: string;
  };
  itemWebUrl?: string;
};

type EbayBrowseResponse = {
  itemSummaries?: EbayBrowseItem[];
};

const getFirstString = (value?: string[]): string | undefined => {
  return value && value.length > 0 ? value[0] : undefined;
};

const parsePrice = (value?: string): number => {
  const parsed = value ? Number.parseFloat(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

export class EbayClient {
  private baseUrl = 'https://svcs.ebay.com/services/search/FindingService/v1';
  private browseBaseUrl = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
  
  constructor(private config: EbayConfig) {
    if (this.config.oauthEnvironment === 'SANDBOX') {
      this.browseBaseUrl = 'https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search';
    }
  }

  private usesClientCredentials(): boolean {
    return Boolean(this.config.oauthClientId && this.config.oauthClientSecret);
  }

  private isOAuthToken(): boolean {
    return this.config.appId.startsWith('v^1.1#');
  }

  async searchLiveDeals(category: LiveEbayCategory, maxResults = 12): Promise<LiveEbayDeal[]> {
    const listings = this.usesClientCredentials() || this.isOAuthToken()
      ? await this.searchBrowseListings(getLiveEbayKeywords(category), maxResults)
      : await this.searchActiveListings(getLiveEbayKeywords(category), undefined, maxResults);

    return listings.map((listing) => ({
      id: `ebay-${listing.itemId}`,
      source: 'ebay',
      sourceId: listing.itemId,
      title: listing.title,
      description: listing.description,
      imageUrl: listing.imageUrl,
      price: listing.currentPrice,
      condition: listing.condition,
      category,
      location: listing.location,
      url: listing.viewItemURL,
      createdAt: new Date().toISOString(),
    }));
  }

  async searchActiveListings(
    keywords: string,
    category?: string,
    maxResults = 100,
    options?: {
      buyerPostalCode?: string;
      maxDistance?: number;
    }
  ): Promise<EbayListing[]> {
    const params: Record<string, string | number> = {
      'OPERATION-NAME': 'findItemsAdvanced',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': this.config.appId,
      'RESPONSE-DATA-FORMAT': 'JSON',
      keywords,
      'paginationInput.entriesPerPage': maxResults,
      ...(category ? { categoryId: category } : {}),
    };

    if (options?.buyerPostalCode) {
      params.buyerPostalCode = options.buyerPostalCode;
    }

    if (options?.maxDistance && options?.buyerPostalCode) {
      params['itemFilter(0).name'] = 'MaxDistance';
      params['itemFilter(0).value'] = String(options.maxDistance);
      params['itemFilter(1).name'] = 'LocatedIn';
      params['itemFilter(1).value'] = 'US';
    }

    const response = await axios.get(this.baseUrl, { params });
    
    return this.parseListings(response.data as EbayApiResponse);
  }

  private async searchBrowseListings(keywords: string, maxResults = 12): Promise<EbayListing[]> {
    const response = await axios.get(this.browseBaseUrl, {
      headers: {
        Authorization: `Bearer ${await this.getBrowseAccessToken()}`,
        'Content-Type': 'application/json',
      },
      params: {
        q: keywords,
        limit: maxResults,
      },
    });

    return this.parseBrowseListings(response.data as EbayBrowseResponse);
  }

  private async getBrowseAccessToken(): Promise<string> {
    if (this.usesClientCredentials()) {
      const oauthClient = new EbayAuthToken({
        clientId: this.config.oauthClientId!,
        clientSecret: this.config.oauthClientSecret!,
      });
      const environment = this.config.oauthEnvironment ?? 'PRODUCTION';
      const tokenResponse = await oauthClient.getApplicationToken(environment);
      const parsed = typeof tokenResponse === 'string' ? JSON.parse(tokenResponse) : tokenResponse;
      const accessToken = parsed?.access_token;

      if (!accessToken || typeof accessToken !== 'string') {
        throw new Error('eBay OAuth token response did not include access_token');
      }

      return accessToken;
    }

    return this.config.appId;
  }

  async searchCompletedListings(
    keywords: string,
    category?: string,
    daysBack = 90
  ): Promise<EbaySoldItem[]> {
    if (this.usesClientCredentials() || this.isOAuthToken()) {
      return [];
    }

    const params = {
      'OPERATION-NAME': 'findCompletedItems',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': this.config.appId,
      'RESPONSE-DATA-FORMAT': 'JSON',
      keywords,
      'itemFilter(0).name': 'SoldItemsOnly',
      'itemFilter(0).value': 'true',
      'itemFilter(1).name': 'EndTimeFrom',
      'itemFilter(1).value': this.formatDate(daysBack),
      ...(category && { categoryId: category }),
    };

    const response = await axios.get(this.baseUrl, { params });
    
    return this.parseSoldItems(response.data as EbayApiResponse);
  }

  private parseListings(data: EbayApiResponse): EbayListing[] {
    const items = data?.findItemsAdvancedResponse?.[0]?.searchResult?.[0]?.item || [];
    
    return items.map((item) => ({
      itemId: getFirstString(item.itemId) ?? '',
      title: getFirstString(item.title) ?? '',
      description: getFirstString(item.subtitle) ?? '',
      imageUrl: getFirstString(item.galleryURL) ?? '',
      currentPrice: parsePrice(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__),
      condition: getFirstString(item.condition?.[0]?.conditionDisplayName) ?? 'Unknown',
      categoryName: getFirstString(item.primaryCategory?.[0]?.categoryName) ?? '',
      location: getFirstString(item.location) ?? '',
      viewItemURL: getFirstString(item.viewItemURL) ?? '',
    }));
  }

  private parseBrowseListings(data: EbayBrowseResponse): EbayListing[] {
    const items = data.itemSummaries ?? [];

    return items.map((item) => ({
      itemId: item.itemId ?? '',
      title: item.title ?? '',
      description: item.shortDescription ?? '',
      imageUrl: item.image?.imageUrl ?? '',
      currentPrice: parsePrice(item.price?.value),
      condition: item.condition ?? 'Unknown',
      categoryName: item.categories?.[0]?.categoryName ?? '',
      location: this.formatBrowseLocation(item.itemLocation),
      viewItemURL: item.itemWebUrl ?? '',
    }));
  }

  private parseSoldItems(data: EbayApiResponse): EbaySoldItem[] {
    const items = data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];
    
    return items.map((item) => ({
      itemId: getFirstString(item.itemId) ?? '',
      soldPrice: parsePrice(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__),
      soldDate: new Date(getFirstString(item.listingInfo?.[0]?.endTime) ?? 0),
      condition: getFirstString(item.condition?.[0]?.conditionDisplayName) ?? 'Unknown',
    }));
  }

  private formatBrowseLocation(location?: EbayBrowseItem['itemLocation']): string {
    if (!location) {
      return '';
    }

    const parts = [location.city, location.stateOrProvince].filter(
      (value): value is string => Boolean(value && value.trim())
    );

    if (parts.length > 0) {
      return parts.join(', ');
    }

    return location.country ?? '';
  }

  private formatDate(daysBack: number): string {
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    return date.toISOString();
  }
}
