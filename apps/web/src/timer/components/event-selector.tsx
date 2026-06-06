import { WCA_EVENT_IDS, type WcaEventId } from '@cubegin/scramble-puzzle';
import { WCA_EVENT_LABELS } from '@cubegin/timer-session';

// Short display labels
const DISPLAY_LABELS = WCA_EVENT_LABELS;

interface EventSelectorProps {
  value: WcaEventId;
  onChange: (id: WcaEventId) => void;
}

export const EventSelector = ({ value, onChange }: EventSelectorProps) => {
  return (
    <select
      aria-label="魔方类型"
      value={value}
      onChange={(e) => onChange(e.target.value as WcaEventId)}
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
      {WCA_EVENT_IDS.map((eventId) => (
        <option key={eventId} value={eventId}>
          {DISPLAY_LABELS[eventId]}
        </option>
      ))}
    </select>
  );
};
