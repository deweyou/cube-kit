import type { CubeState } from '../types';
import { DEFAULT_COLOR_SCHEME } from '../types';

/**
 * Skewb internal state: 30 stickers.
 * Face order: U=0, R=1, F=2, B=3, L=4, D=5  (cstimer convention)
 * Positions within face: 0=center, 1=TL, 2=TR, 3=BL, 4=BR
 *
 * Corner reference (from cstimer skewb.js):
 *   fixedCorn: UBR=[4,16,7], UFL=[1,11,22], DFR=[26,14,8], DBL=[29,19,23]
 *   twstCorn:  UFR=[3,6,12], UBL=[2,21,17], DBR=[27,9,18], DFL=[28,24,13]
 *
 * Each WCA move is 5 three-cycles on the sticker array.
 * Cycle (a,b,c) means: value at a → b, b → c, c → a.
 */

type SkewbState = string[];

// Three-cycles for each WCA Skewb move.
// Derived from cstimer moveCenters / moveCorners / fixedCorn / twstCorn + fillFacelet.
// WCA Skewb uses only R, L, U, B (no F), but F is included for completeness.
const MOVE_CYCLES: Record<string, ReadonlyArray<readonly [number, number, number]>> = {
  L: [[5, 0, 15], [3, 17, 9], [6, 2, 18], [12, 21, 27], [4, 16, 7]],
  R: [[20, 0, 10], [3, 13, 21], [6, 28, 17], [12, 24, 2], [1, 11, 22]],
  B: [[10, 5, 25], [3, 18, 24], [6, 27, 13], [12, 9, 28], [26, 14, 8]],
  U: [[15, 20, 25], [2, 13, 9], [21, 28, 18], [17, 24, 27], [29, 19, 23]],
  F: [[10, 0, 5], [3, 6, 12], [2, 18, 24], [21, 27, 13], [17, 9, 28]],
};

/** Apply a single 3-cycle (CW: a→b→c→a) to the state array in-place. */
const applyCycle = (s: SkewbState, a: number, b: number, c: number): void => {
  const tmp = s[a];
  s[a] = s[c];
  s[c] = s[b];
  s[b] = tmp;
};

/** Apply a single 3-cycle in reverse (CCW: a→c→b→a). */
const applyCycleRev = (s: SkewbState, a: number, b: number, c: number): void => {
  const tmp = s[a];
  s[a] = s[b];
  s[b] = s[c];
  s[c] = tmp;
};

const applySkewbMove = (state: SkewbState, face: string, prime: boolean): void => {
  const cycles = MOVE_CYCLES[face];
  if (!cycles) return;
  for (const [a, b, c] of cycles) {
    if (prime) applyCycleRev(state, a, b, c);
    else applyCycle(state, a, b, c);
  }
};

/** Build a solved 30-sticker state. Colors are in cstimer face order: U,R,F,B,L,D. */
const solvedSkewbState = (): SkewbState => {
  const cs = DEFAULT_COLOR_SCHEME;
  // Internal face order: U, R, F, B, L, D
  const faceColors = [cs.U, cs.R, cs.F, cs.B, cs.L, cs.D];
  const state: SkewbState = [];
  for (const color of faceColors) {
    for (let p = 0; p < 5; p++) state.push(color);
  }
  return state;
};

/**
 * Convert internal 30-sticker state (cstimer face order U,R,F,B,L,D)
 * to CubeState (face order 0=U,1=D,2=F,3=B,4=L,5=R, positions 0-4 same within face).
 */
const toCubeState = (state: SkewbState): CubeState => {
  // cstimer face index → CubeState face index
  // 0=U→0, 1=R→5, 2=F→2, 3=B→3, 4=L→4, 5=D→1
  const faceMap = [0, 5, 2, 3, 4, 1];
  const result: CubeState = Array.from({ length: 6 }, () => Array(5).fill(''));
  for (let f = 0; f < 6; f++) {
    const ci = faceMap[f];
    for (let p = 0; p < 5; p++) {
      result[ci][p] = state[f * 5 + p];
    }
  }
  return result;
};

/** Apply a WCA Skewb scramble string and return the resulting CubeState. */
export const applySkewbScramble = (scramble: string): CubeState => {
  const state = solvedSkewbState();
  for (const token of scramble.trim().split(/\s+/).filter(Boolean)) {
    const face = token[0];
    const prime = token.endsWith("'");
    applySkewbMove(state, face, prime);
  }
  return toCubeState(state);
};

/** Return a solved Skewb CubeState (for rendering without a scramble). */
export const skewbSolvedState = (): CubeState => toCubeState(solvedSkewbState());
