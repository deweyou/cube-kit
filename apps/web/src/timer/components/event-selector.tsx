import { WCA_EVENT_IDS, type WcaEventId } from '@cubegin/scramble-puzzle';
import { Select } from '@deweyou-design/react/select';
import { getWcaEventLabel, type TimerLocale } from '@cubegin/timer-session';
import styles from './event-selector.module.css';

interface EventSelectorProps {
  className?: string;
  label: string;
  locale: TimerLocale;
  value: WcaEventId;
  onChange: (id: WcaEventId) => void;
}

export const EventSelector = ({ className, label, locale, value, onChange }: EventSelectorProps) => {
  return (
    <Select.Root
      className={className ? `${styles.root} ${className}` : styles.root}
      label={<span className={styles.visuallyHidden}>{label}</span>}
      value={[value]}
      onValueChange={(nextValue) => {
        const nextEventId = nextValue[0];
        if (nextEventId) onChange(nextEventId as WcaEventId);
      }}
    >
      <Select.Trigger />
      <Select.Content className={styles.content}>
        {WCA_EVENT_IDS.map((eventId) => (
          <Select.Item
            key={eventId}
            className={styles.item}
            value={eventId}
            label={getWcaEventLabel(eventId, locale)}
          />
        ))}
      </Select.Content>
    </Select.Root>
  );
};
