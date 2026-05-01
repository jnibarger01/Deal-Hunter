import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { AppSettingsProvider } from './context/AppSettingsContext';
import { DealCard } from './components/ui/DealCard';

describe('frontend route contract', () => {
  it('renders the dashboard shell and links use canonical non-/app routes', () => {
    window.history.replaceState({}, '', '/');

    render(
      <AppSettingsProvider>
        <App />
      </AppSettingsProvider>
    );

    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    const allDealsLink = screen.getByRole('link', { name: /all deals/i });
    const calculatorLink = screen.getByRole('link', { name: /tmv calculator/i });
    const settingsLink = screen.getByRole('link', { name: /settings/i });

    expect(dashboardLink).toHaveAttribute('href', '/');
    expect(allDealsLink).toHaveAttribute('href', '/deals');
    expect(calculatorLink).toHaveAttribute('href', '/calculator');
    expect(settingsLink).toHaveAttribute('href', '/settings');
  });

  it('renders deal card links against canonical deal routes', () => {
    render(
      <MemoryRouter>
        <DealCard
          deal={{
            id: 'deal-1',
            source: 'ebay',
            sourceId: 'source-1',
            title: 'Test Deal',
            imageUrl: 'https://example.com/deal-1.jpg',
            price: 100,
            condition: 'good',
            category: 'tech',
            location: 'KC',
            url: 'https://example.com/deal-1',
            createdAt: new Date().toISOString(),
          }}
        />
      </MemoryRouter>
    );

    const titleLink = screen.getByRole('link', { name: 'Test Deal' });
    const detailsLink = screen.getByRole('link', { name: /view details/i });
    const thumbnail = screen.getByRole('img', { name: /test deal/i });

    expect(titleLink).toHaveAttribute('href', '/deals/deal-1');
    expect(detailsLink).toHaveAttribute('href', '/deals/deal-1');
    expect(thumbnail).toHaveAttribute('src', 'https://example.com/deal-1.jpg');
  });
});
