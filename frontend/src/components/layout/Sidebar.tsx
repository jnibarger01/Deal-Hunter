import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Tags,
  Calculator,
  Settings,
  Activity,
} from 'lucide-react';
import { useHealth } from '../../hooks/useDeals';
import styles from './Sidebar.module.css';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} />, end: true },
  { path: '/deals', label: 'All Deals', icon: <Tags size={20} /> },
  { path: '/calculator', label: 'TMV Calculator', icon: <Calculator size={20} /> },
];

export function Sidebar() {
  const location = useLocation();
  const { data: health, loading: healthLoading, error: healthError } = useHealth();

  const healthState: 'online' | 'offline' | 'loading' =
    healthLoading && !health ? 'loading' : healthError || !health ? 'offline' : 'online';

  const dotClass =
    healthState === 'online'
      ? styles.statusDot
      : healthState === 'offline'
      ? `${styles.statusDot} ${styles.statusDotError}`
      : `${styles.statusDot} ${styles.statusDotLoading}`;

  const valueClass =
    healthState === 'online'
      ? styles.statusValue
      : healthState === 'offline'
      ? `${styles.statusValue} ${styles.statusValueError}`
      : `${styles.statusValue} ${styles.statusValueLoading}`;

  const valueText =
    healthState === 'online' ? 'Online' : healthState === 'offline' ? 'Offline' : 'Checking…';

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <Activity size={24} />
        </div>
        <div className={styles.logoText}>
          <span className={styles.logoTitle}>Deal Hunter</span>
          <span className={styles.logoSubtitle}>TMV Engine v1</span>
        </div>
      </div>

      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {navItems.map((item, index) => (
            <li
              key={item.path}
              className={styles.navItem}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <NavLink
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                }
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
                {location.pathname === item.path && <span className={styles.activeIndicator} />}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.statusSection}>
        <div className={styles.statusCard}>
          <div className={styles.statusHeader}>
            <span className={dotClass} />
            <span className={styles.statusLabel}>System Status</span>
          </div>
          <span className={valueClass}>{valueText}</span>
        </div>
      </div>

      <div className={styles.footer}>
        <NavLink to="/settings" className={styles.footerLink}>
          <Settings size={18} />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}
