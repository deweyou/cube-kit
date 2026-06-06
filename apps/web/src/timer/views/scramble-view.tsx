import type { ReactNode } from 'react';
import { Button } from '@deweyou-design/react/button';
import { renderScrambleImage } from '@cubegin/scramble-image';
import type { WcaEventId } from '@cubegin/scramble-puzzle';
import { EventSelector } from '../components/event-selector';
import { ScrambleText } from '../components/scramble-text';
import { ScrambleImage } from '../components/scramble-image';
import styles from './scramble-view.module.css';

interface ScrambleViewProps {
  eventId: WcaEventId;
  scramble: string;
  error?: string;
  isLoading?: boolean;
  isReady?: boolean;
  sessionPanel?: ReactNode;
  onEventChange: (id: WcaEventId) => void;
  onRefresh: () => void;
  onStart: () => void;
}

export const ScrambleView = ({
  eventId,
  scramble,
  error,
  isLoading = false,
  isReady = false,
  sessionPanel,
  onEventChange,
  onRefresh,
  onStart,
}: ScrambleViewProps) => {
  const svg = scramble.length > 0 ? renderScrambleImage(eventId, scramble) : '';
  const scrambleText = error ?? (isLoading ? '生成打乱中...' : scramble);

  const canStart = !isLoading && !error && scramble.length > 0;

  return (
    <div className={styles.root}>
      <section className={styles.main}>
        <EventSelector value={eventId} onChange={onEventChange} />
        <ScrambleText scramble={scrambleText} isLoading={isLoading} onRefresh={onRefresh} />
        <ScrambleImage svg={svg} />
        <Button variant="filled" color="primary" size="md" onClick={onStart} disabled={!canStart}>
          开始
        </Button>
        <p className={`${styles.hint} ${isReady ? styles.hintReady : ''}`}>
          {isReady ? '松开开始' : 'Enter 或点击开始'}
        </p>
      </section>
      {sessionPanel}
    </div>
  );
};
