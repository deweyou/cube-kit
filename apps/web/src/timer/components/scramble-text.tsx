import { Button } from '@deweyou-design/react/button'

interface ScrambleTextProps {
  scramble: string
  onRefresh: () => void
}

export const ScrambleText = ({ scramble, onRefresh }: ScrambleTextProps) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      width: '100%',
      maxWidth: 480,
    }}
  >
    <p
      style={{
        flex: 1,
        fontFamily: 'var(--ui-font-mono)',
        fontSize: '0.875rem',
        lineHeight: 2,
        color: 'var(--ui-color-text-muted)',
        textAlign: 'center',
        margin: 0,
        wordBreak: 'break-all',
      }}
    >
      {scramble}
    </p>
    <Button
      variant="ghost"
      size="sm"
      onClick={onRefresh}
      aria-label="换一个打乱"
      style={{ flexShrink: 0, marginTop: 2 }}
    >
      ↻
    </Button>
  </div>
)
