import type { ReactNode } from 'react';
import styles from './app-shell.module.css';

interface AppShellProps {
  children: ReactNode;
}

export const AppShell = ({ children }: AppShellProps) => (
  <div className={styles.root}>
    <main className={styles.main}>{children}</main>
  </div>
);
