import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Tags,
  TrendingUp,
  Calculator,
  Settings,
  Activity,
} from 'lucide-react';
import styles from './Sidebar.module.css';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
}

const navItems: NavItem[] = [
  { path: '/app', label: 'Dashboard', icon: <LayoutDashboard size={20} />, end: true },
  { path: '/app/deals', label: 'All Deals', icon: <Tags size={20} /> },
  { path: '/app/ranked', label: 'Top Ranked', icon: <TrendingUp size={20} /> },
  { path: '/app/calculator', label: 'TMV Calculator', icon: <Calculator size={20} /> },
];

export function Sidebar() {
  const location = useLocation();

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
            <span className={styles.statusDot} />
            <span className={styles.statusLabel}>System Status</span>
          </div>
          <span className={styles.statusValue}>Online</span>
        </div>
      </div>

      <div className={styles.footer}>
        <NavLink to="/app/settings" className={styles.footerLink}>
          <Settings size={18} />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}
