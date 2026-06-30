import { createDefaultScrambleGenerator, createMathRandomSource } from '@cubegin/scramble-core';
import { renderScrambleImage } from '@cubegin/scramble-image';
import { EVENT_IDS, EVENT_INFO, type EventId } from '@cubegin/scramble-puzzle';

import { CliError } from '../errors.js';

export interface ScrambleEventItem {
  readonly id: EventId;
  readonly label: string;
  readonly puzzleId: string;
}

export interface ScrambleEventsData {
  readonly events: readonly ScrambleEventItem[];
}

export interface GenerateScrambleOptions {
  readonly count?: number;
  readonly multiBlindCubeCount?: number;
}

export interface GenerateScrambleData {
  readonly eventId: EventId;
  readonly scrambles: readonly string[];
}

export interface RenderScrambleData {
  readonly eventId: EventId;
  readonly format: 'svg';
  readonly svg: string;
}

export const listScrambleEvents = (): ScrambleEventsData => ({
  events: EVENT_IDS.map((id) => EVENT_INFO[id]),
});

export const generateScrambles = async (
  eventId: string,
  options: GenerateScrambleOptions = {},
): Promise<GenerateScrambleData> => {
  const normalizedEventId = parseEventId(eventId);
  const count = options.count ?? 1;
  if (!Number.isInteger(count) || count < 1) {
    throw new CliError('INVALID_COUNT', 'count must be a positive integer.', { exitCode: 2 });
  }

  const generator = createDefaultScrambleGenerator({ random: createMathRandomSource() });
  const results = await generator.generateBatch(normalizedEventId, count, {
    multiBlindCubeCount: options.multiBlindCubeCount,
  });

  return {
    eventId: normalizedEventId,
    scrambles: results.map((result) => result.scramble),
  };
};

export const renderScrambleSvg = (eventId: string, scramble: string): RenderScrambleData => {
  const normalizedEventId = parseEventId(eventId);
  return {
    eventId: normalizedEventId,
    format: 'svg',
    svg: renderScrambleImage(normalizedEventId, scramble),
  };
};

const parseEventId = (eventId: string): EventId => {
  if ((EVENT_IDS as readonly string[]).includes(eventId)) return eventId as EventId;
  throw new CliError('UNKNOWN_EVENT', `Unsupported event id: ${eventId}`, {
    exitCode: 3,
    hints: ['Run `cubegin scramble events --json`.'],
  });
};
