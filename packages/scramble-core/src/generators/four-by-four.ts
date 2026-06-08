import type { RandomSource } from '../random-source.js';
import { FourByFourThreephaseSearch as Search } from '@cubegin/solver';

export interface FourByFourScrambleOptions {
  random: RandomSource;
}

const ORIENTATION_SEQUENCES = [
  [],
  ['y'],
  ['y2'],
  ["y'"],
  ['x'],
  ['x', 'y'],
  ['x', 'y2'],
  ['x', "y'"],
  ['x2'],
  ['x2', 'y'],
  ['x2', 'y2'],
  ['x2', "y'"],
  ["x'"],
  ["x'", 'y'],
  ["x'", 'y2'],
  ["x'", "y'"],
  ['z'],
  ['z', 'y'],
  ['z', 'y2'],
  ['z', "y'"],
  ["z'"],
  ["z'", 'y'],
  ["z'", 'y2'],
  ["z'", "y'"],
] as const;

export const generateFourByFourScramble = ({ random }: FourByFourScrambleOptions): string => {
  const search = new Search();
  return search.randomState(random).trim();
};

export const generateFourByFourNoInspectionScramble = ({
  random,
}: FourByFourScrambleOptions): string => {
  const orientation = chooseOrientation(random);
  const scramble = generateFourByFourScramble({ random });

  return [...scramble.split(/\s+/), ...orientation].join(' ').trim();
};

const chooseOrientation = (random: RandomSource): readonly string[] => {
  const index = random.nextInt(ORIENTATION_SEQUENCES.length);
  const orientation = ORIENTATION_SEQUENCES[index];

  if (orientation === undefined) {
    throw new RangeError(
      `@cubegin/scramble-core: random source returned ${index} for max ${ORIENTATION_SEQUENCES.length}`,
    );
  }

  return orientation;
};
