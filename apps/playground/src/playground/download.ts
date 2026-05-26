import type { WcaEventId } from '@cubekit/scramble-puzzle';

export const createSvgDownloadName = ({
  eventId,
  index,
}: {
  readonly eventId: WcaEventId;
  readonly index: number;
}) => `cubekit-${eventId}-${index + 1}.svg`;
