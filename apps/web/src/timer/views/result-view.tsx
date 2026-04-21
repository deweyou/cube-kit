import { useState } from 'react'
import { ElapsedDisplay } from '../components/elapsed-display'
import { ResultActions } from '../components/result-actions'
import type { Penalty } from '../components/result-actions'

interface ResultViewProps {
  elapsed: number
  scramble: string
  onContinue: () => void
  onDiscard: () => void
}

export const ResultView = ({ elapsed, scramble, onContinue, onDiscard }: ResultViewProps) => {
  const [penalty, setPenalty] = useState<Penalty>('none')

  const displayMs = penalty === '+2' ? elapsed + 2000 : elapsed
  const displayDecimals = penalty === 'dnf' ? 0 : 3

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
        cursor: 'pointer',
      }}
      onClick={onContinue}
    >
      {/* Final time */}
      <div style={{ textAlign: 'center' }}>
        {penalty === 'dnf' ? (
          <span
            style={{
              fontFamily: 'var(--ui-font-mono)',
              fontSize: 'clamp(3rem, 12vw, 6rem)',
              fontWeight: 300,
              color: 'var(--ui-color-text-muted)',
            }}
          >
            DNF
          </span>
        ) : (
          <ElapsedDisplay ms={displayMs} decimals={displayDecimals} />
        )}
      </div>

      {/* Actions — stop click propagation so they don't trigger onContinue */}
      <div onClick={e => e.stopPropagation()}>
        <ResultActions penalty={penalty} onPenalty={setPenalty} onDiscard={onDiscard} />
      </div>

      {/* Scramble review (collapsible) */}
      <details
        style={{ width: '100%', maxWidth: 420 }}
        onClick={e => e.stopPropagation()}
      >
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
        点击继续
      </p>
    </div>
  )
}
