import type { ReactNode } from 'react';
import { isMobileWebDevice } from '../platform/web-device';
import styles from './app-shell.module.css';

interface AppShellProps {
  children: ReactNode;
}

export const AppShell = ({ children }: AppShellProps) => (
  <div className={styles.root} data-mobile-device={isMobileWebDevice() ? 'true' : undefined}>
    <main className={styles.main}>{children}</main>
  </div>
);
