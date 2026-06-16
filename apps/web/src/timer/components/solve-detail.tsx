import { useMemo } from 'react';
import { Button } from '@deweyou-design/react/button';
import { renderScrambleImage } from '@cubegin/scramble-image';
import {
  getSolveDisplayText,
  getSolveScrambles,
  getWcaEventLabel,
  type SolvePenalty,
  type SolveRecord,
} from '@cubegin/shared/timer-session';
import { ScrambleImage } from './scramble-image';
import { CancelIcon } from './timer-icons';
import type { TimerLocale, TimerMessages } from '../timer-i18n';
import styles from './solve-detail.module.css';

interface SolveDetailProps {
  locale: TimerLocale;
  messages: TimerMessages;
  solve: SolveRecord;
  onClose: () => void;
  onDelete: (solveId: string) => void;
  onPenaltyChange: (solveId: string, penalty: SolvePenalty) => void;
}

export const SolveDetail = ({
  locale,
  messages,
  solve,
  onClose,
  onDelete,
  onPenaltyChange,
}: SolveDetailProps) => {
  const scrambleItems = useMemo(() => {
    const solveScrambles = getSolveScrambles(solve);
    return solveScrambles.map((scramble, index) => {
      try {
        return {
          error: undefined,
          index,
          scramble,
          svg: renderScrambleImage(solve.eventId, scramble),
        };
      } catch (cause) {
        return {
          error: cause instanceof Error ? cause.message : String(cause),
          index,
          scramble,
          svg: '',
        };
      }
    });
  }, [solve]);

  const handlePenaltyChange = (penalty: SolvePenalty) => {
    onPenaltyChange(solve.id, penalty);
    onClose();
  };

  const handleDelete = () => {
    onDelete(solve.id);
    onClose();
  };

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={messages.solveDetail}
    >
      <section className={styles.panel}>
        <header className={styles.header}>
          <div>
            <strong className={styles.time}>
              {getSolveDisplayText(solve.elapsedMs, solve.penalty)}
            </strong>
            <span className={styles.meta}>
              {getWcaEventLabel(solve.eventId, locale)} ·{' '}
              {new Date(solve.createdAt).toLocaleString()}
            </span>
            {solve.multiBlind && (
              <span className={styles.multiBlindMeta}>
                {solve.multiBlind.solvedCount} / {solve.multiBlind.attemptedCount}
              </span>
            )}
          </div>
          <button
            className={styles.closeButton}
            type="button"
            onClick={onClose}
            aria-label={messages.close}
          >
            <CancelIcon size={18} />
          </button>
        </header>

        <div className={styles.content}>
          <ol className={styles.scrambleList}>
            {scrambleItems.map((item) => (
              <li className={styles.scrambleItem} key={`${item.index}:${item.scramble}`}>
                {scrambleItems.length > 1 && (
                  <span className={styles.scrambleIndex}>{item.index + 1}</span>
                )}
                {item.error ? (
                  <p className={styles.imageError}>{messages.imageRenderFailed(item.error)}</p>
                ) : (
                  <ScrambleImage eventId={solve.eventId} svg={item.svg} />
                )}
                <p className={styles.scrambleText}>{item.scramble}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className={styles.actions}>
          <Button
            variant="outlined"
            color="neutral"
            size="sm"
            onClick={() => handlePenaltyChange('none')}
          >
            {messages.noPenalty}
          </Button>
          <Button
            variant="outlined"
            color="neutral"
            size="sm"
            onClick={() => handlePenaltyChange('+2')}
          >
            +2
          </Button>
          <Button
            variant="outlined"
            color="danger"
            size="sm"
            onClick={() => handlePenaltyChange('dnf')}
          >
            DNF
          </Button>
          <Button variant="outlined" color="danger" size="sm" onClick={handleDelete}>
            {messages.deleteSolve}
          </Button>
        </div>
      </section>
    </div>
  );
};
