import type { EventId } from '@cubegin/shared/events';
import type { TrainingScrambleTypeId } from '../catalog.js';
import type { GenerateTypeOptions, TrainingScrambleResult } from '../generator.js';
import type { RandomSource } from '../random-source.js';
import { generateEdgePairingTemplate, isEdgePairingState } from './training-four-by-four.js';

export type BigCubeTrainingScrambleTypeId = Extract<
  TrainingScrambleTypeId,
  `${'555' | '666' | '777'}.${string}`
>;

const eventAndSize = (
  scrambleTypeId: BigCubeTrainingScrambleTypeId,
): { eventId: EventId; size: number } => {
  const eventId = scrambleTypeId.slice(0, 3) as EventId;
  return { eventId, size: Number.parseInt(eventId[0] as string, 10) };
};

export const generateBigCubeTrainingScramble = (
  scrambleTypeId: BigCubeTrainingScrambleTypeId,
  options: GenerateTypeOptions & { random: RandomSource },
): TrainingScrambleResult => {
  const { eventId, size } = eventAndSize(scrambleTypeId);
  return {
    scrambleTypeId,
    eventId,
    scramble: generateEdgePairingTemplate(size, options.random),
  };
};

export const doesBigCubeTrainingStateMatch = (
  scrambleTypeId: BigCubeTrainingScrambleTypeId,
  scramble: string,
): boolean => isEdgePairingState(scramble, eventAndSize(scrambleTypeId).size);
