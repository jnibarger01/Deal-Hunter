import axios from 'axios';

interface EbayConfig {
  appId: string;
  certId: string;
  devId: string;
}

interface EbayListing {
  itemId: string;
  title: string;
  currentPrice: number;
  condition: string;
  categoryName: string;
  location: string;
  viewItemURL: string;
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

const getFirstString = (value?: string[]): string | undefined => {
  return value && value.length > 0 ? value[0] : undefined;
};

const parsePrice = (value?: string): number => {
  const parsed = value ? Number.parseFloat(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

export class EbayClient {
  private baseUrl = 'https://svcs.ebay.com/services/search/FindingService/v1';
  
  constructor(private config: EbayConfig) {}

  async searchActiveListings(
    keywords: string,
    category?: string,
    maxResults = 100
  ): Promise<EbayListing[]> {
    const params = {
      'OPERATION-NAME': 'findItemsAdvanced',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': this.config.appId,
      'RESPONSE-DATA-FORMAT': 'JSON',
      keywords,
      'paginationInput.entriesPerPage': maxResults,
      ...(category && { categoryId: category }),
    };

    const response = await axios.get(this.baseUrl, { params });
    
    return this.parseListings(response.data as EbayApiResponse);
  }

  async searchCompletedListings(
    keywords: string,
    category?: string,
    daysBack = 90
  ): Promise<EbaySoldItem[]> {
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
      currentPrice: parsePrice(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__),
      condition: getFirstString(item.condition?.[0]?.conditionDisplayName) ?? 'Unknown',
      categoryName: getFirstString(item.primaryCategory?.[0]?.categoryName) ?? '',
      location: getFirstString(item.location) ?? '',
      viewItemURL: getFirstString(item.viewItemURL) ?? '',
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

  private formatDate(daysBack: number): string {
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    return date.toISOString();
  }
}
