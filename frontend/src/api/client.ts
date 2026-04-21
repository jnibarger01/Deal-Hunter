// API client for Deal-Hunter backend
import type {
  Deal,
  RankedDeal,
  TMVResult,
  Score,
  HealthStatus,
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
    totalPages: number;
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
    let message = `API Error: ${response.statusText}`;

    try {
      const payload = (await response.json()) as {
        error?: { message?: string } | string;
      };
      if (typeof payload.error === 'string') {
        message = payload.error;
      } else if (payload.error?.message) {
        message = payload.error.message;
      }
    } catch {
      // Fall back to status text when response is not JSON.
    }

    throw new ApiError(response.status, message);
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

  getRankedDeal: async (id: string): Promise<RankedDeal | null> => {
    const deals = await request<RankedDeal[]>('/ranked');
    return deals.find((deal) => deal.id === id) ?? null;
  },

  analyzeDeal: async (dealId: string): Promise<{ tmv: TMVResult; score: Score }> => {
    const tmv = await api.calculateTMV(dealId);
    const score = await api.calculateScore(dealId);
    return { tmv, score };
  },
};

export { ApiError };
