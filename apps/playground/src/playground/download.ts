import type { WcaEventId } from '@cubegin/scramble-puzzle';

export const createSvgDownloadName = ({
  eventId,
  index,
}: {
  readonly eventId: WcaEventId;
  readonly index: number;
}) => `cubegin-${eventId}-${index + 1}.svg`;
