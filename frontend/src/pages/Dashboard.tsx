import { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Activity,
  Target,
  Zap,
  BarChart3,
} from 'lucide-react';
import { Header } from '../components/layout';
import { MetricCard, MetricGrid, DealCard, DealGrid, Card, CardHeader, CardContent } from '../components/ui';
import { useLiveEbayDeals, useRankedDeals } from '../hooks/useDeals';
import { useAppSettings } from '../context/AppSettingsContext';
import type { RankedDeal } from '../types';
import styles from './Dashboard.module.css';

interface CategoryStat {
  name: string;
  count: number;
  avgProfitMargin: number;
}

interface SourceStat {
  name: string;
  count: number;
  avgRank: number;
}

const LIVE_EBAY_CATEGORIES = ['automotive', 'gaming', 'tech', 'tvs', 'speakers', 'tools'] as const;

function aggregateByKey<T extends keyof RankedDeal>(
  deals: RankedDeal[],
  key: T,
  project: (deal: RankedDeal) => number
) {
  const groups = new Map<string, { count: number; total: number }>();
  for (const deal of deals) {
    const bucket = String(deal[key] ?? 'Unknown');
    const existing = groups.get(bucket) ?? { count: 0, total: 0 };
    existing.count += 1;
    existing.total += project(deal);
    groups.set(bucket, existing);
  }
  return Array.from(groups.entries())
    .map(([name, { count, total }]) => ({ name, count, avg: count > 0 ? total / count : 0 }))
    .sort((a, b) => b.count - a.count);
}

export function Dashboard() {
  const { data: rankedDeals, loading: rankedLoading, refetch } = useRankedDeals();
  const { settings } = useAppSettings();
  const [liveCategory, setLiveCategory] = useState<(typeof LIVE_EBAY_CATEGORIES)[number]>('tech');
  const [liveFeedEnabled, setLiveFeedEnabled] = useState(false);
  const {
    data: liveEbayDeals,
    loading: liveEbayLoading,
    refetch: refetchLiveEbayDeals,
  } = useLiveEbayDeals(liveCategory, liveFeedEnabled);

  const deals = rankedDeals ?? [];
  const loading = rankedLoading && deals.length === 0;

  const metrics = useMemo(() => {
    if (!deals.length) {
      return {
        totalDeals: 0,
        avgProfit: 0,
        totalPotential: 0,
        avgConfidence: 0,
      };
    }

    const totalPotential = deals.reduce((sum, d) => sum + (d.tmv.tmv - d.price), 0);
    const avgProfit = deals.reduce((sum, d) => sum + d.score.profitMargin, 0) / deals.length;
    const avgConfidence = deals.reduce((sum, d) => sum + d.tmv.confidence, 0) / deals.length;

    return {
      totalDeals: deals.length,
      avgProfit,
      totalPotential,
      avgConfidence,
    };
  }, [deals]);

  const categoryStats: CategoryStat[] = useMemo(() => {
    return aggregateByKey(deals, 'category', (d) => d.score.profitMargin).map(
      ({ name, count, avg }) => ({ name, count, avgProfitMargin: avg })
    );
  }, [deals]);

  const sourceStats: SourceStat[] = useMemo(() => {
    return aggregateByKey(deals, 'source', (d) => d.score.compositeRank).map(
      ({ name, count, avg }) => ({ name, count, avgRank: Math.round(avg) })
    );
  }, [deals]);

  const topDeals = deals.slice(0, 6);

  useEffect(() => {
    if (!settings.autoRefreshSec || settings.autoRefreshSec < 15) return;
    const id = window.setInterval(() => {
      refetch();
    }, settings.autoRefreshSec * 1000);

    return () => window.clearInterval(id);
  }, [refetch, settings.autoRefreshSec]);

  return (
    <div className={styles.page}>
      <Header
        title="Dashboard"
        subtitle="Real-time deal analysis and rankings"
        onRefresh={() => {
          refetch();
          if (liveFeedEnabled) {
            refetchLiveEbayDeals();
          }
        }}
        refreshing={loading || (liveFeedEnabled && liveEbayLoading)}
      />

      <div className={styles.content}>
        <section className={styles.section}>
          <MetricGrid columns={4}>
            <MetricCard
              label="Active Deals"
              value={metrics.totalDeals}
              icon={<Activity size={16} />}
              variant="accent"
              loading={loading}
            />
            <MetricCard
              label="Avg Profit Margin"
              value={(metrics.avgProfit * 100).toFixed(1)}
              suffix="%"
              icon={<TrendingUp size={16} />}
              variant="profit"
              loading={loading}
            />
            <MetricCard
              label="Total Potential"
              value={metrics.totalPotential.toLocaleString()}
              prefix="$"
              icon={<DollarSign size={16} />}
              variant="profit"
              loading={loading}
            />
            <MetricCard
              label="Avg Confidence"
              value={(metrics.avgConfidence * 100).toFixed(0)}
              suffix="%"
              icon={<Target size={16} />}
              variant="default"
              loading={loading}
            />
          </MetricGrid>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>
                <Zap size={20} className={styles.sectionIcon} />
                Live eBay Feed
              </h2>
              <p className={styles.sectionSubtitle}>
                Fresh listings by category preset while we wire the rest of the marketplaces.
              </p>
            </div>
          </div>

          <div className={styles.liveCategoryRow}>
            {LIVE_EBAY_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className={`${styles.liveCategoryButton} ${
                  liveCategory === category ? styles.liveCategoryButtonActive : ''
                }`}
                onClick={() => setLiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          {!liveFeedEnabled ? (
            <Card>
              <CardContent>
                <p className={styles.sectionSubtitle}>
                  Live eBay pulls hit external APIs and persist data, so they stay manual by design.
                </p>
                <button
                  type="button"
                  className={styles.loadLiveButton}
                  onClick={() => setLiveFeedEnabled(true)}
                >
                  Load Live eBay Deals
                </button>
              </CardContent>
            </Card>
          ) : liveEbayLoading ? (
            <DealGrid columns={2}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={styles.skeletonCard} />
              ))}
            </DealGrid>
          ) : (liveEbayDeals ?? []).length === 0 ? (
            <Card>
              <CardContent>
                <p className={styles.sectionSubtitle}>
                  No live eBay deals returned for {liveCategory}. Try another category or refresh.
                </p>
              </CardContent>
            </Card>
          ) : (
            <DealGrid columns={2}>
              {(liveEbayDeals ?? []).map((deal) => (
                <DealCard key={deal.id} deal={deal} variant="default" />
              ))}
            </DealGrid>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>
                <Zap size={20} className={styles.sectionIcon} />
                Top Ranked Deals
              </h2>
              <p className={styles.sectionSubtitle}>
                Highest composite score opportunities
              </p>
            </div>
          </div>

          {loading ? (
            <DealGrid columns={2}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={styles.skeletonCard} />
              ))}
            </DealGrid>
          ) : topDeals.length === 0 ? (
            <Card>
              <CardContent>
                <p className={styles.sectionSubtitle}>
                  No ranked deals yet. Ingest listings and run TMV + Score to populate this feed.
                </p>
              </CardContent>
            </Card>
          ) : (
            <DealGrid columns={2}>
              {topDeals.map((deal, index) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  rank={index + 1}
                  variant={settings.compactMode ? 'compact' : index === 0 ? 'featured' : 'default'}
                />
              ))}
            </DealGrid>
          )}
        </section>

        {deals.length > 0 && (
          <section className={styles.section}>
            <div className={styles.statsGrid}>
              <Card>
                <CardHeader title="Category Breakdown" />
                <CardContent>
                  <div className={styles.categoryList}>
                    {categoryStats.map((cat) => (
                      <div key={cat.name} className={styles.categoryItem}>
                        <div className={styles.categoryInfo}>
                          <span className={styles.categoryName}>{cat.name}</span>
                          <span className={styles.categoryCount}>
                            {cat.count} {cat.count === 1 ? 'deal' : 'deals'}
                          </span>
                        </div>
                        <span className={styles.categoryProfit}>
                          {(cat.avgProfitMargin * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader title="Source Performance" />
                <CardContent>
                  <div className={styles.sourceList}>
                    {sourceStats.map((source) => (
                      <div key={source.name} className={styles.sourceItem}>
                        <div className={styles.sourceInfo}>
                          <span className={styles.sourceName}>{source.name}</span>
                          <span className={styles.sourceDeals}>
                            {source.count} active
                          </span>
                        </div>
                        <div className={styles.sourceScore}>
                          <BarChart3 size={14} />
                          <span>{source.avgRank}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
