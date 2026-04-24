import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, RefreshCw, TrendingUp, Zap } from 'lucide-react';
import { Card, Badge } from '../components/ui';
import { useDeal, useCalculateTMV, useDealIntelligence } from '../hooks/useDeals';
import { adaptDealIntelligenceView } from '../adapters/dealIntelligence';
import type { Deal, TMVResult } from '../types';
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
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(0)}%`;
}

function toTitleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function sourceLabel(source: string): string {
  const normalized = source.toLowerCase();
  if (normalized === 'ebay') return 'eBay';
  if (normalized === 'craigslist') return 'Craigslist';
  if (normalized === 'facebook' || normalized === 'fb marketplace') return 'FB Marketplace';
  return toTitleCase(source);
}

function PriceHistoryChart({ values, marketValue }: { values: number[]; marketValue: number }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = max === min ? 50 : 100 - ((value - min) / (max - min)) * 100;
      return `${x},${y}`;
    })
    .join(' ');
  const pointTokens = points.split(' ');
  const lastPoint = (pointTokens[pointTokens.length - 1] ?? '100,50').split(',');

  return (
    <div className={styles.chartShell}>
      <div className={styles.chartHeader}>
        <span>6-Month Price History</span>
        <span className={styles.chartTarget}>Target: {formatCurrency(marketValue)}</span>
      </div>
      <div className={styles.chartArea}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={styles.chartSvg} aria-label="6-month price history">
          <polyline fill="none" points={points} className={styles.chartLine} />
          <circle cx={lastPoint[0]} cy={lastPoint[1]} r="3.5" className={styles.chartDot} />
        </svg>
        <div className={styles.chartFooter}>
          <span>6MO AGO</span>
          <span>NOW</span>
        </div>
      </div>
    </div>
  );
}

export function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: deal, loading: dealLoading, refetch } = useDeal(id || '');
  const { data: intelligence, refetch: refetchIntelligence } = useDealIntelligence(id || '');
  const { calculate, loading: calculating } = useCalculateTMV();
  const [localTMV, setLocalTMV] = useState<TMVResult | null>(null);

  useEffect(() => {
    if (deal?.tmv) {
      setLocalTMV(null);
    }
  }, [deal?.tmv]);

  const loading = dealLoading && !deal;
  const dealWithAnalytics: Deal | undefined = deal ?? undefined;

  const tmv = dealWithAnalytics?.tmv ?? localTMV ?? undefined;
  const intelligenceView = useMemo(() => {
    if (!dealWithAnalytics) {
      return null;
    }

    return adaptDealIntelligenceView(dealWithAnalytics, intelligence, tmv);
  }, [dealWithAnalytics, intelligence, tmv]);

  const handleRecalculate = async () => {
    if (!id) return;
    const recalculated = await calculate(id);
    if (recalculated) {
      setLocalTMV(recalculated);
    }
    refetch();
    refetchIntelligence();
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.content}>
          <div className={styles.skeleton} />
        </div>
      </div>
    );
  }

  if (!dealWithAnalytics) {
    return (
      <div className={styles.page}>
        <div className={styles.content}>
          <h1 className={styles.emptyTitle}>Deal not found</h1>
          <p className={styles.emptyText}>No deal data available.</p>
        </div>
      </div>
    );
  }

  if (!intelligenceView) {
    return null;
  }

  const { dealScore, description, marketDynamics, marketValue, negotiation, repairAnalysis, roi } = intelligenceView;

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          <ArrowLeft size={18} />
          Back to Feed
        </button>

        <div className={styles.grid}>
          <section className={styles.leftPanel}>
            {dealWithAnalytics.imageUrl ? (
              <img src={dealWithAnalytics.imageUrl} alt={dealWithAnalytics.title} className={styles.heroImageTag} />
            ) : (
              <div className={styles.heroImage} aria-hidden="true" />
            )}
            <h1 className={styles.title}>{dealWithAnalytics.title}</h1>

            <div className={styles.metricRow}>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>List Price</span>
                <span className={styles.metricValue}>{formatCurrency(dealWithAnalytics.price)}</span>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>Market Value</span>
                <span className={styles.metricValue}>{formatCurrency(marketValue)}</span>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>ROI</span>
                <span className={`${styles.metricValue} ${roi >= 0 ? styles.positiveValue : styles.negativeValue}`}>{formatPercent(roi)}</span>
              </div>
            </div>

            <div className={styles.sectionBlock}>
              <span className={styles.sectionEyebrow}>Description</span>
              <Card className={styles.descriptionCard}>
                <p className={styles.descriptionText}>{description}</p>
              </Card>
            </div>

            <div className={styles.tagRow}>
              <Badge variant="accent">{sourceLabel(dealWithAnalytics.source)}</Badge>
              <Badge variant="info">{dealWithAnalytics.condition ? `${toTitleCase(dealWithAnalytics.condition)} condition` : 'Condition unknown'}</Badge>
              <Badge variant="default">{dealWithAnalytics.location ?? 'Location unknown'}</Badge>
            </div>
          </section>

          <aside className={styles.rightPanel}>
            <div className={styles.intelligenceHeader}>
              <div className={styles.intelligenceTitleWrap}>
                <div className={styles.intelligenceIcon}>
                  <Zap size={18} />
                </div>
                <div>
                  <h2 className={styles.intelligenceTitle}>Deal Intelligence</h2>
                </div>
              </div>
              <div className={styles.scoreBlock}>
                <span className={styles.scoreLabel}>Deal Score</span>
                <span className={styles.scoreValue}>{dealScore}</span>
              </div>
            </div>

            <Card className={styles.intelligenceCard}>
              <div className={styles.cardTopRow}>
                <span className={styles.cardEyebrow}>Repair Analysis</span>
                <Badge variant="success">{repairAnalysis.skillLevel}</Badge>
              </div>
              <p className={styles.analysisText}>{repairAnalysis.summary}</p>
              <div className={styles.dualStatGrid}>
                <div className={styles.subPanel}>
                  <span className={styles.subPanelLabel}>Likely Issue</span>
                  <p className={styles.subPanelText}>{repairAnalysis.likelyIssue}</p>
                </div>
                <div className={styles.subPanel}>
                  <span className={styles.subPanelLabel}>Parts Cost</span>
                  <p className={styles.subPanelValue}>{formatCurrency(repairAnalysis.partsCost)}</p>
                </div>
              </div>
            </Card>

            <Card className={styles.intelligenceCard}>
              <div className={styles.cardTopRow}>
                <span className={styles.cardEyebrow}>Market Dynamics</span>
                <button className={styles.refreshButton} onClick={handleRecalculate} disabled={calculating}>
                  <RefreshCw size={14} className={calculating ? styles.spinning : ''} />
                  Refresh
                </button>
              </div>
              <p className={styles.analysisText}>{marketDynamics.summary}</p>
              <PriceHistoryChart values={marketDynamics.priceHistory} marketValue={marketDynamics.targetPrice} />
            </Card>

            <Card className={styles.intelligenceCard}>
              <div className={styles.cardTopRow}>
                <span className={styles.cardEyebrow}>Negotiation AI</span>
                <div className={styles.offerBlock}>
                  <span className={styles.offerLabel}>Target Offer</span>
                  <span className={styles.offerValue}>{formatCurrency(negotiation.targetOffer)}</span>
                </div>
              </div>
              <div className={styles.scriptBlock}>
                <span className={styles.subPanelLabel}>Opening Script</span>
                <p className={styles.scriptText}>{negotiation.openingScript}</p>
              </div>
              <div className={styles.actionRow}>
                {dealWithAnalytics.url ? (
                  <a href={dealWithAnalytics.url} target="_blank" rel="noopener noreferrer" className={styles.primaryAction}>
                    View Original Listing
                    <ExternalLink size={14} />
                  </a>
                ) : null}
                <div className={styles.inlineStat}>
                  <TrendingUp size={14} />
                  <span>{tmv ? `TMV confidence ${(tmv.confidence * 100).toFixed(0)}%` : 'Using heuristic market estimate'}</span>
                </div>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
