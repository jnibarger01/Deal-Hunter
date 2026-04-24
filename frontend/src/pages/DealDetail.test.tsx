import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DealDetail } from './DealDetail';

const useDealMock = vi.fn();
const useCalculateTMVMock = vi.fn();
const useDealIntelligenceMock = vi.fn();

vi.mock('../hooks/useDeals', async () => {
  const actual = await vi.importActual<typeof import('../hooks/useDeals')>('../hooks/useDeals');

  return {
    ...actual,
    useHealth: () => ({ data: { status: 'ok', timestamp: new Date().toISOString(), environment: 'test' }, loading: false, error: null, refetch: vi.fn() }),
    useDeal: (...args: unknown[]) => useDealMock(...args),
    useCalculateTMV: () => useCalculateTMVMock(),
    useDealIntelligence: (...args: unknown[]) => useDealIntelligenceMock(...args),
  };
});

describe('DealDetail payload-shape handling', () => {
  afterEach(() => {
    useDealMock.mockReset();
    useCalculateTMVMock.mockReset();
    useDealIntelligenceMock.mockReset();
  });

  it('renders not found state when no deal data exists', () => {
    useDealMock.mockReturnValue({ data: null, loading: false, error: null, refetch: vi.fn() });
    useCalculateTMVMock.mockReturnValue({ calculate: vi.fn(), loading: false, error: null });
    useDealIntelligenceMock.mockReturnValue({ data: null, loading: false, error: null, refetch: vi.fn() });

    render(
      <MemoryRouter initialEntries={['/deals/missing-deal']}>
        <Routes>
          <Route path="/deals/:id" element={<DealDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/deal not found/i)).toBeInTheDocument();
  });

  it('renders the screenshot-style intelligence layout even when tmv or score are missing', () => {
    useDealMock.mockReturnValue({
      data: {
        id: 'deal-1',
        source: 'ebay',
        sourceId: 'source-1',
        title: 'Base Deal Only',
        description: 'Stored source description.',
        imageUrl: 'https://example.com/image.jpg',
        price: 100,
        condition: 'good',
        category: 'tech',
        location: 'KC',
        url: 'https://example.com/deal-1',
        createdAt: '2026-04-19T00:00:00.000Z',
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    useCalculateTMVMock.mockReturnValue({ calculate: vi.fn(), loading: false, error: null });
    useDealIntelligenceMock.mockReturnValue({ data: null, loading: false, error: null, refetch: vi.fn() });

    render(
      <MemoryRouter initialEntries={['/deals/deal-1']}>
        <Routes>
          <Route path="/deals/:id" element={<DealDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Base Deal Only')).toBeInTheDocument();
    expect(screen.getByText(/back to feed/i)).toBeInTheDocument();
    expect(screen.getByText(/list price/i)).toBeInTheDocument();
    expect(screen.getAllByText(/description/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Stored source description.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /base deal only/i })).toHaveAttribute('src', 'https://example.com/image.jpg');
    expect(screen.getByText(/deal intelligence/i)).toBeInTheDocument();
    expect(screen.getByText(/repair analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/market dynamics/i)).toBeInTheDocument();
    expect(screen.getByText(/negotiation ai/i)).toBeInTheDocument();
  });

  it('renders AI-generated intelligence when the endpoint returns analysis', () => {
    useDealMock.mockReturnValue({
      data: {
        id: 'deal-1',
        source: 'ebay',
        sourceId: 'source-1',
        title: 'Base Deal Only',
        price: 100,
        condition: 'good',
        category: 'tech',
        location: 'KC',
        url: 'https://example.com/deal-1',
        createdAt: '2026-04-19T00:00:00.000Z',
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    useCalculateTMVMock.mockReturnValue({ calculate: vi.fn(), loading: false, error: null });
    useDealIntelligenceMock.mockReturnValue({
      data: {
        repairAnalysis: {
          skillLevel: 'BEGINNER',
          summary: 'AI repair summary',
          likelyIssue: 'AI issue',
          partsCost: 0,
        },
        marketDynamics: {
          summary: 'AI market summary',
          targetPrice: 1400,
          priceHistory: [1500, 1450, 1400],
        },
        negotiation: {
          targetOffer: 675,
          openingScript: 'AI negotiation script',
        },
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/deals/deal-1']}>
        <Routes>
          <Route path="/deals/:id" element={<DealDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('AI repair summary')).toBeInTheDocument();
    expect(screen.getByText('AI market summary')).toBeInTheDocument();
    expect(screen.getByText('AI negotiation script')).toBeInTheDocument();
    expect(screen.getByText('$675')).toBeInTheDocument();
  });

  it('recalculates analytics, refetches the deal, and renders returned tmv as a fallback', async () => {
    const refetch = vi.fn();
    useDealMock.mockReturnValue({
      data: {
        id: 'deal-1',
        source: 'ebay',
        sourceId: 'source-1',
        title: 'Base Deal Only',
        price: 100,
        condition: 'good',
        category: 'tech',
        location: 'KC',
        url: 'https://example.com/deal-1',
        createdAt: '2026-04-19T00:00:00.000Z',
      },
      loading: false,
      error: null,
      refetch,
    });

    const calculate = vi.fn().mockResolvedValue({
      dealId: 'deal-1',
      tmv: 150,
      confidence: 0.82,
      sampleCount: 12,
      volatility: 0.1,
      liquidityScore: 0.88,
      estimatedDaysToSell: 4,
      calculatedAt: '2026-04-20T12:00:00.000Z',
    });
    useCalculateTMVMock.mockReturnValue({ calculate, loading: false, error: null });
    useDealIntelligenceMock.mockReturnValue({ data: null, loading: false, error: null, refetch: vi.fn() });

    render(
      <MemoryRouter initialEntries={['/deals/deal-1']}>
        <Routes>
          <Route path="/deals/:id" element={<DealDetail />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(() => {
      expect(calculate).toHaveBeenCalledWith('deal-1');
      expect(refetch).toHaveBeenCalledTimes(1);
      expect(screen.getAllByText(/market value/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/deal score/i)).toBeInTheDocument();
      expect(screen.getByText(/6-month price history/i)).toBeInTheDocument();
    });
  });
});
