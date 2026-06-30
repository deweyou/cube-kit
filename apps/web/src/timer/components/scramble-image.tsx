import type { EventId } from '@cubegin/shared/events';
import styles from './scramble-image.module.css';

interface ScrambleImageProps {
  eventId?: EventId;
  svg: string;
}

export const ScrambleImage = ({ eventId, svg }: ScrambleImageProps) => (
  <div
    className={styles.root}
    data-event={eventId}
    data-scramble-image
    dangerouslySetInnerHTML={{ __html: svg }}
  />
);
