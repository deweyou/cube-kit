import type { EventId } from '@cubegin/shared/events';
import { generateUniqueScrambleBatch } from './batch.js';
import { generateClockScramble } from './generators/clock.js';
import { generateCubeRandomTurnScramble } from './generators/cube-random-turns.js';
import {
  generateFourByFourNoInspectionScramble,
  generateFourByFourScramble,
} from './generators/four-by-four.js';
import { generateFtoScramble } from './generators/fto.js';
import { generateMegaminxScramble } from './generators/megaminx.js';
import { generatePyraminxScramble } from './generators/pyraminx.js';
import { generateSkewbScramble } from './generators/skewb.js';
import { generateSquareOneScramble } from './generators/square1.js';
import {
  generateMultiBlindScramble,
  generateThreeByThreeFewestMovesScramble,
  generateThreeByThreeNoInspectionScramble,
  generateThreeByThreeScramble,
} from './generators/three-by-three.js';
import { generateTwoByTwoScramble } from './generators/two-by-two.js';
import type { RandomSource } from './random-source.js';
import type { CaseSelectionOptions } from './case-selection.js';
import {
  getScrambleTypeDefinition,
  type ScrambleTypeId,
  type TrainingScrambleTypeId,
} from './catalog.js';

const ERROR_PREFIX = '@cubegin/scramble-core';

export interface GenerateOptions {
  random?: RandomSource;
  multiBlindCubeCount?: number;
}

export interface GenerateTypeOptions extends GenerateOptions, CaseSelectionOptions {}

export interface ScrambleResult {
  eventId: EventId;
  scramble: string;
}

export interface TrainingScrambleResult extends ScrambleResult {
  scrambleTypeId: ScrambleTypeId;
  caseId?: string;
}

export type EventScrambleGenerator = (
  options: GenerateOptions & { random: RandomSource },
) => ScrambleResult | Promise<ScrambleResult>;

export type TrainingScrambleGenerator = (
  options: GenerateTypeOptions & { random: RandomSource },
) => TrainingScrambleResult | Promise<TrainingScrambleResult>;

export interface ScrambleGeneratorOptions {
  random: RandomSource;
  generators: Partial<Record<EventId, EventScrambleGenerator>>;
  trainingGenerators?: Partial<Record<TrainingScrambleTypeId, TrainingScrambleGenerator>>;
}

export interface DefaultScrambleGeneratorOptions {
  random: RandomSource;
}

export interface ScrambleGenerator {
  generate(eventId: EventId, options?: GenerateOptions): Promise<ScrambleResult>;
  generateBatch(
    eventId: EventId,
    count: number,
    options?: GenerateOptions,
  ): Promise<readonly ScrambleResult[]>;
  generateType(
    scrambleTypeId: ScrambleTypeId,
    options?: GenerateTypeOptions,
  ): Promise<TrainingScrambleResult>;
  generateTypeBatch(
    scrambleTypeId: ScrambleTypeId,
    count: number,
    options?: GenerateTypeOptions,
  ): Promise<readonly TrainingScrambleResult[]>;
}

export const createScrambleGenerator = ({
  random,
  generators,
  trainingGenerators = {},
}: ScrambleGeneratorOptions): ScrambleGenerator => {
  const api: ScrambleGenerator = {
    async generate(eventId, options = {}) {
      const generator = generators[eventId];
      if (!generator) throw new Error(`${ERROR_PREFIX}: event '${eventId}' has no generator`);
      return await generator({ ...options, random: options.random ?? random });
    },
    async generateBatch(eventId, count, options = {}) {
      return generateUniqueScrambleBatch(count, () => api.generate(eventId, options));
    },
    async generateType(scrambleTypeId, options = {}) {
      const definition = getScrambleTypeDefinition(scrambleTypeId);
      if (definition.kind === 'official') {
        const officialResult = await api.generate(definition.baseEventId, options);
        return { ...officialResult, scrambleTypeId };
      }

      const generator = trainingGenerators[scrambleTypeId as TrainingScrambleTypeId];
      if (generator === undefined) {
        throw new Error(`${ERROR_PREFIX}: scramble type '${scrambleTypeId}' has no generator`);
      }

      return await generator({ ...options, random: options.random ?? random });
    },
    async generateTypeBatch(scrambleTypeId, count, options = {}) {
      return generateUniqueScrambleBatch(count, () => api.generateType(scrambleTypeId, options));
    },
  };

  return api;
};

export const createDefaultScrambleGenerator = ({
  random,
}: DefaultScrambleGeneratorOptions): ScrambleGenerator =>
  createScrambleGenerator({ random, generators: DEFAULT_GENERATORS });

const DEFAULT_GENERATORS = {
  333: ({ random }) => result('333', generateThreeByThreeScramble({ random })),
  222: ({ random }) => result('222', generateTwoByTwoScramble({ random })),
  444: ({ random }) => result('444', generateFourByFourScramble({ random })),
  555: ({ random }) =>
    result('555', generateCubeRandomTurnScramble({ random, size: 5, length: 60 })),
  666: ({ random }) =>
    result('666', generateCubeRandomTurnScramble({ random, size: 6, length: 80 })),
  777: ({ random }) =>
    result('777', generateCubeRandomTurnScramble({ random, size: 7, length: 100 })),
  '333bld': ({ random }) => result('333bld', generateThreeByThreeNoInspectionScramble({ random })),
  '333fm': ({ random }) => result('333fm', generateThreeByThreeFewestMovesScramble({ random })),
  '333oh': ({ random }) => result('333oh', generateThreeByThreeScramble({ random })),
  clock: ({ random }) => result('clock', generateClockScramble({ random })),
  minx: ({ random }) => result('minx', generateMegaminxScramble({ random })),
  pyram: ({ random }) => result('pyram', generatePyraminxScramble({ random })),
  skewb: ({ random }) => result('skewb', generateSkewbScramble({ random })),
  sq1: ({ random }) => result('sq1', generateSquareOneScramble({ random })),
  '444bld': ({ random }) => result('444bld', generateFourByFourNoInspectionScramble({ random })),
  '555bld': ({ random }) => result('555bld', generateFiveByFiveNoInspectionScramble(random)),
  '333mbld': ({ random, multiBlindCubeCount }) => {
    if (multiBlindCubeCount === undefined) {
      throw new Error(`${ERROR_PREFIX}: event '333mbld' requires multiBlindCubeCount`);
    }

    return result(
      '333mbld',
      generateMultiBlindScramble({ random, cubeCount: multiBlindCubeCount }),
    );
  },
  fto: ({ random }) => result('fto', generateFtoScramble({ random })),
} satisfies Record<EventId, EventScrambleGenerator>;

const FIVE_BY_FIVE_NO_INSPECTION_ORIENTATION_SEQUENCES = [
  [],
  ['3Uw'],
  ['3Uw2'],
  ["3Uw'"],
  ['3Rw'],
  ['3Rw', '3Uw'],
  ['3Rw', '3Uw2'],
  ['3Rw', "3Uw'"],
  ['3Rw2'],
  ['3Rw2', '3Uw'],
  ['3Rw2', '3Uw2'],
  ['3Rw2', "3Uw'"],
  ["3Rw'"],
  ["3Rw'", '3Uw'],
  ["3Rw'", '3Uw2'],
  ["3Rw'", "3Uw'"],
  ['3Fw'],
  ['3Fw', '3Uw'],
  ['3Fw', '3Uw2'],
  ['3Fw', "3Uw'"],
  ["3Fw'"],
  ["3Fw'", '3Uw'],
  ["3Fw'", '3Uw2'],
  ["3Fw'", "3Uw'"],
] as const;

const generateFiveByFiveNoInspectionScramble = (random: RandomSource): string => {
  const orientation = chooseFiveByFiveOrientation(random);
  const scramble = generateCubeRandomTurnScramble({ random, size: 5, length: 60 });

  return [...trimRedundantTail(scramble, orientation[0]), ...orientation].join(' ');
};

const chooseFiveByFiveOrientation = (random: RandomSource): readonly string[] => {
  const index = random.nextInt(FIVE_BY_FIVE_NO_INSPECTION_ORIENTATION_SEQUENCES.length);
  const orientation = FIVE_BY_FIVE_NO_INSPECTION_ORIENTATION_SEQUENCES[index];

  if (orientation === undefined) {
    throw new RangeError(
      `${ERROR_PREFIX}: random source returned ${index} for max ${FIVE_BY_FIVE_NO_INSPECTION_ORIENTATION_SEQUENCES.length}`,
    );
  }

  return orientation;
};

const trimRedundantTail = (
  scramble: string,
  firstOrientationMove: string | undefined,
): string[] => {
  const moves = scramble.trim().length === 0 ? [] : scramble.trim().split(/\s+/);
  const orientationAxis =
    firstOrientationMove === undefined ? undefined : axisForMove(firstOrientationMove);

  while (
    moves.length > 0 &&
    orientationAxis !== undefined &&
    axisForMove(moves.at(-1)!) === orientationAxis
  ) {
    moves.pop();
  }

  return moves;
};

const axisForMove = (move: string): number | undefined => {
  const match = move.match(/(?:\d+)?([RUFLDB])w?|([xyz])/);
  const face = match?.[1] ?? match?.[2];

  switch (face) {
    case 'R':
    case 'L':
    case 'x':
      return 0;
    case 'U':
    case 'D':
    case 'y':
      return 1;
    case 'F':
    case 'B':
    case 'z':
      return 2;
    default:
      return undefined;
  }
};

const result = (eventId: EventId, scramble: string): ScrambleResult => ({
  eventId,
  scramble,
});
