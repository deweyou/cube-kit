import type { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import styles from './app-shell.module.css';

interface AppShellProps {
  children: ReactNode;
}

export const AppShell = ({ children }: AppShellProps) => (
  <div className={styles.root}>
    <div className={styles.desktopSidebar}>
      <Sidebar />
    </div>
    <main className={styles.main}>{children}</main>
  </div>
);
