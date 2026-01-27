import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, SlidersHorizontal, Grid, List } from 'lucide-react';
import { Header } from '../components/layout';
import {
  Card,
  CardContent,
  DealCard,
  DealGrid,
  DataTable,
  CellText,
  CellCurrency,
  CellPercent,
  Badge,
  ConditionBadge,
  ConfidenceBadge,
} from '../components/ui';
import { useRankedDeals } from '../hooks/useDeals';
import type { RankedDeal } from '../types';
import styles from './Deals.module.css';

// Mock data for demonstration
const mockDeals: RankedDeal[] = [
  {
    id: '1',
    source: 'eBay',
    sourceId: 'eb-123',
    title: 'Sony PlayStation 5 Console - Digital Edition',
    price: 350,
    condition: 'Like New',
    category: 'Gaming',
    location: 'Los Angeles, CA',
    url: 'https://example.com/1',
    createdAt: new Date().toISOString(),
    tmv: {
      dealId: '1',
      tmv: 450,
      confidence: 0.87,
      sampleCount: 124,
      volatility: 0.12,
      liquidityScore: 0.89,
      estimatedDaysToSell: 3,
      calculatedAt: new Date().toISOString(),
    },
    score: {
      dealId: '1',
      profitMargin: 0.286,
      velocityScore: 0.92,
      riskScore: 0.15,
      compositeRank: 94,
    },
  },
  {
    id: '2',
    source: 'FB Market',
    sourceId: 'fb-456',
    title: 'Apple MacBook Pro 14" M3 Pro - 18GB RAM 512GB SSD',
    price: 1450,
    condition: 'Excellent',
    category: 'Computers',
    location: 'San Francisco, CA',
    url: 'https://example.com/2',
    createdAt: new Date().toISOString(),
    tmv: {
      dealId: '2',
      tmv: 1850,
      confidence: 0.92,
      sampleCount: 89,
      volatility: 0.08,
      liquidityScore: 0.78,
      estimatedDaysToSell: 5,
      calculatedAt: new Date().toISOString(),
    },
    score: {
      dealId: '2',
      profitMargin: 0.276,
      velocityScore: 0.85,
      riskScore: 0.12,
      compositeRank: 91,
    },
  },
  {
    id: '3',
    source: 'Craigslist',
    sourceId: 'cl-789',
    title: 'Nintendo Switch OLED - White with 5 Games',
    price: 220,
    condition: 'Good',
    category: 'Gaming',
    location: 'Austin, TX',
    url: 'https://example.com/3',
    createdAt: new Date().toISOString(),
    tmv: {
      dealId: '3',
      tmv: 310,
      confidence: 0.75,
      sampleCount: 67,
      volatility: 0.18,
      liquidityScore: 0.82,
      estimatedDaysToSell: 4,
      calculatedAt: new Date().toISOString(),
    },
    score: {
      dealId: '3',
      profitMargin: 0.409,
      velocityScore: 0.88,
      riskScore: 0.28,
      compositeRank: 87,
    },
  },
  {
    id: '4',
    source: 'OfferUp',
    sourceId: 'ou-101',
    title: 'DJI Mavic Air 2 Drone - Fly More Combo',
    price: 480,
    condition: 'Like New',
    category: 'Electronics',
    location: 'Seattle, WA',
    url: 'https://example.com/4',
    createdAt: new Date().toISOString(),
    tmv: {
      dealId: '4',
      tmv: 620,
      confidence: 0.81,
      sampleCount: 45,
      volatility: 0.15,
      liquidityScore: 0.71,
      estimatedDaysToSell: 7,
      calculatedAt: new Date().toISOString(),
    },
    score: {
      dealId: '4',
      profitMargin: 0.292,
      velocityScore: 0.75,
      riskScore: 0.22,
      compositeRank: 82,
    },
  },
  {
    id: '5',
    source: 'eBay',
    sourceId: 'eb-202',
    title: 'Bose QuietComfort 45 Wireless Headphones',
    price: 180,
    condition: 'New',
    category: 'Audio',
    location: 'New York, NY',
    url: 'https://example.com/5',
    createdAt: new Date().toISOString(),
    tmv: {
      dealId: '5',
      tmv: 249,
      confidence: 0.89,
      sampleCount: 156,
      volatility: 0.09,
      liquidityScore: 0.91,
      estimatedDaysToSell: 2,
      calculatedAt: new Date().toISOString(),
    },
    score: {
      dealId: '5',
      profitMargin: 0.383,
      velocityScore: 0.94,
      riskScore: 0.11,
      compositeRank: 89,
    },
  },
  {
    id: '6',
    source: 'FB Market',
    sourceId: 'fb-303',
    title: 'Canon EOS R6 Mirrorless Camera Body Only',
    price: 1200,
    condition: 'Excellent',
    category: 'Photography',
    location: 'Chicago, IL',
    url: 'https://example.com/6',
    createdAt: new Date().toISOString(),
    tmv: {
      dealId: '6',
      tmv: 1550,
      confidence: 0.78,
      sampleCount: 38,
      volatility: 0.14,
      liquidityScore: 0.65,
      estimatedDaysToSell: 9,
      calculatedAt: new Date().toISOString(),
    },
    score: {
      dealId: '6',
      profitMargin: 0.292,
      velocityScore: 0.68,
      riskScore: 0.31,
      compositeRank: 76,
    },
  },
];

type ViewMode = 'grid' | 'table';

export function Deals() {
  const navigate = useNavigate();
  const { data: apiDeals, loading, refetch } = useRankedDeals();
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const deals = apiDeals || mockDeals;

  // Ticker stats
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = { all: deals.length };
    deals.forEach((d) => {
      stats[d.category] = (stats[d.category] || 0) + 1;
    });
    // Sort by count desc, but keep 'all' first
    return [
      { name: 'all', count: deals.length },
      ...Object.entries(stats)
        .filter(([name]) => name !== 'all')
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    ];
  }, [deals]);

  // Filter deals
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      if (categoryFilter !== 'all' && deal.category !== categoryFilter) return false;
      if (sourceFilter !== 'all' && deal.source !== sourceFilter) return false;
      return true;
    });
  }, [deals, categoryFilter, sourceFilter]);

  // Table columns
  const columns = [
    {
      key: 'title',
      header: 'Deal',
      sortable: true,
      render: (deal: RankedDeal) => (
        <CellText primary={deal.title} secondary={deal.category} />
      ),
    },
    {
      key: 'source',
      header: 'Source',
      sortable: true,
      render: (deal: RankedDeal) => (
        <Badge variant="default" size="sm">
          {deal.source}
        </Badge>
      ),
    },
    {
      key: 'condition',
      header: 'Condition',
      render: (deal: RankedDeal) => <ConditionBadge condition={deal.condition} />,
    },
    {
      key: 'price',
      header: 'Price',
      sortable: true,
      align: 'right' as const,
      render: (deal: RankedDeal) => <CellCurrency value={deal.price} />,
    },
    {
      key: 'tmv',
      header: 'TMV',
      sortable: true,
      align: 'right' as const,
      render: (deal: RankedDeal) => <CellCurrency value={deal.tmv.tmv} highlight />,
    },
    {
      key: 'spread',
      header: 'Spread',
      sortable: true,
      align: 'right' as const,
      render: (deal: RankedDeal) => (
        <CellCurrency value={deal.tmv.tmv - deal.price} />
      ),
    },
    {
      key: 'profit',
      header: 'Profit',
      sortable: true,
      align: 'right' as const,
      render: (deal: RankedDeal) => <CellPercent value={deal.score.profitMargin} />,
    },
    {
      key: 'velocity',
      header: 'Days',
      sortable: true,
      align: 'right' as const,
      render: (deal: RankedDeal) => (
        <CellText primary={`${deal.tmv.estimatedDaysToSell}d`} />
      ),
    },
    {
      key: 'confidence',
      header: 'Confidence',
      sortable: true,
      align: 'center' as const,
      render: (deal: RankedDeal) => (
        <ConfidenceBadge confidence={deal.tmv.confidence} />
      ),
    },
    {
      key: 'rank',
      header: 'Rank',
      sortable: true,
      align: 'center' as const,
      width: '80px',
      render: (deal: RankedDeal) => (
        <span className={styles.rankBadge}>{deal.score.compositeRank}</span>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <Header
        title="All Deals"
        subtitle={`${filteredDeals.length} opportunities found`}
        onRefresh={refetch}
        refreshing={loading}
      />

      <div className={styles.content}>
        {/* Filters */}
        <Card className={styles.filterBar}>
          <CardContent>
            <div className={styles.filters}>
              {/* Ticker Tape */}
              <div className={styles.tickerContainer}>
                {categoryStats.map((stat) => (
                  <button
                    key={stat.name}
                    className={`${styles.tickerItem} ${
                      categoryFilter === stat.name ? styles.active : ''
                    }`}
                    onClick={() => setCategoryFilter(stat.name)}
                  >
                    <span>{stat.name === 'all' ? 'ALL MARKETS' : stat.name}</span>
                    <span className={styles.tickerCount}>{stat.count}</span>
                  </button>
                ))}
              </div>

              {/* View Toggle (kept on right) */}
              <div className={styles.viewToggle}>
                <button
                  className={`${styles.viewButton} ${viewMode === 'grid' ? styles.active : ''}`}
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                >
                  <Grid size={18} />
                </button>
                <button
                  className={`${styles.viewButton} ${viewMode === 'table' ? styles.active : ''}`}
                  onClick={() => setViewMode('table')}
                  aria-label="Table view"
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deals Display */}
        {viewMode === 'grid' ? (
          <DealGrid columns={2}>
            {filteredDeals.map((deal, index) => (
              <DealCard key={deal.id} deal={deal} rank={index + 1} />
            ))}
          </DealGrid>
        ) : (
          <DataTable
            data={filteredDeals}
            columns={columns}
            keyExtractor={(deal) => deal.id}
            loading={loading}
            onRowClick={(deal) => navigate(`/deals/${deal.id}`)}
            emptyMessage="No deals match your filters"
          />
        )}
      </div>
    </div>
  );
}
