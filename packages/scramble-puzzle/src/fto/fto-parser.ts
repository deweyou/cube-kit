import { splitAlgorithm } from '../algorithm.js';
import { InvalidMoveError } from '../errors.js';

export const FTO_FACES = ['U', 'F', 'BR', 'BL', 'D', 'B', 'R', 'L'] as const;
export const FTO_MOVE_FACES = ['U', 'D', 'F', 'B', 'L', 'R', 'BL', 'BR'] as const;

export type FtoFace = (typeof FTO_FACES)[number];
export type FtoMoveFace = (typeof FTO_MOVE_FACES)[number];
export type FtoMoveAmount = 1 | 2;

export interface FtoMove {
  readonly face: FtoMoveFace;
  readonly amount: FtoMoveAmount;
}

const FTO_MOVE_PATTERN = /^(BR|BL|[UDFBLR])('?)$/;
const FTO_MOVE_FACE_SET = new Set<string>(FTO_MOVE_FACES);

const isFtoMoveFace = (face: string): face is FtoMoveFace => FTO_MOVE_FACE_SET.has(face);

export const parseFtoMove = (token: string): FtoMove => {
  const match = token.match(FTO_MOVE_PATTERN);
  if (!match) throw new InvalidMoveError(token, 'face-turning-octahedron');

  const [, face, suffix] = match;
  if (face === undefined || !isFtoMoveFace(face)) {
    throw new InvalidMoveError(token, 'face-turning-octahedron');
  }

  return {
    face,
    amount: suffix === "'" ? 2 : 1,
  };
};

export const parseFtoAlgorithm = (algorithm: string): readonly FtoMove[] =>
  splitAlgorithm(algorithm).map(parseFtoMove);
