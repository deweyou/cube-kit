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
  onEventChange: (id: WcaEventId) => void;
  onRefresh: () => void;
}

export const ScrambleView = ({
  eventId,
  scramble,
  error,
  isLoading = false,
  isReady = false,
  onEventChange,
  onRefresh,
}: ScrambleViewProps) => {
  const svg = scramble.length > 0 ? renderScrambleImage(eventId, scramble) : '';
  const scrambleText = error ?? (isLoading ? '生成打乱中...' : scramble);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '24px 20px',
        gap: 20,
      }}
    >
      <EventSelector value={eventId} onChange={onEventChange} />
      <ScrambleText scramble={scrambleText} isLoading={isLoading} onRefresh={onRefresh} />
      <ScrambleImage svg={svg} />
      <p
        style={{
          fontSize: '0.8rem',
          margin: 0,
          marginTop: 12,
          color: isReady ? 'var(--ui-color-success-text, #4ade80)' : 'var(--ui-color-text-muted)',
          opacity: isReady ? 1 : 0.4,
          transition: 'color 100ms ease, opacity 100ms ease',
        }}
      >
        {isReady ? '松开开始' : '长按开始'}
      </p>
    </div>
  );
};
