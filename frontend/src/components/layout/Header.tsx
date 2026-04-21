import { RefreshCw } from 'lucide-react';
import { useHealth } from '../../hooks/useDeals';
import styles from './Header.module.css';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function Header({ title, subtitle, onRefresh, refreshing }: HeaderProps) {
  const { data: health } = useHealth();

  return (
    <header className={styles.header}>
      <div className={styles.titleSection}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>

      <div className={styles.actions}>
        {onRefresh && (
          <button
            className={styles.iconButton}
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh data"
          >
            <RefreshCw
              size={18}
              className={refreshing ? styles.spinning : ''}
            />
          </button>
        )}

        <div className={styles.apiStatus}>
          <span
            className={`${styles.statusDot} ${
              health?.status === 'ok' ? styles.statusOnline : styles.statusOffline
            }`}
          />
          <span className={styles.statusText}>
            {health?.status === 'ok' ? 'API Connected' : 'Connecting...'}
          </span>
        </div>
      </div>
    </header>
  );
}
