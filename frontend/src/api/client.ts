// API client for Deal-Hunter backend
import type { Deal, RankedDeal, TMVResult, Score, HealthStatus } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `API Error: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  // Health check
  getHealth: () => request<HealthStatus>('/health'),

  // Deals
  getDeals: () => request<Deal[]>('/deals'),
  getDeal: (id: string) => request<Deal>(`/deals/${id}`),

  // TMV
  calculateTMV: (dealId: string) =>
    request<TMVResult>('/tmv/calculate', {
      method: 'POST',
      body: JSON.stringify({ dealId }),
    }),
  getTMV: (dealId: string) => request<TMVResult>(`/tmv/${dealId}`),

  // Scoring
  calculateScore: (dealId: string) =>
    request<Score>('/score', {
      method: 'POST',
      body: JSON.stringify({ dealId }),
    }),

  // Ranked deals
  getRankedDeals: () => request<RankedDeal[]>('/ranked'),
};

export { ApiError };
