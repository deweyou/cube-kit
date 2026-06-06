import { useState, useEffect } from 'react';
import styles from './sidebar.module.css';

const STORAGE_KEY = 'cubegin-sidebar-expanded';

const NAV_ITEMS = [
  { id: 'timer', label: '计时', icon: '⏱' },
  { id: 'history', label: '历史', icon: '📋' },
  { id: 'settings', label: '设置', icon: '⚙' },
] as const;

export const Sidebar = () => {
  const [expanded, setExpanded] = useState(() => localStorage.getItem(STORAGE_KEY) !== 'false');
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(expanded));
  }, [expanded]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`${styles.sidebar} ${expanded ? styles.expanded : styles.collapsed}`}
        aria-label="主导航"
      >
        {expanded && <span className={styles.logo}>Cubegin</span>}
        <button
          className={styles.toggleBtn}
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? '收起侧边栏' : '展开侧边栏'}
        >
          {expanded ? '⊟' : '⊞'}
        </button>
        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`${styles.navItem} ${item.id === 'timer' ? styles.active : ''}`}
              disabled={item.id !== 'timer'}
              aria-current={item.id === 'timer' ? 'page' : undefined}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {expanded && <span className={styles.navLabel}>{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile: fixed toggle button */}
      <button
        className={styles.mobileToggle}
        onClick={() => setDrawerOpen(true)}
        aria-label="打开侧边栏"
      >
        ⊞
      </button>

      {/* Mobile: drawer overlay */}
      {drawerOpen && (
        <div className={styles.drawerOverlay}>
          <aside className={styles.drawer} aria-label="主导航">
            <div className={styles.drawerHeader}>
              <span className={styles.drawerLogo}>Cubegin</span>
              <button
                className={styles.drawerCloseBtn}
                onClick={() => setDrawerOpen(false)}
                aria-label="关闭侧边栏"
              >
                ✕
              </button>
            </div>
            <nav>
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  className={`${styles.drawerNavItem} ${item.id === 'timer' ? styles.active : ''}`}
                  disabled={item.id !== 'timer'}
                  onClick={() => setDrawerOpen(false)}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>
          <div
            className={styles.drawerOverlayBackdrop}
            onClick={() => setDrawerOpen(false)}
            aria-hidden={true}
          />
        </div>
      )}
    </>
  );
};
