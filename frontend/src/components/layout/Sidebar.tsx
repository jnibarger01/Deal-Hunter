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
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { path: '/deals', label: 'All Deals', icon: <Tags size={20} /> },
  { path: '/ranked', label: 'Top Ranked', icon: <TrendingUp size={20} /> },
  { path: '/calculator', label: 'TMV Calculator', icon: <Calculator size={20} /> },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <Activity size={24} />
        </div>
        <div className={styles.logoText}>
          <span className={styles.logoTitle}>Deal Hunter</span>
          <span className={styles.logoSubtitle}>TMV Engine v1</span>
        </div>
      </div>

      {/* Navigation */}
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
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                }
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
                {location.pathname === item.path && (
                  <span className={styles.activeIndicator} />
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Status indicator */}
      <div className={styles.statusSection}>
        <div className={styles.statusCard}>
          <div className={styles.statusHeader}>
            <span className={styles.statusDot} />
            <span className={styles.statusLabel}>System Status</span>
          </div>
          <span className={styles.statusValue}>Online</span>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <NavLink to="/settings" className={styles.footerLink}>
          <Settings size={18} />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}
