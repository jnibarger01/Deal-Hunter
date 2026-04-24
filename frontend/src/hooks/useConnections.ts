import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { ConnectionsData, IngestSourceRecord } from '../types';

interface UseConnectionsResult {
  data: ConnectionsData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createCraigslistSource: (payload: { rssUrl: string; enabled?: boolean }) => Promise<IngestSourceRecord | null>;
  updateCraigslistSource: (id: string, payload: { enabled?: boolean }) => Promise<IngestSourceRecord | null>;
  deleteCraigslistSource: (id: string) => Promise<boolean>;
  runCraigslistIngest: () => Promise<ConnectionsData['craigslist'] | null>;
  testFacebookConnection: (cookieJson: string) => Promise<ConnectionsData | null>;
  ingestFacebookListing: (url: string) => Promise<boolean>;
  ingestFacebookSearch: (payload: { query: string; location?: string; limit?: number }) => Promise<boolean>;
}

export function useConnections(): UseConnectionsResult {
  const [data, setData] = useState<ConnectionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.getConnections());
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load connections');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createCraigslistSource = useCallback(async (payload: { rssUrl: string; enabled?: boolean }) => {
    setError(null);
    try {
      const created = await api.createCraigslistSource(payload);
      await refetch();
      return created;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to save craigslist feed');
      }
      return null;
    }
  }, [refetch]);

  const updateCraigslistSource = useCallback(async (id: string, payload: { enabled?: boolean }) => {
    setError(null);
    try {
      const updated = await api.updateCraigslistSource(id, payload);
      await refetch();
      return updated;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to update craigslist feed');
      }
      return null;
    }
  }, [refetch]);

  const deleteCraigslistSource = useCallback(async (id: string) => {
    setError(null);
    try {
      await api.deleteCraigslistSource(id);
      await refetch();
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to remove craigslist feed');
      }
      return false;
    }
  }, [refetch]);

  const runCraigslistIngest = useCallback(async () => {
    setError(null);
    try {
      const craigslist = await api.runCraigslistIngest();
      setData((current) => current ? { ...current, craigslist } : current);
      return craigslist;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to run craigslist ingest');
      }
      return null;
    }
  }, []);

  const testFacebookConnection = useCallback(async (cookieJson: string) => {
    setError(null);
    try {
      const connections = await api.testFacebookConnection(cookieJson);
      setData(connections);
      return connections;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to test facebook connection');
      }
      return null;
    }
  }, []);

  const ingestFacebookListing = useCallback(async (url: string) => {
    setError(null);
    try {
      await api.ingestFacebookListing(url);
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to ingest facebook listing');
      }
      return false;
    }
  }, []);

  const ingestFacebookSearch = useCallback(async (payload: { query: string; location?: string; limit?: number }) => {
    setError(null);
    try {
      await api.ingestFacebookSearch(payload);
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to ingest facebook search');
      }
      return false;
    }
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    createCraigslistSource,
    updateCraigslistSource,
    deleteCraigslistSource,
    runCraigslistIngest,
    testFacebookConnection,
    ingestFacebookListing,
    ingestFacebookSearch,
  };
}
