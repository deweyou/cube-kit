import { getImage } from '@cubekit/scramble'
import type { WcaEventId } from '@cubekit/scramble'
import { EventSelector } from '../components/event-selector'
import { ScrambleText } from '../components/scramble-text'
import { ScrambleImage } from '../components/scramble-image'

interface ScrambleViewProps {
  eventId: WcaEventId
  scramble: string
  onEventChange: (id: WcaEventId) => void
  onRefresh: () => void
}

export const ScrambleView = ({ eventId, scramble, onEventChange, onRefresh }: ScrambleViewProps) => {
  const svg = getImage(scramble, eventId)

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
      <ScrambleText scramble={scramble} onRefresh={onRefresh} />
      <ScrambleImage svg={svg} />
      <p
        style={{
          color: 'var(--ui-color-text-muted)',
          fontSize: '0.8rem',
          opacity: 0.4,
          margin: 0,
          marginTop: 12,
        }}
      >
        长按开始
      </p>
    </div>
  )
}
