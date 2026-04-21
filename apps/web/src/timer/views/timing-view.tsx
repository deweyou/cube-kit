import { ElapsedDisplay } from '../components/elapsed-display';

interface TimingViewProps {
  elapsed: number;
  isInCancelZone: boolean;
}

export const TimingView = ({ elapsed, isInCancelZone }: TimingViewProps) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'relative',
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }}
  >
    {/* Cancel zone — top strip */}
    <div
      style={{
        padding: '14px 0',
        textAlign: 'center',
        borderBottom: isInCancelZone
          ? '1px solid color-mix(in srgb, var(--ui-color-danger-bg) 40%, transparent)'
          : '1px solid transparent',
        background: isInCancelZone
          ? 'color-mix(in srgb, var(--ui-color-danger-bg) 6%, transparent)'
          : 'transparent',
        transition: 'background 140ms ease, border-color 140ms ease',
      }}
    >
      <span
        style={{
          fontSize: '0.75rem',
          color: isInCancelZone
            ? 'var(--ui-color-danger-bg)'
            : 'color-mix(in srgb, var(--ui-color-text-muted) 30%, transparent)',
          transition: 'color 140ms ease',
        }}
      >
        {isInCancelZone ? '✕ 松手取消' : '↑ 上滑取消'}
      </span>
    </div>

    {/* Timer display — center */}
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ElapsedDisplay ms={elapsed} decimals={2} dimmed={isInCancelZone} />
    </div>
  </div>
);
