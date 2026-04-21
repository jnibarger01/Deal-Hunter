import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowDownAZ, ArrowUpAZ, Grid, List } from 'lucide-react';
import { Header } from '../components/layout';
import {
  Badge,
  Card,
  CardContent,
  CellCurrency,
  CellPercent,
  CellText,
  ConditionBadge,
  ConfidenceBadge,
  DataTable,
  DealCard,
  DealGrid,
} from '../components/ui';
import { useDeals, useRankedDeals } from '../hooks/useDeals';
import { useAppSettings } from '../context/AppSettingsContext';
import type { Deal, RankedDeal } from '../types';
import styles from './Deals.module.css';

type ViewMode = 'grid' | 'table';
type SortDirection = 'asc' | 'desc';
type SortKey = 'title' | 'source' | 'price' | 'createdAt' | 'tmv' | 'spread' | 'profit' | 'velocity' | 'confidence' | 'rank';

const isRankedDeal = (deal: Deal | RankedDeal): deal is RankedDeal => {
  return deal.tmv !== undefined && deal.score !== undefined;
};

export function Deals() {
  const location = useLocation();
  const navigate = useNavigate();
  const rankedMode = location.pathname === '/ranked';
  const { settings } = useAppSettings();
  const { data: rawDeals, loading: loadingDeals, error: dealsError, refetch: refetchDeals } = useDeals();
  const {
    data: rankedDeals,
    loading: loadingRanked,
    error: rankedError,
    refetch: refetchRanked,
  } = useRankedDeals();

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>(rankedMode ? 'rank' : 'createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>(rankedMode ? 'desc' : 'desc');
  const [minConfidence, setMinConfidence] = useState<number>(0);

  const data = rankedMode ? rankedDeals ?? [] : rawDeals ?? [];
  const loading = rankedMode ? loadingRanked : loadingDeals;
  const error = rankedMode ? rankedError : dealsError;
  const refetch = rankedMode ? refetchRanked : refetchDeals;

  useEffect(() => {
    setMinConfidence(settings.minConfidence);
    setSortKey(rankedMode ? settings.defaultSortKey : 'createdAt');
    setSortDirection(settings.defaultSortDirection);
  }, [rankedMode, settings.defaultSortDirection, settings.defaultSortKey, settings.minConfidence]);

  useEffect(() => {
    if (!settings.autoRefreshSec || settings.autoRefreshSec < 15) return;
    const id = window.setInterval(refetch, settings.autoRefreshSec * 1000);
    return () => window.clearInterval(id);
  }, [refetch, settings.autoRefreshSec]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = { all: data.length };
    data.forEach((deal) => {
      stats[deal.category] = (stats[deal.category] || 0) + 1;
    });

    return [
      { name: 'all', count: data.length },
      ...Object.entries(stats)
        .filter(([name]) => name !== 'all')
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    ];
  }, [data]);

  const sourceOptions = useMemo(() => {
    return ['all', ...Array.from(new Set(data.map((deal) => deal.source))).sort((a, b) => a.localeCompare(b))];
  }, [data]);

  const filteredDeals = useMemo(() => {
    return data.filter((deal) => {
      if (categoryFilter !== 'all' && deal.category !== categoryFilter) return false;
      if (sourceFilter !== 'all' && deal.source !== sourceFilter) return false;
      if (rankedMode && isRankedDeal(deal) && deal.tmv.confidence < minConfidence) return false;
      return true;
    });
  }, [categoryFilter, data, minConfidence, rankedMode, sourceFilter]);

  const sortedDeals = useMemo(() => {
    const sorted = [...filteredDeals];

    const getValue = (deal: Deal | RankedDeal): string | number => {
      switch (sortKey) {
        case 'title':
          return deal.title.toLowerCase();
        case 'source':
          return deal.source.toLowerCase();
        case 'price':
          return deal.price;
        case 'createdAt':
          return Date.parse(deal.createdAt);
        case 'tmv':
          return isRankedDeal(deal) ? deal.tmv.tmv : 0;
        case 'spread':
          return isRankedDeal(deal) ? deal.tmv.tmv - deal.price : 0;
        case 'profit':
          return isRankedDeal(deal) ? deal.score.profitMargin : 0;
        case 'velocity':
          return isRankedDeal(deal) ? deal.tmv.estimatedDaysToSell ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
        case 'confidence':
          return isRankedDeal(deal) ? deal.tmv.confidence : 0;
        case 'rank':
          return isRankedDeal(deal) ? deal.score.compositeRank : 0;
        default:
          return Date.parse(deal.createdAt);
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
  }, [filteredDeals, sortDirection, sortKey]);

  const columns = rankedMode
    ? [
        {
          key: 'title',
          header: 'Deal',
          sortable: true,
          render: (deal: RankedDeal) => <CellText primary={deal.title} secondary={deal.category} />,
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
          key: 'profit',
          header: 'Profit',
          sortable: true,
          align: 'right' as const,
          render: (deal: RankedDeal) => <CellPercent value={deal.score.profitMargin} />,
        },
        {
          key: 'confidence',
          header: 'Confidence',
          sortable: true,
          align: 'center' as const,
          render: (deal: RankedDeal) => <ConfidenceBadge confidence={deal.tmv.confidence} />,
        },
        {
          key: 'rank',
          header: 'Rank',
          sortable: true,
          align: 'center' as const,
          render: (deal: RankedDeal) => <span className={styles.rankBadge}>{Math.round(deal.score.compositeRank)}</span>,
        },
      ]
    : [
        {
          key: 'title',
          header: 'Deal',
          sortable: true,
          render: (deal: Deal) => <CellText primary={deal.title} secondary={deal.category} />,
        },
        {
          key: 'source',
          header: 'Source',
          sortable: true,
          render: (deal: Deal) => (
            <Badge variant="default" size="sm">
              {deal.source}
            </Badge>
          ),
        },
        {
          key: 'condition',
          header: 'Condition',
          render: (deal: Deal) => <ConditionBadge condition={deal.condition ?? 'Unknown'} />,
        },
        {
          key: 'price',
          header: 'Price',
          sortable: true,
          align: 'right' as const,
          render: (deal: Deal) => <CellCurrency value={deal.price} />,
        },
        {
          key: 'createdAt',
          header: 'Listed',
          sortable: true,
          render: (deal: Deal) => <CellText primary={new Date(deal.createdAt).toLocaleDateString()} secondary={deal.location ?? 'Unknown location'} />,
        },
      ];

  return (
    <div className={styles.page}>
      <Header
        title={rankedMode ? 'Top Ranked Deals' : 'All Deals'}
        subtitle={rankedMode ? `${sortedDeals.length} ranked opportunities` : `${sortedDeals.length} listings in the feed`}
        onRefresh={refetch}
        refreshing={loading}
      />

      <div className={styles.content}>
        <Card className={styles.filterBar}>
          <CardContent>
            <div className={styles.filters}>
              <div className={styles.tickerContainer}>
                {categoryStats.map((stat) => (
                  <button
                    key={stat.name}
                    className={`${styles.tickerItem} ${categoryFilter === stat.name ? styles.active : ''}`}
                    onClick={() => setCategoryFilter(stat.name)}
                  >
                    <span>{stat.name === 'all' ? 'ALL CATEGORIES' : stat.name}</span>
                    <span className={styles.tickerCount}>{stat.count}</span>
                  </button>
                ))}
              </div>

              <div className={styles.filterGroup}>
                <select className={styles.filterSelect} value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                  {sourceOptions.map((source) => (
                    <option key={source} value={source}>
                      {source === 'all' ? 'All Sources' : source}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <select className={styles.filterSelect} value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
                  <option value={rankedMode ? 'rank' : 'createdAt'}>{rankedMode ? 'Composite Rank' : 'Listed Time'}</option>
                  <option value="price">Price</option>
                  <option value="source">Source</option>
                  <option value="title">Title</option>
                  {rankedMode && <option value="tmv">TMV</option>}
                  {rankedMode && <option value="profit">Profit %</option>}
                  {rankedMode && <option value="confidence">Confidence</option>}
                  {rankedMode && <option value="velocity">Days to Sell</option>}
                </select>
                <button
                  className={styles.sortDirectionButton}
                  type="button"
                  onClick={() => setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}
                >
                  {sortDirection === 'asc' ? <ArrowUpAZ size={16} /> : <ArrowDownAZ size={16} />}
                </button>
              </div>

              {rankedMode && (
                <div className={styles.filterGroup}>
                  <select className={styles.filterSelect} value={minConfidence} onChange={(e) => setMinConfidence(Number(e.target.value))}>
                    <option value={0}>All confidence levels</option>
                    <option value={0.4}>40%+ confidence</option>
                    <option value={0.6}>60%+ confidence</option>
                    <option value={0.75}>75%+ confidence</option>
                    <option value={0.9}>90%+ confidence</option>
                  </select>
                </div>
              )}

              <div className={styles.viewToggle}>
                <button className={`${styles.viewButton} ${viewMode === 'grid' ? styles.active : ''}`} onClick={() => setViewMode('grid')}>
                  <Grid size={18} />
                </button>
                <button className={`${styles.viewButton} ${viewMode === 'table' ? styles.active : ''}`} onClick={() => setViewMode('table')}>
                  <List size={18} />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {error ? <Card><CardContent>{error}</CardContent></Card> : null}

        {viewMode === 'grid' ? (
          <DealGrid columns={2}>
            {sortedDeals.map((deal, index) => (
              <DealCard
                key={deal.id}
                deal={deal}
                rank={rankedMode ? index + 1 : undefined}
                variant={settings.compactMode ? 'compact' : rankedMode && index === 0 ? 'featured' : 'default'}
              />
            ))}
          </DealGrid>
        ) : (
          <DataTable
            data={sortedDeals}
            columns={columns as never}
            keyExtractor={(deal) => deal.id}
            loading={loading}
            compact={settings.compactMode}
            onRowClick={(deal) => navigate(`/deals/${deal.id}`)}
            onSort={(key, direction) => {
              if (!direction) return;
              setSortKey(key as SortKey);
              setSortDirection(direction);
            }}
            emptyMessage={rankedMode ? 'No ranked deals available yet' : 'No deals match your filters'}
          />
        )}
      </div>
    </div>
  );
}
