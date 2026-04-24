import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dashboard } from './Dashboard';

const useRankedDealsMock = vi.fn();
const useLiveEbayDealsMock = vi.fn();

vi.mock('../hooks/useDeals', async () => {
  const actual = await vi.importActual<typeof import('../hooks/useDeals')>('../hooks/useDeals');

  return {
    ...actual,
    useHealth: () => ({ data: { status: 'ok', timestamp: new Date().toISOString(), environment: 'test' }, loading: false, error: null, refetch: vi.fn() }),
    useRankedDeals: () => useRankedDealsMock(),
    useLiveEbayDeals: (...args: unknown[]) => useLiveEbayDealsMock(...args),
  };
});

vi.mock('../context/AppSettingsContext', () => ({
  useAppSettings: () => ({
    settings: {
      autoRefreshSec: 0,
      compactMode: false,
      defaultSortKey: 'rank',
      defaultSortDirection: 'desc',
      minConfidence: 0,
    },
  }),
}));

describe('Dashboard live eBay feed', () => {
  afterEach(() => {
    useRankedDealsMock.mockReset();
    useLiveEbayDealsMock.mockReset();
  });

  it('only loads live eBay deals after explicit user action and lets the user switch presets', () => {
    useRankedDealsMock.mockReturnValue({ data: [], loading: false, error: null, refetch: vi.fn() });
    useLiveEbayDealsMock.mockImplementation((category: unknown, enabled: unknown) => ({
      data:
        enabled && category === 'gaming'
          ? [
              {
                id: 'ebay-gaming-1',
                source: 'ebay',
                sourceId: 'gaming-1',
                title: 'PS5 Digital Edition',
                price: 220,
                condition: 'Used',
                category: 'gaming',
                location: 'Austin, TX',
                url: 'https://example.com/gaming-1',
                createdAt: '2026-04-21T00:00:00.000Z',
              },
            ]
          : enabled
          ? [
              {
                id: 'ebay-tech-1',
                source: 'ebay',
                sourceId: 'tech-1',
                title: 'Sony X90L 65" TV',
                price: 350,
                condition: 'Used',
                category: 'tech',
                location: 'Austin, TX',
                url: 'https://example.com/tech-1',
                createdAt: '2026-04-21T00:00:00.000Z',
              },
            ]
          : [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    }));

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(useLiveEbayDealsMock).toHaveBeenLastCalledWith('tech', false);
    expect(screen.getByText(/live ebay feed/i)).toBeInTheDocument();
    expect(screen.queryByText('Sony X90L 65" TV')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /load live ebay deals/i }));

    expect(useLiveEbayDealsMock).toHaveBeenLastCalledWith('tech', true);
    expect(screen.getByText('Sony X90L 65" TV')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /gaming/i }));

    expect(useLiveEbayDealsMock).toHaveBeenLastCalledWith('gaming', true);
    expect(screen.getByText('PS5 Digital Edition')).toBeInTheDocument();
  });
});
