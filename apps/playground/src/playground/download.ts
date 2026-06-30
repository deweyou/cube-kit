import type { EventId } from '@cubegin/shared/events';

export const createSvgDownloadName = ({
  eventId,
  index,
}: {
  readonly eventId: EventId;
  readonly index: number;
}) => `cubegin-${eventId}-${index + 1}.svg`;
