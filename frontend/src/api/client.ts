// API client for Deal-Hunter backend
import type {
  Deal,
  RankedDeal,
  TMVResult,
  Score,
  HealthStatus,
  TMVAssumptions,
  TMVScenario,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_VERSION = 'v1';
const API_BASE = `${API_URL}/api/${API_VERSION}`;

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

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const baseUrl = endpoint.startsWith('/health') ? API_URL : API_BASE;

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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

  getTMV: (dealId: string) => request<TMVResult>(`/deals/${dealId}/tmv`),

  calculateScore: (dealId: string) =>
    request<Score>(`/deals/${dealId}/score`, { method: 'POST' }),

  getRankedDeals: () => request<RankedDeal[]>('/deals/ranked'),

  // Calculator helpers
  getTMVAssumptions: async (params: { category?: string; source?: string } = {}): Promise<TMVAssumptions> => {
    const search = new URLSearchParams();
    if (params.category) search.set('category', params.category);
    if (params.source) search.set('source', params.source);
    const queryString = search.toString();
    const res = await request<ApiResponse<TMVAssumptions>>(
      `/deals/tmv-assumptions${queryString ? `?${queryString}` : ''}`
    );
    return res.data;
  },

  getTMVScenarios: async (): Promise<TMVScenario[]> => {
    const res = await request<ApiResponse<TMVScenario[]>>('/deals/tmv-scenarios');
    return res.data || [];
  },

  createTMVScenario: async (
    payload: Omit<TMVScenario, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TMVScenario> => {
    const res = await request<ApiResponse<TMVScenario>>('/deals/tmv-scenarios', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  deleteTMVScenario: async (id: string): Promise<void> => {
    await request<ApiResponse<null>>(`/deals/tmv-scenarios/${id}`, {
      method: 'DELETE',
    });
  },
};

export { ApiError };
