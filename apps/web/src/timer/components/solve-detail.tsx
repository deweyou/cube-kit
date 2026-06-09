import { useMemo } from 'react';
import { Button } from '@deweyou-design/react/button';
import { renderScrambleImage } from '@cubegin/scramble-image';
import {
  getSolveDisplayText,
  getWcaEventLabel,
  type SolvePenalty,
  type SolveRecord,
} from '@cubegin/shared/timer-session';
import { ScrambleImage } from './scramble-image';
import type { TimerLocale, TimerMessages } from '../timer-i18n';

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
  const imageResult = useMemo(() => {
    try {
      return { svg: renderScrambleImage(solve.eventId, solve.scramble), error: undefined };
    } catch (cause) {
      return {
        svg: '',
        error: cause instanceof Error ? cause.message : String(cause),
      };
    }
  }, [solve.eventId, solve.scramble]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={messages.solveDetail}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'grid',
        placeItems: 'center',
        background: 'color-mix(in srgb, black 45%, transparent)',
        padding: 16,
      }}
    >
      <section
        style={{
          display: 'grid',
          gap: 14,
          width: 'min(560px, 100%)',
          maxHeight: 'calc(100vh - 32px)',
          overflow: 'auto',
          border: '1px solid var(--ui-color-border)',
          borderRadius: 8,
          background: 'var(--ui-color-surface-raised, var(--ui-color-surface))',
          boxShadow: '0 24px 72px color-mix(in srgb, black 22%, transparent)',
          color: 'var(--ui-color-text)',
          padding: 18,
        }}
      >
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <strong
              style={{
                display: 'block',
                fontFamily: 'Helvetica, Arial, sans-serif',
                fontSize: '2rem',
                fontWeight: 300,
              }}
            >
              {getSolveDisplayText(solve.elapsedMs, solve.penalty)}
            </strong>
            <span style={{ color: 'var(--ui-color-text-muted)', fontSize: '0.8rem' }}>
              {getWcaEventLabel(solve.eventId, locale)} ·{' '}
              {new Date(solve.createdAt).toLocaleString()}
            </span>
          </div>
          <Button variant="link" color="neutral" size="sm" onClick={onClose}>
            {messages.close}
          </Button>
        </header>

        {imageResult.error ? (
          <p style={{ color: 'var(--ui-color-text-muted)', margin: 0 }}>
            {messages.imageRenderFailed(imageResult.error)}
          </p>
        ) : (
          <ScrambleImage svg={imageResult.svg} />
        )}

        <p
          style={{
            margin: 0,
            color: 'var(--ui-color-text-muted)',
            fontFamily: 'var(--ui-font-mono)',
            fontSize: '0.85rem',
            lineHeight: 1.7,
            wordBreak: 'break-word',
          }}
        >
          {solve.scramble}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Button
            variant="outlined"
            color="neutral"
            size="sm"
            onClick={() => onPenaltyChange(solve.id, 'none')}
          >
            {messages.noPenalty}
          </Button>
          <Button
            variant="outlined"
            color="neutral"
            size="sm"
            onClick={() => onPenaltyChange(solve.id, '+2')}
          >
            +2
          </Button>
          <Button
            variant="outlined"
            color="danger"
            size="sm"
            onClick={() => onPenaltyChange(solve.id, 'dnf')}
          >
            DNF
          </Button>
          <Button variant="outlined" color="danger" size="sm" onClick={() => onDelete(solve.id)}>
            {messages.deleteSolve}
          </Button>
        </div>
      </section>
    </div>
  );
};
