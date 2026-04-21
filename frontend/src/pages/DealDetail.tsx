import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, Clock, ExternalLink, RefreshCw, Shield, Target, TrendingUp } from 'lucide-react';
import { Header } from '../components/layout';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  ConditionBadge,
  ConfidenceBadge,
  MetricCard,
  MetricGrid,
  RiskBadge,
} from '../components/ui';
import { useAnalyzeDeal, useDeal, useRankedDeal, useTMV } from '../hooks/useDeals';
import type { RankedDeal } from '../types';
import styles from './DealDetail.module.css';

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

function formatDate(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DealDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: deal, loading: dealLoading, error: dealError, refetch: refetchDeal } = useDeal(id);
  const { data: rankedDeal, loading: rankedLoading, refetch: refetchRanked } = useRankedDeal(id);
  const { data: tmv, loading: tmvLoading, error: tmvError, refetch: refetchTMV } = useTMV(id);
  const { analyze, loading: analyzing, error: analyzeError } = useAnalyzeDeal();

  const detail = useMemo(() => {
    if (!deal) return null;
    if (!rankedDeal && !tmv) return deal;

    return {
      ...deal,
      tmv: rankedDeal?.tmv ?? tmv ?? undefined,
      score: rankedDeal?.score,
    } as RankedDeal | typeof deal;
  }, [deal, rankedDeal, tmv]);

  const handleAnalyze = async () => {
    if (!id) return;
    const result = await analyze(id);
    if (result) {
      refetchTMV();
      refetchRanked();
      refetchDeal();
    }
  };

  if (dealLoading || rankedLoading || tmvLoading) {
    return (
      <div className={styles.page}>
        <Header title="Loading deal..." />
        <div className={styles.content}>
          <div className={styles.skeleton} />
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className={styles.page}>
        <Header title="Deal not found" subtitle={dealError ?? 'No deal data available'} />
      </div>
    );
  }

  const hasTMV = detail.tmv !== undefined;
  const hasScore = detail.score !== undefined;
  const tmvData = detail.tmv;
  const scoreData = detail.score;
  const spread = tmvData ? tmvData.tmv - detail.price : null;
  const errorMessage = analyzeError ?? tmvError ?? null;

  return (
    <div className={styles.page}>
      <Header
        title="Deal Detail"
        subtitle={detail.category}
        onRefresh={handleAnalyze}
        refreshing={analyzing}
      />

      <div className={styles.content}>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          <ArrowLeft size={18} />
          Back to Deals
        </button>

        {errorMessage ? (
          <Card>
            <CardContent>{errorMessage}</CardContent>
          </Card>
        ) : null}

        <div className={styles.grid}>
          <div className={styles.mainColumn}>
            <Card padding="lg" className={styles.dealHeader}>
              <div className={styles.headerContent}>
                <div className={styles.badges}>
                  <Badge variant="default">{detail.source}</Badge>
                  <ConditionBadge condition={detail.condition ?? 'Unknown'} />
                  {hasScore ? (
                    <Badge variant="accent" glow>
                      Rank #{Math.round(scoreData!.compositeRank)}
                    </Badge>
                  ) : (
                    <Badge variant="warning">Unranked</Badge>
                  )}
                </div>
                <h1 className={styles.title}>{detail.title}</h1>
                <div className={styles.meta}>
                  <span>{detail.location ?? 'Unknown location'}</span>
                  <span className={styles.separator}>·</span>
                  <span>Listed {formatDate(detail.createdAt)}</span>
                </div>
              </div>
            </Card>

            <Card padding="lg">
              <CardHeader title="Price Analysis" subtitle="Current ask versus modeled market value" />
              <CardContent>
                <div className={styles.priceComparison}>
                  <div className={styles.priceBlock}>
                    <span className={styles.priceLabel}>Asking Price</span>
                    <span className={styles.askingPrice}>{formatCurrency(detail.price)}</span>
                  </div>

                  {hasTMV ? (
                    <>
                      <div className={styles.priceArrow}>
                        <TrendingUp size={24} />
                      </div>
                      <div className={styles.priceBlock}>
                        <span className={styles.priceLabel}>True Market Value</span>
                        <span className={styles.tmvPrice}>{formatCurrency(tmvData!.tmv)}</span>
                      </div>
                    </>
                  ) : null}
                </div>

                {spread !== null ? (
                  <div className={styles.profitBanner}>
                    <div className={styles.profitContent}>
                      <span className={styles.profitLabel}>Current Spread</span>
                      <div className={styles.profitValues}>
                        <span className={styles.profitAmount}>{spread >= 0 ? '+' : ''}{formatCurrency(spread)}</span>
                        {hasScore ? (
                          <span className={styles.profitPercent}>({formatPercent(scoreData!.profitMargin)} margin)</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button variant="primary" onClick={handleAnalyze} loading={analyzing} icon={<RefreshCw size={16} />}>
                    Run TMV Analysis
                  </Button>
                )}
              </CardContent>
            </Card>

            {hasTMV ? (
              <Card padding="lg">
                <CardHeader title="TMV Engine Analysis" subtitle={`Calculated ${formatDate(tmvData!.calculatedAt)}`} />
                <CardContent>
                  <MetricGrid columns={3}>
                    <MetricCard label="Sample Count" value={tmvData!.sampleCount} icon={<BarChart3 size={16} />} subtitle="Sold comps used" />
                    <MetricCard label="Volatility" value={formatPercent(tmvData!.volatility)} icon={<TrendingUp size={16} />} subtitle="Relative price dispersion" />
                    <MetricCard label="Liquidity" value={formatPercent(tmvData!.liquidityScore)} icon={<Target size={16} />} subtitle="Estimated market activity" />
                  </MetricGrid>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className={styles.sideColumn}>
            <Card padding="lg">
              <CardHeader title="Quick Stats" />
              <CardContent>
                <div className={styles.statsList}>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}><Target size={14} />Confidence</span>
                    {hasTMV ? <ConfidenceBadge confidence={tmvData!.confidence} /> : <span className={styles.statValue}>Not calculated</span>}
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}><Shield size={14} />Risk</span>
                    {hasScore ? <RiskBadge riskScore={scoreData!.riskScore} /> : <span className={styles.statValue}>Unavailable</span>}
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}><Clock size={14} />Est. Sell Time</span>
                    <span className={styles.statValue}>{hasTMV && tmvData!.estimatedDaysToSell != null ? `${tmvData!.estimatedDaysToSell} days` : 'Unavailable'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card padding="lg">
              <CardHeader title="Actions" />
              <CardContent>
                <div className={styles.actions}>
                  <Button variant="primary" fullWidth icon={<RefreshCw size={16} />} onClick={handleAnalyze} loading={analyzing}>
                    {hasTMV ? 'Re-run Analysis' : 'Analyze Deal'}
                  </Button>
                  {detail.url ? (
                    <Button
                      variant="secondary"
                      fullWidth
                      icon={<ExternalLink size={16} />}
                      iconPosition="right"
                      onClick={() => window.open(detail.url!, '_blank', 'noopener,noreferrer')}
                    >
                      View Original Listing
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card padding="lg">
              <CardHeader title="Source Details" />
              <CardContent>
                <div className={styles.sourceInfo}>
                  <div className={styles.sourceRow}>
                    <span className={styles.sourceLabel}>Platform</span>
                    <span className={styles.sourceValue}>{detail.source}</span>
                  </div>
                  <div className={styles.sourceRow}>
                    <span className={styles.sourceLabel}>Source ID</span>
                    <span className={styles.sourceValue}>{detail.sourceId}</span>
                  </div>
                  <div className={styles.sourceRow}>
                    <span className={styles.sourceLabel}>Category</span>
                    <span className={styles.sourceValue}>{detail.category}</span>
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
