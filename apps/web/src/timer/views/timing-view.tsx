import { ElapsedDisplay } from '../components/elapsed-display';
import styles from './timing-view.module.css';

interface TimingViewProps {
  elapsed: number;
  isInCancelZone: boolean;
}

export const TimingView = ({ elapsed, isInCancelZone }: TimingViewProps) => (
  <div className={styles.root}>
    <div
      className={`${styles.cancelStrip} ${isInCancelZone ? styles.cancelActive : ''}`}
      aria-hidden="true"
    />
    <div className={styles.display}>
      <ElapsedDisplay ms={elapsed} decimals={2} dimmed={isInCancelZone} />
    </div>
  </div>
);
