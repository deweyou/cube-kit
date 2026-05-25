import { splitAlgorithm } from '../algorithm.js';
import { InvalidMoveError } from '../errors.js';

export const MEGAMINX_FACES = [
  'U',
  'BL',
  'BR',
  'R',
  'F',
  'L',
  'D',
  'DR',
  'DBR',
  'B',
  'DBL',
  'DL',
] as const;

export type MegaminxFace = (typeof MEGAMINX_FACES)[number];
export type MegaminxMoveAmount = 1 | 2 | 3 | 4;
export type MegaminxBigTurnName = 'R' | 'D';

export interface MegaminxFaceMove {
  readonly type: 'face';
  readonly face: MegaminxFace;
  readonly amount: MegaminxMoveAmount;
}

export interface MegaminxBigTurnMove {
  readonly type: 'big-turn';
  readonly name: MegaminxBigTurnName;
  readonly amount: MegaminxMoveAmount;
}

export type MegaminxMove = MegaminxFaceMove | MegaminxBigTurnMove;

const FACE_MOVE_PATTERN = /^(U|BL|BR|R|F|L|D|DR|DBR|B|DBL|DL)(2'?|')?$/;
const BIG_TURN_PATTERN = /^([RD])(\+\+?|\-\-?)$/;
const MEGAMINX_FACE_SET = new Set<string>(MEGAMINX_FACES);

const isMegaminxFace = (face: string): face is MegaminxFace =>
  MEGAMINX_FACE_SET.has(face);

const parseFaceAmount = (suffix: string | undefined): MegaminxMoveAmount => {
  if (suffix === '2') return 2;
  if (suffix === "2'") return 3;
  if (suffix === "'") return 4;

  return 1;
};

const parseBigTurnAmount = (suffix: string): MegaminxMoveAmount => {
  if (suffix === '+') return 1;
  if (suffix === '++') return 2;
  if (suffix === '--') return 3;

  return 4;
};

export const parseMegaminxMove = (token: string): MegaminxMove => {
  const bigTurnMatch = token.match(BIG_TURN_PATTERN);
  if (bigTurnMatch) {
    const [, name, suffix] = bigTurnMatch;
    if ((name !== 'R' && name !== 'D') || suffix === undefined) {
      throw new InvalidMoveError(token, 'megaminx');
    }

    return {
      type: 'big-turn',
      name,
      amount: parseBigTurnAmount(suffix),
    };
  }

  const faceMatch = token.match(FACE_MOVE_PATTERN);
  if (!faceMatch) throw new InvalidMoveError(token, 'megaminx');

  const [, face, suffix] = faceMatch;
  if (face === undefined || !isMegaminxFace(face)) {
    throw new InvalidMoveError(token, 'megaminx');
  }

  return {
    type: 'face',
    face,
    amount: parseFaceAmount(suffix),
  };
};

export const parseMegaminxAlgorithm = (
  algorithm: string,
): readonly MegaminxMove[] => splitAlgorithm(algorithm).map(parseMegaminxMove);
