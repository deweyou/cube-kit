import { formatElapsed } from '@cubegin/timer';
import styles from './elapsed-display.module.css';

interface ElapsedDisplayProps {
  ms: number;
  decimals?: 0 | 1 | 2 | 3;
  dimmed?: boolean;
  compact?: boolean;
}

export const ElapsedDisplay = ({
  ms,
  decimals = 2,
  dimmed = false,
  compact = false,
}: ElapsedDisplayProps) => (
  <span
    className={`${styles.root} ${dimmed ? styles.dimmed : ''} ${compact ? styles.compact : ''}`}
  >
    {formatElapsed(ms, decimals)}
  </span>
);
