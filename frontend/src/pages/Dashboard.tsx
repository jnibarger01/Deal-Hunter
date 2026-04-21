import { useEffect, useMemo } from 'react';
import { Activity, DollarSign, Target, TrendingUp, Zap } from 'lucide-react';
import { Header } from '../components/layout';
import { Card, CardContent, CardHeader, DealCard, DealGrid, MetricCard, MetricGrid } from '../components/ui';
import { useRankedDeals } from '../hooks/useDeals';
import { useAppSettings } from '../context/AppSettingsContext';
import styles from './Dashboard.module.css';

export function Dashboard() {
  const { data: deals, loading, error, refetch } = useRankedDeals();
  const { settings } = useAppSettings();

  useEffect(() => {
    if (!settings.autoRefreshSec || settings.autoRefreshSec < 15) return;
    const id = window.setInterval(refetch, settings.autoRefreshSec * 1000);
    return () => window.clearInterval(id);
  }, [refetch, settings.autoRefreshSec]);

  const rankedDeals = deals ?? [];

  const metrics = useMemo(() => {
    if (!rankedDeals.length) {
      return {
        totalDeals: 0,
        avgProfitMargin: 0,
        totalSpread: 0,
        avgConfidence: 0,
      };
    }

    return {
      totalDeals: rankedDeals.length,
      avgProfitMargin:
        rankedDeals.reduce((sum, deal) => sum + deal.score.profitMargin, 0) / rankedDeals.length,
      totalSpread: rankedDeals.reduce((sum, deal) => sum + (deal.tmv.tmv - deal.price), 0),
      avgConfidence:
        rankedDeals.reduce((sum, deal) => sum + deal.tmv.confidence, 0) / rankedDeals.length,
    };
  }, [rankedDeals]);

  const topDeals = rankedDeals.slice(0, 4);

  const sourceBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    rankedDeals.forEach((deal) => counts.set(deal.source, (counts.get(deal.source) ?? 0) + 1));
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [rankedDeals]);

  const categoryBreakdown = useMemo(() => {
    const totals = new Map<string, { count: number; avgMargin: number }>();

    rankedDeals.forEach((deal) => {
      const current = totals.get(deal.category) ?? { count: 0, avgMargin: 0 };
      totals.set(deal.category, {
        count: current.count + 1,
        avgMargin: current.avgMargin + deal.score.profitMargin,
      });
    });

    return Array.from(totals.entries())
      .map(([name, value]) => ({
        name,
        count: value.count,
        profit: value.avgMargin / value.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [rankedDeals]);

  return (
    <div className={styles.page}>
      <Header
        title="Dashboard"
        subtitle="PRD-v1 overview of currently ranked opportunities"
        onRefresh={refetch}
        refreshing={loading}
      />

      <div className={styles.content}>
        {error ? (
          <Card>
            <CardContent>{error}</CardContent>
          </Card>
        ) : null}

        <section className={styles.section}>
          <MetricGrid columns={4}>
            <MetricCard label="Ranked Deals" value={metrics.totalDeals} icon={<Activity size={16} />} variant="accent" loading={loading} />
            <MetricCard label="Avg Profit Margin" value={(metrics.avgProfitMargin * 100).toFixed(1)} suffix="%" icon={<TrendingUp size={16} />} variant="profit" loading={loading} />
            <MetricCard label="Total Spread" value={metrics.totalSpread.toLocaleString(undefined, { maximumFractionDigits: 0 })} prefix="$" icon={<DollarSign size={16} />} variant="profit" loading={loading} />
            <MetricCard label="Avg Confidence" value={(metrics.avgConfidence * 100).toFixed(0)} suffix="%" icon={<Target size={16} />} loading={loading} />
          </MetricGrid>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}><Zap size={20} className={styles.sectionIcon} />Top Ranked Deals</h2>
              <p className={styles.sectionSubtitle}>Highest composite rank from the current feed</p>
            </div>
          </div>

          {loading ? (
            <DealGrid columns={2}>
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className={styles.skeletonCard} />
              ))}
            </DealGrid>
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

        <section className={styles.section}>
          <div className={styles.statsGrid}>
            <Card>
              <CardHeader title="Category Breakdown" />
              <CardContent>
                <div className={styles.categoryList}>
                  {categoryBreakdown.map((category) => (
                    <div key={category.name} className={styles.categoryItem}>
                      <div className={styles.categoryInfo}>
                        <span className={styles.categoryName}>{category.name}</span>
                        <span className={styles.categoryCount}>{category.count} ranked deals</span>
                      </div>
                      <span className={styles.categoryProfit}>+{(category.profit * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Source Breakdown" />
              <CardContent>
                <div className={styles.sourceList}>
                  {sourceBreakdown.map((source) => (
                    <div key={source.name} className={styles.sourceItem}>
                      <div className={styles.sourceInfo}>
                        <span className={styles.sourceName}>{source.name}</span>
                        <span className={styles.sourceDeals}>{source.count} active ranked</span>
                      </div>
                      <div className={styles.sourceScore}>
                        <span>{source.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
