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

// Helper to handle generic response structure { success: boolean, data: T }
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Deals list response structure
interface DealsResponse {
  deals: Deal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Single deal response structure
interface DealResponse {
  deal: Deal;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // Determine if we need the versioned API base or just the root URL (for health)
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
  // Health check - lives at root
  getHealth: async (): Promise<HealthStatus> => {
    const res = await request<any>('/health');
    return {
      status: res.success ? 'ok' : 'error',
      timestamp: res.timestamp
    };
  },

  // Deals
  // Unwraps result.data.deals from { success: true, data: { deals: [], ... } }
  getDeals: async (): Promise<Deal[]> => {
    const res = await request<ApiResponse<DealsResponse>>('/deals');
    return res.data?.deals || []; 
  },

  // Unwraps result.data.deal from { success: true, data: { deal: ... } }
  getDeal: async (id: string): Promise<Deal> => {
    const res = await request<ApiResponse<DealResponse>>(`/deals/${id}`);
    return res.data?.deal;
  },

  // TMV - Backend expects POST /api/v1/deals/:id/calculate-tmv
  // Backend returns { tmv: ..., demandScore: ..., hotDeal: ... } directly (no success/data wrapper in deal.routes.ts handler? 
  // Wait, deal.routes.ts says: res.json({ tmv, demandScore, hotDeal }); -> No "data" wrapper there!
  calculateTMV: (dealId: string) =>
    request<TMVResult>(`/deals/${dealId}/calculate-tmv`, {
      method: 'POST',
    }),
    
  // TODO: Verify if this route exists
  getTMV: (dealId: string) => request<TMVResult>(`/deals/${dealId}/tmv`),

  // Scoring - Likely future implementation
  calculateScore: (dealId: string) =>
    request<Score>(`/deals/${dealId}/score`, { 
      method: 'POST',
    }),

  // Ranked deals - Likely future implementation
  getRankedDeals: () => request<RankedDeal[]>('/deals/ranked'), 
};

export { ApiError };
