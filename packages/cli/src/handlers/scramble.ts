import { createDefaultScrambleGenerator, createMathRandomSource } from '@cubegin/scramble-core';
import { renderScrambleImage } from '@cubegin/scramble-image';
import { WCA_EVENT_IDS, WCA_EVENT_INFO, type WcaEventId } from '@cubegin/scramble-puzzle';

import { CliError } from '../errors.js';

export interface ScrambleEventItem {
  readonly id: WcaEventId;
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
  readonly eventId: WcaEventId;
  readonly scrambles: readonly string[];
}

export interface RenderScrambleData {
  readonly eventId: WcaEventId;
  readonly format: 'svg';
  readonly svg: string;
}

export const listScrambleEvents = (): ScrambleEventsData => ({
  events: WCA_EVENT_IDS.map((id) => WCA_EVENT_INFO[id]),
});

export const generateScrambles = async (
  eventId: string,
  options: GenerateScrambleOptions = {},
): Promise<GenerateScrambleData> => {
  const normalizedEventId = parseWcaEventId(eventId);
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
  const normalizedEventId = parseWcaEventId(eventId);
  return {
    eventId: normalizedEventId,
    format: 'svg',
    svg: renderScrambleImage(normalizedEventId, scramble),
  };
};

const parseWcaEventId = (eventId: string): WcaEventId => {
  if ((WCA_EVENT_IDS as readonly string[]).includes(eventId)) return eventId as WcaEventId;
  throw new CliError('UNKNOWN_EVENT', `Unsupported event id: ${eventId}`, {
    exitCode: 3,
    hints: ['Run `cubegin scramble events --json`.'],
  });
};
