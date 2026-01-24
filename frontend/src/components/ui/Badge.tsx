import { ReactNode } from 'react';
import styles from './Badge.module.css';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: ReactNode;
  glow?: boolean;
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon,
  glow = false,
  className = '',
}: BadgeProps) {
  const classes = [
    styles.badge,
    styles[`variant-${variant}`],
    styles[`size-${size}`],
    glow && styles.glow,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.text}>{children}</span>
    </span>
  );
}

// Convenience components for common use cases
interface ConfidenceBadgeProps {
  confidence: number;
  showValue?: boolean;
}

export function ConfidenceBadge({ confidence, showValue = true }: ConfidenceBadgeProps) {
  let variant: BadgeVariant;
  let label: string;

  if (confidence < 0.4) {
    variant = 'danger';
    label = 'Insufficient';
  } else if (confidence < 0.6) {
    variant = 'warning';
    label = 'Low';
  } else if (confidence < 0.8) {
    variant = 'info';
    label = 'Medium';
  } else {
    variant = 'success';
    label = 'High';
  }

  return (
    <Badge variant={variant} size="sm">
      {showValue ? `${(confidence * 100).toFixed(0)}%` : label}
    </Badge>
  );
}

interface RiskBadgeProps {
  riskScore: number;
}

export function RiskBadge({ riskScore }: RiskBadgeProps) {
  let variant: BadgeVariant;
  let label: string;

  if (riskScore <= 0.3) {
    variant = 'success';
    label = 'Low Risk';
  } else if (riskScore <= 0.6) {
    variant = 'warning';
    label = 'Med Risk';
  } else {
    variant = 'danger';
    label = 'High Risk';
  }

  return (
    <Badge variant={variant} size="sm">
      {label}
    </Badge>
  );
}

interface ConditionBadgeProps {
  condition: string;
}

export function ConditionBadge({ condition }: ConditionBadgeProps) {
  const normalized = condition.toLowerCase();
  let variant: BadgeVariant = 'default';

  if (normalized.includes('new') || normalized.includes('sealed')) {
    variant = 'success';
  } else if (normalized.includes('like new') || normalized.includes('excellent')) {
    variant = 'info';
  } else if (normalized.includes('good') || normalized.includes('very good')) {
    variant = 'accent';
  } else if (normalized.includes('fair') || normalized.includes('acceptable')) {
    variant = 'warning';
  } else if (normalized.includes('poor') || normalized.includes('parts')) {
    variant = 'danger';
  }

  return (
    <Badge variant={variant} size="sm">
      {condition}
    </Badge>
  );
}
