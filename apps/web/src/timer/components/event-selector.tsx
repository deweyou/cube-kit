import { getWcaEvents } from '@cubekit/scramble'
import type { WcaEventId } from '@cubekit/scramble'

// Short display labels
const DISPLAY_LABELS: Record<WcaEventId, string> = {
  '333': '3×3×3',
  '222': '2×2×2',
  '444': '4×4×4',
  '555': '5×5×5',
  '666': '6×6×6',
  '777': '7×7×7',
  '333bld': '3BLD',
  '333fm': 'FMC',
  '333oh': '单手',
  clock: 'Clock',
  minx: 'Megaminx',
  pyram: 'Pyraminx',
  skewb: 'Skewb',
  sq1: 'SQ-1',
  '444bld': '4BLD',
  '555bld': '5BLD',
  '333mbld': 'Multi',
}

interface EventSelectorProps {
  value: WcaEventId
  onChange: (id: WcaEventId) => void
}

export const EventSelector = ({ value, onChange }: EventSelectorProps) => {
  const events = getWcaEvents()
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as WcaEventId)}
      style={{
        background: 'var(--ui-color-surface)',
        border: '1px solid var(--ui-color-border)',
        borderRadius: 'var(--ui-radius-float)',
        color: 'var(--ui-color-text)',
        padding: '4px 8px',
        fontSize: '0.875rem',
        cursor: 'pointer',
      }}
    >
      {events.map(event => (
        <option key={event.id} value={event.id}>
          {DISPLAY_LABELS[event.id]}
        </option>
      ))}
    </select>
  )
}
