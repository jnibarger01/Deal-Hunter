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
    
    return this.parseListings(response.data);
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
    
    return this.parseSoldItems(response.data);
  }

  private parseListings(data: any): EbayListing[] {
    const items = data?.findItemsAdvancedResponse?.[0]?.searchResult?.[0]?.item || [];
    
    return items.map((item: any) => ({
      itemId: item.itemId[0],
      title: item.title[0],
      currentPrice: parseFloat(item.sellingStatus[0].currentPrice[0].__value__),
      condition: item.condition?.[0]?.conditionDisplayName?.[0] || 'Unknown',
      categoryName: item.primaryCategory[0].categoryName[0],
      location: item.location?.[0] || '',
      viewItemURL: item.viewItemURL[0],
    }));
  }

  private parseSoldItems(data: any): EbaySoldItem[] {
    const items = data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];
    
    return items.map((item: any) => ({
      itemId: item.itemId[0],
      soldPrice: parseFloat(item.sellingStatus[0].currentPrice[0].__value__),
      soldDate: new Date(item.listingInfo[0].endTime[0]),
      condition: item.condition?.[0]?.conditionDisplayName?.[0] || 'Unknown',
    }));
  }

  private formatDate(daysBack: number): string {
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    return date.toISOString();
  }
}
