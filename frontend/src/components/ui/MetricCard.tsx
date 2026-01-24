import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import styles from './MetricCard.module.css';

type MetricTrend = 'up' | 'down' | 'neutral';
type MetricVariant = 'default' | 'profit' | 'warning' | 'danger' | 'accent';

interface MetricCardProps {
  label: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
  trend?: MetricTrend;
  trendValue?: string;
  variant?: MetricVariant;
  icon?: ReactNode;
  subtitle?: string;
  loading?: boolean;
}

export function MetricCard({
  label,
  value,
  prefix,
  suffix,
  trend,
  trendValue,
  variant = 'default',
  icon,
  subtitle,
  loading = false,
}: MetricCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp size={14} />;
      case 'down':
        return <TrendingDown size={14} />;
      default:
        return <Minus size={14} />;
    }
  };

  if (loading) {
    return (
      <div className={`${styles.card} ${styles.loading}`}>
        <div className={styles.skeletonLabel} />
        <div className={styles.skeletonValue} />
      </div>
    );
  }

  return (
    <div className={`${styles.card} ${styles[`variant-${variant}`]}`}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        {icon && <span className={styles.icon}>{icon}</span>}
      </div>

      <div className={styles.valueContainer}>
        <span className={styles.value}>
          {prefix && <span className={styles.prefix}>{prefix}</span>}
          {value}
          {suffix && <span className={styles.suffix}>{suffix}</span>}
        </span>
      </div>

      {(trend || subtitle) && (
        <div className={styles.footer}>
          {trend && (
            <span className={`${styles.trend} ${styles[`trend-${trend}`]}`}>
              {getTrendIcon()}
              {trendValue && <span>{trendValue}</span>}
            </span>
          )}
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        </div>
      )}

      {/* Decorative glow for profit variant */}
      {variant === 'profit' && <div className={styles.glow} />}
    </div>
  );
}

// Grid container for multiple metric cards
interface MetricGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 5;
}

export function MetricGrid({ children, columns = 4 }: MetricGridProps) {
  return (
    <div className={`${styles.grid} ${styles[`columns-${columns}`]}`}>
      {children}
    </div>
  );
}
