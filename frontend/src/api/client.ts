// API client for Deal-Hunter backend
import type {
  Deal,
  RankedDeal,
  TMVResult,
  Score,
  HealthStatus,
  TMVAssumptions,
  TMVScenario,
  DealIntelligence,
  LiveEbayDeal,
  ConnectionsData,
  IngestSourceRecord,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_VERSION = 'v1';
const API_BASE = `${API_URL}/api/${API_VERSION}`;
const OPERATOR_TOKEN_STORAGE_KEY = 'deal-hunter-operator-token';

const getOperatorToken = () => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.localStorage.getItem(OPERATOR_TOKEN_STORAGE_KEY) || undefined;
};

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface DealsResponse {
  deals: Deal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface DealResponse {
  deal: Deal;
}

interface LiveDealsResponse {
  source: string;
  category: string;
  deals: LiveEbayDeal[];
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const baseUrl = endpoint.startsWith('/health') ? API_URL : API_BASE;
  const operatorToken = endpoint.startsWith('/health') ? undefined : getOperatorToken();

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(operatorToken ? { 'X-Operator-Token': operatorToken } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `API Error: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getHealth: async (): Promise<HealthStatus> => request<HealthStatus>('/health'),

  getDeals: async (): Promise<Deal[]> => {
    const res = await request<ApiResponse<DealsResponse>>('/deals');
    return res.data?.deals || [];
  },

  getDeal: async (id: string): Promise<Deal> => {
    const res = await request<ApiResponse<DealResponse>>(`/deals/${id}`);
    return res.data?.deal;
  },

  calculateTMV: (dealId: string) =>
    request<TMVResult>('/tmv/calculate', {
      method: 'POST',
      body: JSON.stringify({ dealId }),
    }),

  getTMV: (dealId: string) => request<TMVResult>(`/tmv/${dealId}`),

  calculateScore: (dealId: string) =>
    request<Score>('/score', {
      method: 'POST',
      body: JSON.stringify({ dealId }),
    }),

  getRankedDeals: () => request<RankedDeal[]>('/ranked'),

  getRankedDeal: async (dealId: string): Promise<RankedDeal | null> => {
    const rankedDeals = await request<RankedDeal[]>('/ranked');
    return rankedDeals.find((deal) => deal.id === dealId) ?? null;
  },

  getLiveEbayDeals: async (params: { category?: string; limit?: number } = {}): Promise<LiveEbayDeal[]> => {
    const search = new URLSearchParams();
    if (params.category) search.set('category', params.category);
    if (params.limit) search.set('limit', String(params.limit));
    const queryString = search.toString();
    const res = await request<ApiResponse<LiveDealsResponse>>(
      `/deals/live/ebay${queryString ? `?${queryString}` : ''}`
    );
    return res.data?.deals || [];
  },

  getDealIntelligence: async (dealId: string): Promise<DealIntelligence> => {
    const res = await request<ApiResponse<DealIntelligence>>(`/deal-intelligence/${dealId}`);
    return res.data;
  },

  getTMVAssumptions: async (params: { category?: string; source?: string } = {}): Promise<TMVAssumptions> => {
    const search = new URLSearchParams();
    if (params.category) search.set('category', params.category);
    if (params.source) search.set('source', params.source);
    const queryString = search.toString();
    const res = await request<ApiResponse<TMVAssumptions>>(
      `/tmv/assumptions${queryString ? `?${queryString}` : ''}`
    );
    return res.data;
  },

  getTMVScenarios: async (): Promise<TMVScenario[]> => {
    const res = await request<ApiResponse<TMVScenario[]>>('/tmv/scenarios');
    return res.data || [];
  },

  createTMVScenario: async (
    payload: Omit<TMVScenario, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TMVScenario> => {
    const res = await request<ApiResponse<TMVScenario>>('/tmv/scenarios', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  deleteTMVScenario: async (id: string): Promise<void> => {
    await request<ApiResponse<null>>(`/tmv/scenarios/${id}`, {
      method: 'DELETE',
    });
  },

  getConnections: async (): Promise<ConnectionsData> => {
    const res = await request<ApiResponse<ConnectionsData>>('/connections');
    return res.data;
  },

  createCraigslistSource: async (payload: {
    rssUrl: string;
    enabled?: boolean;
  }): Promise<IngestSourceRecord> => {
    const res = await request<ApiResponse<IngestSourceRecord>>('/connections/craigslist/sources', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  testFacebookConnection: async (cookieJson: string): Promise<ConnectionsData> => {
    const res = await request<ApiResponse<ConnectionsData>>('/connections/facebook/test', {
      method: 'POST',
      body: JSON.stringify({ cookieJson }),
    });
    return res.data;
  },

  ingestFacebookListing: async (url: string): Promise<{ accepted: number; rejected: number; errors: unknown[] }> =>
    request('/deals/ingest/facebook', {
      method: 'POST',
      body: JSON.stringify({ urls: [url] }),
    }),

  ingestFacebookSearch: async (payload: { query: string; location?: string; limit?: number }): Promise<{ accepted: number; rejected: number; errors: unknown[] }> =>
    request('/deals/ingest/facebook', {
      method: 'POST',
      body: JSON.stringify({ search: payload }),
    }),

  updateCraigslistSource: async (
    id: string,
    payload: {
      enabled?: boolean;
    }
  ): Promise<IngestSourceRecord> => {
    const res = await request<ApiResponse<IngestSourceRecord>>(`/connections/craigslist/sources/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  deleteCraigslistSource: async (id: string): Promise<void> => {
    await request<ApiResponse<{ id: string }>>(`/connections/craigslist/sources/${id}`, {
      method: 'DELETE',
    });
  },

  runCraigslistIngest: async (): Promise<ConnectionsData['craigslist']> => {
    const res = await request<ApiResponse<ConnectionsData['craigslist']>>('/connections/craigslist/ingest', {
      method: 'POST',
    });
    return res.data;
  },
};

export { ApiError, OPERATOR_TOKEN_STORAGE_KEY };
