import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, List, ArrowUpAZ, ArrowDownAZ } from 'lucide-react';
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
import { useAppSettings } from '../context/AppSettingsContext';
import type { RankedDeal } from '../types';
import styles from './Deals.module.css';

type ViewMode = 'grid' | 'table';
type SortDirection = 'asc' | 'desc';
type SortKey = 'title' | 'source' | 'price' | 'tmv' | 'spread' | 'profit' | 'velocity' | 'confidence' | 'rank';

export function Deals() {
  const navigate = useNavigate();
  const { data: apiDeals, loading, refetch } = useRankedDeals();
  const { settings } = useAppSettings();
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [minConfidence, setMinConfidence] = useState<number>(0);

  const deals = apiDeals ?? [];

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
      if (deal.tmv.confidence < minConfidence) return false;
      return true;
    });
  }, [deals, categoryFilter, sourceFilter, minConfidence]);

  useEffect(() => {
    setSortKey(settings.defaultSortKey);
    setSortDirection(settings.defaultSortDirection);
    setMinConfidence(settings.minConfidence);
  }, [settings.defaultSortDirection, settings.defaultSortKey, settings.minConfidence]);

  useEffect(() => {
    if (!settings.autoRefreshSec || settings.autoRefreshSec < 15) return;
    const id = window.setInterval(() => {
      refetch();
    }, settings.autoRefreshSec * 1000);

    return () => window.clearInterval(id);
  }, [refetch, settings.autoRefreshSec]);

  const sourceOptions = useMemo(() => {
    return [
      'all',
      ...Array.from(new Set(deals.map((deal) => deal.source))).sort((a, b) => a.localeCompare(b)),
    ];
  }, [deals]);

  const sortedDeals = useMemo(() => {
    const sorted = [...filteredDeals];

    const getValue = (deal: RankedDeal): string | number => {
      switch (sortKey) {
        case 'title':
          return deal.title.toLowerCase();
        case 'source':
          return deal.source.toLowerCase();
        case 'price':
          return deal.price;
        case 'tmv':
          return deal.tmv.tmv;
        case 'spread':
          return deal.tmv.tmv - deal.price;
        case 'profit':
          return deal.score.profitMargin;
        case 'velocity':
          return deal.tmv.estimatedDaysToSell;
        case 'confidence':
          return deal.tmv.confidence;
        case 'rank':
          return deal.score.compositeRank;
        default:
          return deal.score.compositeRank;
      }
    };

    sorted.sort((a, b) => {
      const aValue = getValue(a);
      const bValue = getValue(b);
      const factor = sortDirection === 'asc' ? 1 : -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * factor;
      }

      return (Number(aValue) - Number(bValue)) * factor;
    });

    return sorted;
  }, [filteredDeals, sortKey, sortDirection]);

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
      render: (deal: RankedDeal) => <ConditionBadge condition={deal.condition ?? 'Unknown'} />,
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
        subtitle={`${sortedDeals.length} opportunities found`}
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

              <div className={styles.filterGroup}>
                <select
                  className={styles.filterSelect}
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  aria-label="Filter by source"
                >
                  {sourceOptions.map((source) => (
                    <option key={source} value={source}>
                      {source === 'all' ? 'All Sources' : source}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <select
                  className={styles.filterSelect}
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  aria-label="Sort deals by field"
                >
                  <option value="rank">Composite Rank</option>
                  <option value="profit">Profit %</option>
                  <option value="spread">Spread</option>
                  <option value="price">Price</option>
                  <option value="tmv">TMV</option>
                  <option value="velocity">Days to Sell</option>
                  <option value="confidence">Confidence</option>
                  <option value="source">Source</option>
                  <option value="title">Title</option>
                </select>
                <button
                  className={styles.sortDirectionButton}
                  type="button"
                  onClick={() =>
                    setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
                  }
                  aria-label={`Switch to ${sortDirection === 'asc' ? 'descending' : 'ascending'} order`}
                  title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                >
                  {sortDirection === 'asc' ? <ArrowUpAZ size={16} /> : <ArrowDownAZ size={16} />}
                </button>
              </div>

              <div className={styles.filterGroup}>
                <select
                  className={styles.filterSelect}
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(Number(e.target.value))}
                  aria-label="Minimum confidence filter"
                >
                  <option value={0}>All confidence levels</option>
                  <option value={0.4}>40%+ confidence</option>
                  <option value={0.6}>60%+ confidence</option>
                  <option value={0.75}>75%+ confidence</option>
                  <option value={0.9}>90%+ confidence</option>
                </select>
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
            {sortedDeals.map((deal, index) => (
              <DealCard
                key={deal.id}
                deal={deal}
                rank={index + 1}
                variant={settings.compactMode ? 'compact' : 'default'}
              />
            ))}
          </DealGrid>
        ) : (
          <DataTable
            data={sortedDeals}
            columns={columns}
            keyExtractor={(deal) => deal.id}
            loading={loading}
            compact={settings.compactMode}
            onRowClick={(deal) => navigate(`/deals/${deal.id}`)}
            onSort={(key, direction) => {
              if (!direction) return;
              setSortKey(key as SortKey);
              setSortDirection(direction);
            }}
            emptyMessage="No deals match your filters"
          />
        )}
      </div>
    </div>
  );
}
