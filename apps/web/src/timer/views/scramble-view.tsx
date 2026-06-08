import { useMemo } from 'react';
import { Button } from '@deweyou-design/react/button';
import { Tooltip } from '@deweyou-design/react/tooltip';
import { renderScrambleImage } from '@cubegin/scramble-image';
import type { WcaEventId } from '@cubegin/shared/wca';
import { CancelIcon, RefreshTimerIcon } from '../components/timer-icons';
import { ScrambleText } from '../components/scramble-text';
import { ScrambleImage } from '../components/scramble-image';
import type { TimerMessages } from '../timer-i18n';
import styles from './scramble-view.module.css';

interface ScrambleViewProps {
  eventId: WcaEventId;
  scramble: string;
  error?: string;
  isLoading?: boolean;
  isReady?: boolean;
  messages: TimerMessages;
  onCancelReady: () => void;
  onRefresh: () => void;
}

export const ScrambleView = ({
  eventId,
  scramble,
  error,
  isLoading = false,
  isReady = false,
  messages,
  onCancelReady,
  onRefresh,
}: ScrambleViewProps) => {
  const svg = useMemo(
    () => (scramble.length > 0 ? renderScrambleImage(eventId, scramble) : ''),
    [eventId, scramble],
  );
  const scrambleText = error ?? (isLoading ? messages.scrambleLoading : scramble);

  const canStart = !isLoading && !error && scramble.length > 0;

  return (
    <section className={styles.root} aria-label={messages.timerPage}>
      <div
        className={`${styles.startSurface} ${isReady ? styles.startSurfaceReady : ''}`}
        aria-disabled={!canStart}
      >
        <div className={styles.scrambleRow}>
          <span className={styles.scrambleBlock}>
            <ScrambleText scramble={scrambleText} isLoading={isLoading} />
          </span>
        </div>
        <ScrambleImage svg={svg} />
        <div className={styles.actionStack}>
          <span className={`${styles.hint} ${isReady ? styles.hintReady : ''}`}>
            {isReady ? (
              <span className={styles.hintAction}>{messages.releaseToStart}</span>
            ) : canStart ? (
              <span className={styles.hintAction}>{messages.holdEnterToStart}</span>
            ) : (
              <span className={styles.hintAction}>{messages.waitingScramble}</span>
            )}
          </span>
          <Tooltip.Root placement="bottom">
            <Tooltip.Trigger>
              <Button.Icon
                variant="ghost"
                color="neutral"
                size="sm"
                className={styles.refreshButton}
                icon={isReady ? <CancelIcon /> : <RefreshTimerIcon />}
                onClick={isReady ? onCancelReady : onRefresh}
                disabled={isLoading}
                aria-label={isReady ? messages.cancelReady : messages.refreshScramble}
              />
            </Tooltip.Trigger>
            <Tooltip.Content>
              {isReady ? messages.cancelReady : messages.refreshScramble}
            </Tooltip.Content>
          </Tooltip.Root>
        </div>
      </div>
    </section>
  );
};
