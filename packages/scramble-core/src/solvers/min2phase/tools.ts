import type { RandomSource } from '../../random-source.js';
import { CubieCube, SOLVED_FACE_CUBE } from './cubie-cube.js';
import { generateRandomMoveSequence } from './util.js';

const RANDOM_STATE_LENGTH = 21;

export const randomCube = (random: RandomSource): string => {
  const generator = generateRandomMoveSequence({
    random,
    length: RANDOM_STATE_LENGTH,
  });

  return new CubieCube(generator).toFaceCube();
};

export const fromScramble = (scramble: string): string =>
  new CubieCube(scramble).toFaceCube();

export const isSolvedFaceCube = (facelets: string): boolean =>
  facelets === SOLVED_FACE_CUBE;

export const generatorFromFaceCube = (facelets: string): string | undefined => {
  if (facelets === SOLVED_FACE_CUBE) return '';

  const prefix = `${SOLVED_FACE_CUBE}:`;
  if (!facelets.startsWith(prefix)) return undefined;

  return facelets.slice(prefix.length);
};
