import axios from 'axios';
import { EbayClient } from '../../src/services/ebay';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EbayClient', () => {
  const client = new EbayClient({
    appId: 'test-app',
    certId: 'test-cert',
    devId: 'test-dev',
  });

  beforeEach(() => {
    mockedAxios.get.mockReset();
  });

  it('parses active listings from the API response', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        findItemsAdvancedResponse: [
          {
            searchResult: [
              {
                item: [
                  {
                    itemId: ['123'],
                    title: ['Item One'],
                    sellingStatus: [{ currentPrice: [{ __value__: '9.99' }] }],
                    condition: [{ conditionDisplayName: ['New'] }],
                    primaryCategory: [{ categoryName: ['Gadgets'] }],
                    location: ['Austin, TX'],
                    viewItemURL: ['https://example.com/1'],
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    const results = await client.searchActiveListings('camera');

    expect(results).toEqual([
      {
        itemId: '123',
        title: 'Item One',
        currentPrice: 9.99,
        condition: 'New',
        categoryName: 'Gadgets',
        location: 'Austin, TX',
        viewItemURL: 'https://example.com/1',
      },
    ]);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('FindingService/v1'),
      expect.objectContaining({
        params: expect.objectContaining({
          'OPERATION-NAME': 'findItemsAdvanced',
          keywords: 'camera',
        }),
      })
    );
  });

  it('defaults missing optional fields and passes categoryId when provided', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        findItemsAdvancedResponse: [
          {
            searchResult: [
              {
                item: [
                  {
                    itemId: ['999'],
                    title: ['Mystery Item'],
                    sellingStatus: [{ currentPrice: [{ __value__: '5.00' }] }],
                    primaryCategory: [{ categoryName: ['Unknowns'] }],
                    viewItemURL: ['https://example.com/999'],
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    const results = await client.searchActiveListings('mystery', '123');

    expect(results[0].condition).toBe('Unknown');
    expect(results[0].location).toBe('');
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        params: expect.objectContaining({
          categoryId: '123',
        }),
      })
    );
  });

  it('parses sold listings and uses an EndTimeFrom filter', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2020-01-10T00:00:00.000Z'));

    mockedAxios.get.mockResolvedValueOnce({
      data: {
        findCompletedItemsResponse: [
          {
            searchResult: [
              {
                item: [
                  {
                    itemId: ['555'],
                    sellingStatus: [{ currentPrice: [{ __value__: '42.5' }] }],
                    listingInfo: [{ endTime: ['2020-01-03T12:00:00.000Z'] }],
                    condition: [{ conditionDisplayName: ['Used'] }],
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    const results = await client.searchCompletedListings('laptop', '1234', 7);

    expect(results).toEqual([
      {
        itemId: '555',
        soldPrice: 42.5,
        soldDate: new Date('2020-01-03T12:00:00.000Z'),
        condition: 'Used',
      },
    ]);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('FindingService/v1'),
      expect.objectContaining({
        params: expect.objectContaining({
          'OPERATION-NAME': 'findCompletedItems',
          categoryId: '1234',
          'itemFilter(1).value': '2020-01-03T00:00:00.000Z',
        }),
      })
    );

    jest.useRealTimers();
  });

  it('omits categoryId for completed listings when not provided', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        findCompletedItemsResponse: [
          {
            searchResult: [
              {
                item: [],
              },
            ],
          },
        ],
      },
    });

    await client.searchCompletedListings('tablet');

    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        params: expect.not.objectContaining({
          categoryId: expect.anything(),
        }),
      })
    );
  });
});
