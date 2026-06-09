import { type CSSProperties } from 'react';
import { EVENT_ICON_SVGS } from '@cubegin/icons/events';
import { WCA_EVENT_IDS, type WcaEventId } from '@cubegin/shared/wca';
import { Select } from '@deweyou-design/react/select';
import { getWcaEventLabel, type TimerLocale } from '@cubegin/shared/timer-session';
import styles from './event-selector.module.css';

interface EventSelectorProps {
  className?: string;
  isIconOnly?: boolean;
  label: string;
  locale: TimerLocale;
  value: WcaEventId;
  onChange: (id: WcaEventId) => void;
}

type EventIconStyle = CSSProperties & {
  readonly '--event-icon-mask': string;
};

const createEventIconMask = (iconSvg: string): string => {
  return `url("data:image/svg+xml,${encodeURIComponent(iconSvg)}")`;
};

const eventIconMasks = Object.fromEntries(
  WCA_EVENT_IDS.map((eventId) => [eventId, createEventIconMask(EVENT_ICON_SVGS[eventId])]),
) as Record<WcaEventId, string>;

const createEventIconStyle = (eventId: WcaEventId): EventIconStyle => ({
  '--event-icon-mask': eventIconMasks[eventId],
});

export const EventSelector = ({
  className,
  isIconOnly = false,
  label,
  locale,
  value,
  onChange,
}: EventSelectorProps) => {
  const rootClassName = [styles.root, isIconOnly ? styles.iconOnly : undefined, className]
    .filter(Boolean)
    .join(' ');

  return (
    <Select.Root
      className={rootClassName}
      label={<span className={styles.visuallyHidden}>{label}</span>}
      style={createEventIconStyle(value)}
      value={[value]}
      onValueChange={(nextValue) => {
        const nextEventId = nextValue[0];
        if (nextEventId) onChange(nextEventId as WcaEventId);
      }}
    >
      <Select.Trigger className={isIconOnly ? styles.iconTrigger : undefined} />
      <Select.Content className={styles.content}>
        {WCA_EVENT_IDS.map((eventId) => (
          <Select.Item
            key={eventId}
            className={styles.item}
            style={createEventIconStyle(eventId)}
            value={eventId}
            label={getWcaEventLabel(eventId, locale)}
          />
        ))}
      </Select.Content>
    </Select.Root>
  );
};
