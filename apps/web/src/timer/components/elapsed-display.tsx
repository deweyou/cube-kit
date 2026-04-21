import { formatElapsed } from '@cubekit/timer'

interface ElapsedDisplayProps {
  ms: number
  decimals?: 0 | 1 | 2 | 3
  dimmed?: boolean
}

export const ElapsedDisplay = ({ ms, decimals = 2, dimmed = false }: ElapsedDisplayProps) => (
  <span
    style={{
      fontFamily: 'var(--ui-font-mono)',
      fontSize: 'clamp(3rem, 12vw, 6rem)',
      fontWeight: 300,
      letterSpacing: '0.05em',
      fontVariantNumeric: 'tabular-nums',
      color: dimmed ? 'var(--ui-color-text-muted)' : 'var(--ui-color-text)',
      transition: 'color 140ms ease',
      lineHeight: 1,
    }}
  >
    {formatElapsed(ms, decimals)}
  </span>
)
