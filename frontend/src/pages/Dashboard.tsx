import { useMemo } from 'react';
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
import { useRankedDeals } from '../hooks/useDeals';
import type { RankedDeal } from '../types';
import styles from './Dashboard.module.css';

// Mock data for demonstration when API is not available
const mockRankedDeals: RankedDeal[] = [
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
];

export function Dashboard() {
  const { data: rankedDeals, loading: rankedLoading, refetch } = useRankedDeals();

  // Use mock data if API fails
  const deals = rankedDeals || mockRankedDeals;
  const loading = rankedLoading && !mockRankedDeals.length;

  // Calculate summary metrics
  const metrics = useMemo(() => {
    if (!deals.length) {
      return {
        totalDeals: 0,
        avgProfit: 0,
        totalPotential: 0,
        avgConfidence: 0,
        topDeal: null,
      };
    }

    const totalPotential = deals.reduce(
      (sum, d) => sum + (d.tmv.tmv - d.price),
      0
    );
    const avgProfit =
      deals.reduce((sum, d) => sum + d.score.profitMargin, 0) / deals.length;
    const avgConfidence =
      deals.reduce((sum, d) => sum + d.tmv.confidence, 0) / deals.length;

    return {
      totalDeals: deals.length,
      avgProfit,
      totalPotential,
      avgConfidence,
      topDeal: deals[0],
    };
  }, [deals]);

  const topDeals = deals.slice(0, 6);

  return (
    <div className={styles.page}>
      <Header
        title="Dashboard"
        subtitle="Real-time deal analysis and rankings"
        onRefresh={refetch}
        refreshing={loading}
      />

      <div className={styles.content}>
        {/* Summary Metrics */}
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
              trend="up"
              trendValue="+2.3%"
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

        {/* Top Ranked Deals */}
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
          ) : (
            <DealGrid columns={2}>
              {topDeals.map((deal, index) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  rank={index + 1}
                  variant={index === 0 ? 'featured' : 'default'}
                />
              ))}
            </DealGrid>
          )}
        </section>

        {/* Quick Stats */}
        <section className={styles.section}>
          <div className={styles.statsGrid}>
            <Card>
              <CardHeader title="Category Breakdown" />
              <CardContent>
                <div className={styles.categoryList}>
                  {[
                    { name: 'Gaming', count: 12, profit: 28.5 },
                    { name: 'Electronics', count: 8, profit: 24.2 },
                    { name: 'Computers', count: 6, profit: 31.4 },
                    { name: 'Audio', count: 4, profit: 19.8 },
                  ].map((cat) => (
                    <div key={cat.name} className={styles.categoryItem}>
                      <div className={styles.categoryInfo}>
                        <span className={styles.categoryName}>{cat.name}</span>
                        <span className={styles.categoryCount}>
                          {cat.count} deals
                        </span>
                      </div>
                      <span className={styles.categoryProfit}>
                        +{cat.profit}%
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
                  {[
                    { name: 'eBay', deals: 15, score: 87 },
                    { name: 'FB Marketplace', deals: 12, score: 82 },
                    { name: 'Craigslist', deals: 8, score: 74 },
                    { name: 'OfferUp', deals: 5, score: 71 },
                  ].map((source) => (
                    <div key={source.name} className={styles.sourceItem}>
                      <div className={styles.sourceInfo}>
                        <span className={styles.sourceName}>{source.name}</span>
                        <span className={styles.sourceDeals}>
                          {source.deals} active
                        </span>
                      </div>
                      <div className={styles.sourceScore}>
                        <BarChart3 size={14} />
                        <span>{source.score}</span>
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
