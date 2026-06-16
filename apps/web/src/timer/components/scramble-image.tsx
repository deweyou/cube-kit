import type { WcaEventId } from '@cubegin/shared/wca';
import styles from './scramble-image.module.css';

interface ScrambleImageProps {
  eventId?: WcaEventId;
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
