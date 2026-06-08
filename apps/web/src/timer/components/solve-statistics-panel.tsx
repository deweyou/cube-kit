import {
  calculateSolveStatistics,
  formatMilliseconds,
  type RollingAverageStat,
  type SolveRecord,
} from '@cubegin/shared/timer-session';
import type { TimerMessages } from '../timer-i18n';
import styles from './solve-statistics-panel.module.css';

interface SolveStatisticsPanelProps {
  messages: TimerMessages;
  solves: SolveRecord[];
}

const formatStat = (ms: number | null): string => (ms === null ? 'DNF' : formatMilliseconds(ms));

const RollingAverageRow = ({
  average,
  messages,
}: {
  average: RollingAverageStat;
  messages: TimerMessages;
}) => (
  <div className={styles.dualRow}>
    <span className={styles.label}>{messages.statisticsRollingAverage(average.size)}</span>
    <span className={styles.pairValue}>
      <span className={styles.bestValue}>{formatStat(average.bestMs)}</span>
      <span className={styles.slash}>/</span>
      <span className={styles.currentValue}>{formatStat(average.currentMs)}</span>
    </span>
  </div>
);

export const SolveStatisticsPanel = ({ messages, solves }: SolveStatisticsPanelProps) => {
  const statistics = calculateSolveStatistics(solves);

  return (
    <section className={styles.root} aria-label={messages.stats}>
      <div className={styles.singleRow}>
        <span className={styles.label}>{messages.statisticsValidCount}</span>
        <span className={styles.value}>
          {statistics.validCount}/{statistics.totalCount}
        </span>
      </div>
      {statistics.totalCount > 0 && (
        <>
          <div className={styles.singleRow}>
            <span className={styles.label}>{messages.statisticsAverage}</span>
            <span className={styles.value}>{formatStat(statistics.averageMs)}</span>
          </div>
          {statistics.bestMs !== null && (
            <div className={styles.singleRow}>
              <span className={styles.label}>{messages.statisticsBest}</span>
              <span className={styles.bestValue}>{formatMilliseconds(statistics.bestMs)}</span>
            </div>
          )}
        </>
      )}
      {statistics.rollingAverages.length > 0 && (
        <div className={styles.rollingRows}>
          {statistics.rollingAverages.map((average) => (
            <RollingAverageRow key={average.size} average={average} messages={messages} />
          ))}
        </div>
      )}
    </section>
  );
};
