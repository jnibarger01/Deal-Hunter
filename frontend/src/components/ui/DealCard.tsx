import { ExternalLink, TrendingUp, Clock, Shield, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { RankedDeal, Deal } from '../../types';
import { Badge, ConfidenceBadge, RiskBadge, ConditionBadge } from './Badge';
import styles from './DealCard.module.css';

interface DealCardProps {
  deal: RankedDeal | Deal;
  rank?: number;
  variant?: 'default' | 'compact' | 'featured';
}

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

function isRankedDeal(deal: RankedDeal | Deal): deal is RankedDeal {
  return 'tmv' in deal && 'score' in deal && deal.tmv !== undefined && deal.score !== undefined;
}

export function DealCard({ deal, rank, variant = 'default' }: DealCardProps) {
  const hasAnalytics = isRankedDeal(deal);
  const profitAmount = hasAnalytics ? deal.tmv.tmv - deal.price : 0;
  const profitPercent = hasAnalytics ? deal.score.profitMargin : 0;

  return (
    <div className={`${styles.card} ${styles[`variant-${variant}`]}`}>
      {/* Rank indicator */}
      {rank && (
        <div className={styles.rank}>
          <span className={styles.rankNumber}>#{rank}</span>
        </div>
      )}

      {/* Header with title and source */}
      <div className={styles.header}>
        <Link to={`/deals/${deal.id}`} className={styles.title}>
          {deal.title}
        </Link>
        <div className={styles.meta}>
          <Badge variant="default" size="sm">
            {deal.source}
          </Badge>
          <ConditionBadge condition={deal.condition} />
        </div>
      </div>

      {/* Price comparison */}
      <div className={styles.priceSection}>
        <div className={styles.priceMain}>
          <span className={styles.priceLabel}>Asking</span>
          <span className={styles.priceValue}>{formatCurrency(deal.price)}</span>
        </div>

        {hasAnalytics && (
          <>
            <div className={styles.priceDivider}>
              <TrendingUp size={16} />
            </div>
            <div className={styles.priceTmv}>
              <span className={styles.priceLabel}>TMV</span>
              <span className={styles.tmvValue}>{formatCurrency(deal.tmv.tmv)}</span>
            </div>
          </>
        )}
      </div>

      {/* Profit indicator */}
      {hasAnalytics && profitAmount > 0 && (
        <div className={styles.profitBanner}>
          <span className={styles.profitAmount}>+{formatCurrency(profitAmount)}</span>
          <span className={styles.profitPercent}>({formatPercent(profitPercent)} profit)</span>
        </div>
      )}

      {/* Analytics grid */}
      {hasAnalytics && (
        <div className={styles.analytics}>
          <div className={styles.analyticsItem}>
            <BarChart3 size={14} className={styles.analyticsIcon} />
            <span className={styles.analyticsLabel}>Confidence</span>
            <ConfidenceBadge confidence={deal.tmv.confidence} />
          </div>
          <div className={styles.analyticsItem}>
            <Shield size={14} className={styles.analyticsIcon} />
            <span className={styles.analyticsLabel}>Risk</span>
            <RiskBadge riskScore={deal.score.riskScore} />
          </div>
          <div className={styles.analyticsItem}>
            <Clock size={14} className={styles.analyticsIcon} />
            <span className={styles.analyticsLabel}>Est. Sell</span>
            <span className={styles.analyticsValue}>
              {deal.tmv.estimatedDaysToSell}d
            </span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <span className={styles.location}>{deal.location}</span>
        <div className={styles.actions}>
          <Link to={`/deals/${deal.id}`} className={styles.actionLink}>
            View Details
          </Link>
          <a
            href={deal.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.externalLink}
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Composite rank score indicator */}
      {hasAnalytics && (
        <div className={styles.scoreBar}>
          <div
            className={styles.scoreBarFill}
            style={{
              width: `${Math.max(10, Math.min(100, deal.score.compositeRank))}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}

// Grid container for deal cards
interface DealGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
}

export function DealGrid({ children, columns = 2 }: DealGridProps) {
  return (
    <div className={`${styles.grid} ${styles[`columns-${columns}`]}`}>
      {children}
    </div>
  );
}
