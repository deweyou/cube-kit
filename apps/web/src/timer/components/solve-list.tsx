import { useMemo, useState } from 'react';
import {
  getReverseSequenceNumber,
  getSolveDisplayText,
  type SolveRecord,
} from '@cubegin/shared/timer-session';
import styles from './solve-list.module.css';

const ROW_HEIGHT = 50;
const OVERSCAN = 6;

interface SolveListProps {
  emptyText: string;
  solves: SolveRecord[];
  onSelectSolve: (solve: SolveRecord) => void;
}

export const SolveList = ({ emptyText, solves, onSelectSolve }: SolveListProps) => {
  const [scrollTop, setScrollTop] = useState(0);

  const virtualRange = useMemo(() => {
    const firstVisibleIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const visibleCount = Math.ceil(720 / ROW_HEIGHT) + OVERSCAN * 2;
    const lastVisibleIndex = Math.min(solves.length, firstVisibleIndex + visibleCount);
    return {
      items: solves.slice(firstVisibleIndex, lastVisibleIndex),
      offsetTop: firstVisibleIndex * ROW_HEIGHT,
      startIndex: firstVisibleIndex,
      totalHeight: solves.length * ROW_HEIGHT,
    };
  }, [scrollTop, solves]);

  if (solves.length === 0) {
    return <p className={styles.empty}>{emptyText}</p>;
  }

  return (
    <div
      className={styles.viewport}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <ol className={styles.root} style={{ height: virtualRange.totalHeight }}>
        {virtualRange.items.map((solve, index) => {
          const solveIndex = virtualRange.startIndex + index;
          return (
            <li
              key={solve.id}
              className={styles.item}
              style={{ transform: `translateY(${virtualRange.offsetTop + index * ROW_HEIGHT}px)` }}
            >
              <button type="button" className={styles.row} onClick={() => onSelectSolve(solve)}>
                <span className={styles.sequence}>
                  #{getReverseSequenceNumber(solves.length, solveIndex)}
                </span>
                <span className={styles.time}>
                  {getSolveDisplayText(solve.elapsedMs, solve.penalty)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
