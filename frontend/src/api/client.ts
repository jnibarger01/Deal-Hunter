// API client for Deal-Hunter backend
import type { Deal, RankedDeal, TMVResult, Score, HealthStatus } from '../types';

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

  getTMV: (dealId: string) => request<TMVResult>(`/tmv/${dealId}`),

  calculateScore: (dealId: string, feeAssumptions?: {
    platformFeeRate?: number;
    shippingCost?: number;
    fixedFees?: number;
  }) =>
    request<Score>('/score', {
      method: 'POST',
      body: JSON.stringify({ dealId, feeAssumptions }),
    }),

  getRankedDeals: () => request<RankedDeal[]>('/ranked'),
};

export { ApiError };
