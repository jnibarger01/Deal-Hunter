import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  TrendingUp,
  Clock,
  Shield,
  BarChart3,
  Target,
  Activity,
  DollarSign,
  RefreshCw,
} from 'lucide-react';
import { Header } from '../components/layout';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  MetricCard,
  MetricGrid,
  Badge,
  ConfidenceBadge,
  RiskBadge,
  ConditionBadge,
} from '../components/ui';
import { useDeal, useCalculateTMV } from '../hooks/useDeals';
import type { RankedDeal } from '../types';
import styles from './DealDetail.module.css';

// Mock data for when API is unavailable
const mockDeal: RankedDeal = {
  id: '1',
  source: 'eBay',
  sourceId: 'eb-123456',
  title: 'Sony PlayStation 5 Console - Digital Edition with Extra Controller',
  price: 350,
  condition: 'Like New',
  category: 'Gaming',
  location: 'Los Angeles, CA',
  url: 'https://example.com/deal/1',
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
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
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: apiDeal, loading: dealLoading } = useDeal(id || '');
  const { calculate, loading: calculating } = useCalculateTMV();

  // Use mock data if API unavailable
  const deal = (apiDeal as RankedDeal) || mockDeal;
  const loading = dealLoading && !mockDeal;

  const hasTMV = deal.tmv !== undefined;
  const hasScore = deal.score !== undefined;
  const profitAmount = hasTMV ? deal.tmv.tmv - deal.price : 0;

  const handleRecalculate = async () => {
    if (id) {
      await calculate(id);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Header title="Loading..." />
        <div className={styles.content}>
          <div className={styles.skeleton} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header
        title="Deal Analysis"
        subtitle={deal.category}
        onRefresh={handleRecalculate}
        refreshing={calculating}
      />

      <div className={styles.content}>
        {/* Back navigation */}
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          <ArrowLeft size={18} />
          Back to Deals
        </button>

        {/* Main content grid */}
        <div className={styles.grid}>
          {/* Left column - Deal info */}
          <div className={styles.mainColumn}>
            {/* Deal Header */}
            <Card padding="lg" className={styles.dealHeader}>
              <div className={styles.headerContent}>
                <div className={styles.badges}>
                  <Badge variant="default">{deal.source}</Badge>
                  <ConditionBadge condition={deal.condition} />
                  {hasScore && (
                    <Badge variant="accent" glow>
                      Rank #{deal.score.compositeRank}
                    </Badge>
                  )}
                </div>
                <h1 className={styles.title}>{deal.title}</h1>
                <div className={styles.meta}>
                  <span className={styles.location}>{deal.location}</span>
                  <span className={styles.separator}>·</span>
                  <span className={styles.date}>Listed {formatDate(deal.createdAt)}</span>
                </div>
              </div>
            </Card>

            {/* Price Analysis */}
            <Card padding="lg">
              <CardHeader title="Price Analysis" subtitle="TMV comparison and profit potential" />
              <CardContent>
                <div className={styles.priceComparison}>
                  <div className={styles.priceBlock}>
                    <span className={styles.priceLabel}>Asking Price</span>
                    <span className={styles.askingPrice}>{formatCurrency(deal.price)}</span>
                  </div>

                  {hasTMV && (
                    <>
                      <div className={styles.priceArrow}>
                        <TrendingUp size={24} />
                      </div>
                      <div className={styles.priceBlock}>
                        <span className={styles.priceLabel}>True Market Value</span>
                        <span className={styles.tmvPrice}>{formatCurrency(deal.tmv.tmv)}</span>
                      </div>
                    </>
                  )}
                </div>

                {hasTMV && profitAmount > 0 && (
                  <div className={styles.profitBanner}>
                    <div className={styles.profitContent}>
                      <span className={styles.profitLabel}>Potential Profit</span>
                      <div className={styles.profitValues}>
                        <span className={styles.profitAmount}>
                          +{formatCurrency(profitAmount)}
                        </span>
                        <span className={styles.profitPercent}>
                          ({formatPercent(deal.score?.profitMargin || 0)} margin)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* TMV Details */}
            {hasTMV && (
              <Card padding="lg">
                <CardHeader
                  title="TMV Engine Analysis"
                  subtitle={`Calculated ${formatDate(deal.tmv.calculatedAt)}`}
                  action={
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<RefreshCw size={14} />}
                      onClick={handleRecalculate}
                      loading={calculating}
                    >
                      Recalculate
                    </Button>
                  }
                />
                <CardContent>
                  <MetricGrid columns={3}>
                    <MetricCard
                      label="Sample Count"
                      value={deal.tmv.sampleCount}
                      icon={<BarChart3 size={16} />}
                      subtitle="Market data points"
                    />
                    <MetricCard
                      label="Volatility"
                      value={formatPercent(deal.tmv.volatility)}
                      icon={<Activity size={16} />}
                      variant={deal.tmv.volatility > 0.2 ? 'warning' : 'default'}
                      subtitle="Price variation"
                    />
                    <MetricCard
                      label="Liquidity"
                      value={formatPercent(deal.tmv.liquidityScore)}
                      icon={<Target size={16} />}
                      variant={deal.tmv.liquidityScore > 0.7 ? 'profit' : 'default'}
                      subtitle="Market activity"
                    />
                  </MetricGrid>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column - Quick stats & actions */}
          <div className={styles.sideColumn}>
            {/* Quick Stats */}
            {hasScore && (
              <Card padding="lg">
                <CardHeader title="Quick Stats" />
                <CardContent>
                  <div className={styles.statsList}>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>
                        <Target size={14} />
                        Confidence
                      </span>
                      <ConfidenceBadge confidence={deal.tmv.confidence} />
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>
                        <Shield size={14} />
                        Risk Level
                      </span>
                      <RiskBadge riskScore={deal.score.riskScore} />
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>
                        <Clock size={14} />
                        Est. Sell Time
                      </span>
                      <span className={styles.statValue}>
                        {deal.tmv.estimatedDaysToSell} days
                      </span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>
                        <TrendingUp size={14} />
                        Velocity Score
                      </span>
                      <span className={styles.statValue}>
                        {formatPercent(deal.score.velocityScore)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card padding="lg">
              <CardHeader title="Actions" />
              <CardContent>
                <div className={styles.actions}>
                  <Button
                    variant="primary"
                    fullWidth
                    icon={<ExternalLink size={16} />}
                    iconPosition="right"
                    onClick={() => window.open(deal.url, '_blank')}
                  >
                    View Original Listing
                  </Button>
                  <Button
                    variant="secondary"
                    fullWidth
                    icon={<DollarSign size={16} />}
                  >
                    Track This Deal
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Source Info */}
            <Card padding="lg">
              <CardHeader title="Source Details" />
              <CardContent>
                <div className={styles.sourceInfo}>
                  <div className={styles.sourceRow}>
                    <span className={styles.sourceLabel}>Platform</span>
                    <span className={styles.sourceValue}>{deal.source}</span>
                  </div>
                  <div className={styles.sourceRow}>
                    <span className={styles.sourceLabel}>Source ID</span>
                    <span className={styles.sourceValue}>{deal.sourceId}</span>
                  </div>
                  <div className={styles.sourceRow}>
                    <span className={styles.sourceLabel}>Category</span>
                    <span className={styles.sourceValue}>{deal.category}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
