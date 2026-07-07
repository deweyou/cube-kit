import { formatElapsed, formatElapsedClock } from '@cubegin/shared/timer';
import styles from './elapsed-display.module.css';

type ElapsedDisplayVariant = 'clock' | 'seconds';

interface ElapsedDisplayProps {
  ms: number;
  decimals?: 0 | 1 | 2 | 3;
  dimmed?: boolean;
  compact?: boolean;
  variant?: ElapsedDisplayVariant;
}

export const ElapsedDisplay = ({
  ms,
  decimals = 2,
  dimmed = false,
  compact = false,
  variant = 'seconds',
}: ElapsedDisplayProps) => (
  <span
    className={`${styles.root} ${dimmed ? styles.dimmed : ''} ${compact ? styles.compact : ''}`}
  >
    {variant === 'clock' ? formatElapsedClock(ms, decimals) : formatElapsed(ms, decimals)}
  </span>
);
