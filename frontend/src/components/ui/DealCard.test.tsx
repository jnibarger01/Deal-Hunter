import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DealCard } from './DealCard';
import type { Deal } from '../../types';

const baseDeal: Deal = {
  id: 'deal-1',
  source: 'craigslist',
  sourceId: 'source-1',
  title: 'Safe Link Deal',
  price: 100,
  condition: 'good',
  category: 'electronics',
  location: 'Austin, TX',
  url: 'https://example.com/listing',
  createdAt: '2026-05-01T00:00:00.000Z',
};

describe('DealCard external listing links', () => {
  it('renders http and https listing URLs only', () => {
    const { rerender, container } = render(
      <MemoryRouter>
        <DealCard deal={baseDeal} />
      </MemoryRouter>
    );

    expect(container.querySelector('a[href="https://example.com/listing"]')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <DealCard deal={{ ...baseDeal, url: 'javascript:alert(1)' }} />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /view details/i })).toBeInTheDocument();
    expect(container.querySelector('a[href="javascript:alert(1)"]')).not.toBeInTheDocument();
  });
});
