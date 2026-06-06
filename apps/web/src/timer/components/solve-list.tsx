import {
  getReverseSequenceNumber,
  getSolveDisplayText,
  getWcaEventLabel,
  type SolveRecord,
} from '@cubegin/timer-session';

interface SolveListProps {
  solves: SolveRecord[];
  onSelectSolve: (solve: SolveRecord) => void;
}

export const SolveList = ({ solves, onSelectSolve }: SolveListProps) => {
  if (solves.length === 0) {
    return (
      <p style={{ color: 'var(--ui-color-text-muted)', fontSize: '0.875rem', margin: 0 }}>
        暂无成绩
      </p>
    );
  }

  return (
    <ol
      style={{
        display: 'grid',
        gap: 6,
        listStyle: 'none',
        margin: 0,
        padding: 0,
        width: '100%',
      }}
    >
      {solves.map((solve, index) => (
        <li key={solve.id}>
          <button
            type="button"
            onClick={() => onSelectSolve(solve)}
            style={{
              display: 'grid',
              gridTemplateColumns: '44px minmax(72px, 1fr) auto',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              minHeight: 42,
              border: '1px solid var(--ui-color-border)',
              borderRadius: 8,
              background: 'var(--ui-color-surface)',
              color: 'var(--ui-color-text)',
              cursor: 'pointer',
              padding: '6px 8px',
              textAlign: 'left',
            }}
          >
            <span style={{ color: 'var(--ui-color-text-muted)', fontSize: '0.75rem' }}>
              #{getReverseSequenceNumber(solves.length, index)}
            </span>
            <span style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
              {getSolveDisplayText(solve.elapsedMs, solve.penalty)}
            </span>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--ui-color-text-muted)',
                fontSize: '0.75rem',
              }}
            >
              {solve.penalty !== 'none' && <span>{solve.penalty === 'dnf' ? 'DNF' : '+2'}</span>}
              <span>{getWcaEventLabel(solve.eventId)}</span>
            </span>
            <span
              style={{
                gridColumn: '2 / 4',
                color: 'var(--ui-color-text-muted)',
                fontSize: '0.7rem',
              }}
            >
              {new Date(solve.createdAt).toLocaleString()}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
};
