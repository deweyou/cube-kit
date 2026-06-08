import type { WcaEventId } from '@cubegin/shared/wca';

export const createSvgDownloadName = ({
  eventId,
  index,
}: {
  readonly eventId: WcaEventId;
  readonly index: number;
}) => `cubegin-${eventId}-${index + 1}.svg`;
