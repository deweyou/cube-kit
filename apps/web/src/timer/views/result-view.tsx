import { ElapsedDisplay } from '../components/elapsed-display';
import { ResultActions } from '../components/result-actions';

interface ResultViewProps {
  elapsed: number;
  scramble: string;
  onContinue: () => void;
  onPlusTwo: () => void;
  onDnf: () => void;
  onDelete: () => void;
}

export const ResultView = ({
  elapsed,
  scramble,
  onContinue,
  onPlusTwo,
  onDnf,
  onDelete,
}: ResultViewProps) => {
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
      {/* Final time */}
      <div style={{ textAlign: 'center' }}>
        <ElapsedDisplay ms={elapsed} decimals={3} />
      </div>

      {/* Actions — stop click propagation so they don't trigger onContinue */}
      <ResultActions
        onContinue={onContinue}
        onPlusTwo={onPlusTwo}
        onDnf={onDnf}
        onDelete={onDelete}
      />

      {/* Scramble review (collapsible) */}
      <details style={{ width: '100%', maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <summary
          style={{
            fontSize: '0.75rem',
            color: 'var(--ui-color-text-muted)',
            cursor: 'pointer',
            listStyle: 'none',
            textAlign: 'center',
            opacity: 0.5,
          }}
        >
          查看打乱
        </summary>
        <p
          style={{
            fontFamily: 'var(--ui-font-mono)',
            fontSize: '0.8rem',
            lineHeight: 1.8,
            color: 'var(--ui-color-text-muted)',
            textAlign: 'center',
            marginTop: 8,
            wordBreak: 'break-all',
          }}
        >
          {scramble}
        </p>
      </details>

      {/* Continue hint */}
      <p
        style={{
          fontSize: '0.75rem',
          color: 'var(--ui-color-text-muted)',
          opacity: 0.3,
          margin: 0,
        }}
      >
        选择结果
      </p>
    </div>
  );
};
