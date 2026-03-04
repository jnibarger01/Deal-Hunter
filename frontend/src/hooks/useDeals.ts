import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '../api/client';
import type {
  Deal,
  RankedDeal,
  TMVResult,
  HealthStatus,
  TMVAssumptions,
  TMVScenario,
} from '../types';

interface UseDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function useApiData<T>(fetcher: () => Promise<T>): UseDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useHealth(): UseDataState<HealthStatus> {
  return useApiData(api.getHealth);
}

export function useDeals(): UseDataState<Deal[]> {
  return useApiData(api.getDeals);
}

export function useDeal(id: string): UseDataState<Deal> {
  const fetcher = useCallback(() => api.getDeal(id), [id]);
  return useApiData(fetcher);
}

export function useRankedDeals(): UseDataState<RankedDeal[]> {
  return useApiData(api.getRankedDeals);
}

export function useTMV(dealId: string): UseDataState<TMVResult> {
  const fetcher = useCallback(() => api.getTMV(dealId), [dealId]);
  return useApiData(fetcher);
}

export function useTMVAssumptions(category?: string, source?: string): UseDataState<TMVAssumptions> {
  const fetcher = useCallback(
    () => api.getTMVAssumptions({ category, source }),
    [category, source]
  );
  return useApiData(fetcher);
}

export function useTMVScenarios(): UseDataState<TMVScenario[]> {
  return useApiData(api.getTMVScenarios);
}

// Action hooks for mutations
export function useCalculateTMV() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = useCallback(async (dealId: string): Promise<TMVResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.calculateTMV(dealId);
      return result;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to calculate TMV');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { calculate, loading, error };
}

export function useTMVScenarioActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (payload: Omit<TMVScenario, 'id' | 'createdAt' | 'updatedAt'>) => {
    setLoading(true);
    setError(null);
    try {
      return await api.createTMVScenario(payload);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to save scenario');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.deleteTMVScenario(id);
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to delete scenario');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, remove, loading, error };
}
