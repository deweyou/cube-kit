import { Button } from '@deweyou-design/react/button';

export type Penalty = 'none' | '+2' | 'dnf';

interface ResultActionsProps {
  penalty: Penalty;
  onPenalty: (p: Penalty) => void;
  onDiscard: () => void;
}

export const ResultActions = ({ penalty, onPenalty, onDiscard }: ResultActionsProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
    <div style={{ display: 'flex', gap: 8 }}>
      <Button
        variant="outlined"
        color="neutral"
        size="sm"
        onClick={() => onPenalty(penalty === '+2' ? 'none' : '+2')}
        aria-pressed={penalty === '+2'}
        style={
          penalty === '+2'
            ? { background: 'color-mix(in srgb, var(--ui-color-text) 10%, transparent)' }
            : undefined
        }
      >
        +2
      </Button>
      <Button
        variant="outlined"
        color="danger"
        size="sm"
        onClick={() => onPenalty(penalty === 'dnf' ? 'none' : 'dnf')}
        aria-pressed={penalty === 'dnf'}
      >
        DNF
      </Button>
    </div>
    <Button variant="link" color="neutral" size="sm" onClick={onDiscard}>
      不记录
    </Button>
  </div>
);
