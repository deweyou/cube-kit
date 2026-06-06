import type { ReactNode } from 'react';
import { Button } from '@deweyou-design/react/button';
import { renderScrambleImage } from '@cubegin/scramble-image';
import type { WcaEventId } from '@cubegin/scramble-puzzle';
import { EventSelector } from '../components/event-selector';
import { ScrambleText } from '../components/scramble-text';
import { ScrambleImage } from '../components/scramble-image';

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
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 340px)',
        alignItems: 'stretch',
        justifyContent: 'center',
        height: '100%',
        padding: '24px 20px',
        gap: 24,
        overflow: 'auto',
      }}
    >
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 0,
          gap: 20,
        }}
      >
        <EventSelector value={eventId} onChange={onEventChange} />
        <ScrambleText scramble={scrambleText} isLoading={isLoading} onRefresh={onRefresh} />
        <ScrambleImage svg={svg} />
        <Button variant="filled" color="primary" size="md" onClick={onStart} disabled={!canStart}>
          开始
        </Button>
        <p
          style={{
            fontSize: '0.8rem',
            margin: 0,
            color: isReady ? 'var(--ui-color-success-text, #4ade80)' : 'var(--ui-color-text-muted)',
            opacity: isReady ? 1 : 0.55,
            transition: 'color 100ms ease, opacity 100ms ease',
          }}
        >
          {isReady ? '松开开始' : 'Enter 或点击开始'}
        </p>
      </section>
      {sessionPanel}
    </div>
  );
};
