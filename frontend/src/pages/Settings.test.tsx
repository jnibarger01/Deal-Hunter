import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OPERATOR_TOKEN_STORAGE_KEY } from '../api/client';
import { Settings } from './Settings';

const useAppSettingsMock = vi.fn();
const useConnectionsMock = vi.fn();

vi.mock('../context/AppSettingsContext', () => ({
  useAppSettings: () => useAppSettingsMock(),
}));

vi.mock('../hooks/useConnections', () => ({
  useConnections: () => useConnectionsMock(),
}));

describe('Settings connections surface', () => {
  afterEach(() => {
    useAppSettingsMock.mockReset();
    useConnectionsMock.mockReset();
    localStorage.clear();
  });

  it('renders operator-facing connection cards for ebay, craigslist, and facebook marketplace', () => {
    useAppSettingsMock.mockReturnValue({
      settings: {
        defaultSortKey: 'rank',
        defaultSortDirection: 'desc',
        minConfidence: 0,
        compactMode: false,
        autoRefreshSec: 0,
      },
      updateSettings: vi.fn(),
      resetSettings: vi.fn(),
    });

    useConnectionsMock.mockReturnValue({
      data: {
        ebay: {
          status: 'configured',
          lastLivePullAt: null,
        },
        craigslist: {
          schedulerEnabled: false,
          sources: [
            {
              id: 'source-1',
              kind: 'craigslist_rss',
              enabled: true,
              config: {
                rssUrl: 'https://kansascity.craigslist.org/search/sss?format=rss',
                lastFetchedCount: 12,
                lastAcceptedCount: 9,
                lastRejectedCount: 3,
                lastError: 'Feed returned one malformed item',
              },
            },
          ],
        },
        facebook: {
          status: 'configured',
          profileName: 'Jace Nibarger',
          lastTestedAt: '2026-04-23T00:00:00.000Z',
        },
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
      createCraigslistSource: vi.fn(),
      updateCraigslistSource: vi.fn(),
      deleteCraigslistSource: vi.fn(),
      runCraigslistIngest: vi.fn(),
      testFacebookConnection: vi.fn(),
      ingestFacebookListing: vi.fn(),
      ingestFacebookSearch: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    expect(screen.getByText(/connections/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/operator token/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^ebay$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^craigslist$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /facebook marketplace/i })).toBeInTheDocument();
    expect(screen.getByText(/jace nibarger/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /test facebook connection/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /scrape listing url/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /scrape saved search/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://kansascity.craigslist.org/search/sss?format=rss')).toBeInTheDocument();
    expect(screen.getByText(/fetched: 12/i)).toBeInTheDocument();
    expect(screen.getByText(/accepted: 9/i)).toBeInTheDocument();
    expect(screen.getByText(/feed returned one malformed item/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add craigslist feed/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run craigslist ingest/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /disable feed/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove feed/i })).toBeInTheDocument();
  });

  it('saves and clears the operator token used by API requests', () => {
    useAppSettingsMock.mockReturnValue({
      settings: {
        defaultSortKey: 'rank',
        defaultSortDirection: 'desc',
        minConfidence: 0,
        compactMode: false,
        autoRefreshSec: 0,
      },
      updateSettings: vi.fn(),
      resetSettings: vi.fn(),
    });

    useConnectionsMock.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
      createCraigslistSource: vi.fn(),
      updateCraigslistSource: vi.fn(),
      deleteCraigslistSource: vi.fn(),
      runCraigslistIngest: vi.fn(),
      testFacebookConnection: vi.fn(),
      ingestFacebookListing: vi.fn(),
      ingestFacebookSearch: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/operator token/i), {
      target: { value: 'operator-token-from-settings' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save operator token/i }));
    expect(localStorage.getItem(OPERATOR_TOKEN_STORAGE_KEY)).toBe('operator-token-from-settings');

    fireEvent.click(screen.getByRole('button', { name: /clear operator token/i }));
    expect(localStorage.getItem(OPERATOR_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('lets the operator disable and remove saved craigslist feeds', () => {
    const updateCraigslistSource = vi.fn();
    const deleteCraigslistSource = vi.fn();

    useAppSettingsMock.mockReturnValue({
      settings: {
        defaultSortKey: 'rank',
        defaultSortDirection: 'desc',
        minConfidence: 0,
        compactMode: false,
        autoRefreshSec: 0,
      },
      updateSettings: vi.fn(),
      resetSettings: vi.fn(),
    });

    useConnectionsMock.mockReturnValue({
      data: {
        ebay: {
          status: 'configured',
          lastLivePullAt: null,
        },
        craigslist: {
          schedulerEnabled: false,
          sources: [
            {
              id: 'source-1',
              kind: 'craigslist_rss',
              enabled: true,
              config: {
                rssUrl: 'https://kansascity.craigslist.org/search/sss?format=rss',
                lastFetchedCount: 12,
                lastAcceptedCount: 9,
                lastRejectedCount: 3,
                lastError: 'Feed returned one malformed item',
              },
            },
          ],
        },
        facebook: {
          status: 'configured',
          profileName: 'Jace Nibarger',
          lastTestedAt: '2026-04-23T00:00:00.000Z',
        },
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
      createCraigslistSource: vi.fn(),
      updateCraigslistSource,
      deleteCraigslistSource,
      runCraigslistIngest: vi.fn(),
      testFacebookConnection: vi.fn(),
      ingestFacebookListing: vi.fn(),
      ingestFacebookSearch: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /disable feed/i }));
    expect(updateCraigslistSource).toHaveBeenCalledWith('source-1', { enabled: false });

    fireEvent.click(screen.getByRole('button', { name: /remove feed/i }));
    expect(deleteCraigslistSource).toHaveBeenCalledWith('source-1');
  });
});
