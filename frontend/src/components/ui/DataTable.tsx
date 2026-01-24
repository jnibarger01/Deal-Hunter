import { ReactNode, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import styles from './DataTable.module.css';

type SortDirection = 'asc' | 'desc' | null;

interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onSort?: (key: string, direction: SortDirection) => void;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  onSort,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (key: string) => {
    let newDirection: SortDirection;
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        newDirection = 'desc';
      } else if (sortDirection === 'desc') {
        newDirection = null;
      } else {
        newDirection = 'asc';
      }
    } else {
      newDirection = 'asc';
    }

    setSortKey(newDirection ? key : null);
    setSortDirection(newDirection);
    onSort?.(key, newDirection);
  };

  const getSortIcon = (key: string) => {
    if (sortKey !== key) {
      return <ChevronsUpDown size={14} className={styles.sortIconInactive} />;
    }
    if (sortDirection === 'asc') {
      return <ChevronUp size={14} className={styles.sortIconActive} />;
    }
    return <ChevronDown size={14} className={styles.sortIconActive} />;
  };

  if (loading) {
    return (
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${styles.th} ${styles[`align-${col.align || 'left'}`]}`}
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={styles.tbody}>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className={styles.tr}>
                {columns.map((col) => (
                  <td key={col.key} className={styles.td}>
                    <div className={styles.skeleton} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyMessage}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`${styles.th} ${styles[`align-${col.align || 'left'}`]} ${
                  col.sortable ? styles.sortable : ''
                }`}
                style={{ width: col.width }}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <span className={styles.headerContent}>
                  {col.header}
                  {col.sortable && getSortIcon(col.key)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={styles.tbody}>
          {data.map((item, index) => (
            <tr
              key={keyExtractor(item)}
              className={`${styles.tr} ${onRowClick ? styles.clickable : ''}`}
              onClick={() => onRowClick?.(item)}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`${styles.td} ${styles[`align-${col.align || 'left'}`]}`}
                >
                  {col.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Helper components for table cells
interface CellTextProps {
  primary: string;
  secondary?: string;
}

export function CellText({ primary, secondary }: CellTextProps) {
  return (
    <div className={styles.cellText}>
      <span className={styles.cellPrimary}>{primary}</span>
      {secondary && <span className={styles.cellSecondary}>{secondary}</span>}
    </div>
  );
}

interface CellCurrencyProps {
  value: number;
  highlight?: boolean;
}

export function CellCurrency({ value, highlight = false }: CellCurrencyProps) {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

  return (
    <span className={`${styles.cellCurrency} ${highlight ? styles.highlight : ''}`}>
      {formatted}
    </span>
  );
}

interface CellPercentProps {
  value: number;
  showSign?: boolean;
}

export function CellPercent({ value, showSign = true }: CellPercentProps) {
  const formatted = `${showSign && value > 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
  const variant = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';

  return <span className={`${styles.cellPercent} ${styles[variant]}`}>{formatted}</span>;
}
