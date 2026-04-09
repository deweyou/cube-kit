import type { CubeState, WcaEvent } from '../types';
import { DEFAULT_COLOR_SCHEME } from '../types';

export interface Move {
  face: string;
  dir: 1 | -1 | 2; // 1=CW, -1=CCW, 2=double
  wide: boolean;
}

/** Parse a scramble string into an array of Move objects. */
export const parseMoves = (scramble: string): Move[] => {
  if (!scramble.trim()) return [];
  return scramble
    .trim()
    .split(/\s+/)
    .map((token) => {
      const wide = token.includes('w');
      const face = token[0];
      let dir: 1 | -1 | 2 = 1;
      if (token.endsWith("'")) dir = -1;
      else if (token.endsWith('2')) dir = 2;
      return { face, dir, wide };
    });
};

// Face indices: 0=U, 1=D, 2=F, 3=B, 4=L, 5=R
// For NxN: each face is an N×N array in reading order (top-left to bottom-right)

const puzzleSize = (event: WcaEvent): number => {
  switch (event) {
    case '222':
      return 2;
    case '333':
    case '333bf':
    case '333fm':
    case '333oh':
      return 3;
    case '444':
    case '444bf':
      return 4;
    case '555':
    case '555bf':
      return 5;
    case '666':
      return 6;
    case '777':
      return 7;
    default:
      return 3;
  }
};

/** Create a solved CubeState for the given event. */
export const solvedState = (event: WcaEvent): CubeState => {
  const cs = DEFAULT_COLOR_SCHEME;
  const faceColors = [cs.U, cs.D, cs.F, cs.B, cs.L, cs.R];

  const size = puzzleSize(event);
  const n = size * size;
  return faceColors.map((color) => Array(n).fill(color));
};

/** Apply a single move to a CubeState, returning a new CubeState. */
export const applyMove = (state: CubeState, move: Move, _event: WcaEvent): CubeState => {
  const n = Math.round(Math.sqrt(state[0].length));
  // Clone state
  const s: CubeState = state.map((f) => [...f]);

  const times = move.dir === 2 ? 2 : move.dir === -1 ? 3 : 1;
  for (let t = 0; t < times; t++) {
    applyFaceMoveOnce(s, move.face, n);
    if (move.wide && n > 2) {
      applyLayerOnce(s, move.face, 1, n);
    }
  }
  return s;
};

// Rotate a face 90° CW in-place
const rotateFaceCW = (s: CubeState, faceIdx: number, n: number): void => {
  const f = s[faceIdx];
  const tmp = [...f];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      f[c * n + (n - 1 - r)] = tmp[r * n + c];
    }
  }
};

// Apply the outer face move once (CW) for the given face letter
const applyFaceMoveOnce = (s: CubeState, face: string, n: number): void => {
  // Face rotates CW
  const faceIdx = faceIndex(face);
  rotateFaceCW(s, faceIdx, n);
  // Cycle the adjacent edge stickers (layer 0)
  cycleLayer(s, face, 0, n);
};

// Apply inner layer move (wide move) once CW for layer `layer` (0=outermost)
const applyLayerOnce = (s: CubeState, face: string, layer: number, n: number): void => {
  cycleLayer(s, face, layer, n);
};

const faceIndex = (face: string): number => ({ U: 0, D: 1, F: 2, B: 3, L: 4, R: 5 })[face] ?? 0;

// Cycle the stickers adjacent to face `face` at depth `layer` (CW)
// layer=0 is the outermost layer (adjacent to the face itself)
const cycleLayer = (s: CubeState, face: string, layer: number, n: number): void => {
  const L = layer;
  const N = n - 1;

  // Each face move cycles 4 strips of n stickers across the 4 adjacent faces
  // Indices are listed in the order: [U, D, F, B, L, R] = [0,1,2,3,4,5]

  // For each face, we define the 4 sides that get cycled, and the sticker indices
  // for each side (in the CW direction as seen from the face normal)

  switch (face) {
    case 'U': {
      // U CW: L→F→R→B→L (all without reversal)
      const row = L;
      const fRow = getRow(s[2], row, n);
      const rRow = getRow(s[5], row, n);
      const bRow = getRow(s[3], row, n);
      const lRow = getRow(s[4], row, n);
      setRow(s[2], row, n, lRow);
      setRow(s[5], row, n, fRow);
      setRow(s[3], row, n, rRow);
      setRow(s[4], row, n, bRow);
      break;
    }
    case 'D': {
      // D CW: F→L→B→R→F (all without reversal)
      const row = N - L;
      const fRow = getRow(s[2], row, n);
      const rRow = getRow(s[5], row, n);
      const bRow = getRow(s[3], row, n);
      const lRow = getRow(s[4], row, n);
      setRow(s[4], row, n, fRow);
      setRow(s[3], row, n, lRow);
      setRow(s[5], row, n, bRow);
      setRow(s[2], row, n, rRow);
      break;
    }
    case 'F': {
      // F CW: U bottom → R left col → D top(rev) → L right col(rev)
      const uRow = getRow(s[0], N - L, n);
      const rCol = getCol(s[5], L, n);
      const dRow = getRow(s[1], L, n);
      const lCol = getCol(s[4], N - L, n);
      setCol(s[5], L, n, uRow);
      setRow(s[1], L, n, [...rCol].reverse());
      setCol(s[4], N - L, n, dRow);
      setRow(s[0], N - L, n, [...lCol].reverse());
      break;
    }
    case 'B': {
      // B CW: U top → L left col(rev) → D bottom(rev) → R right col
      const uRow = getRow(s[0], L, n);
      const lCol = getCol(s[4], L, n);
      const dRow = getRow(s[1], N - L, n);
      const rCol = getCol(s[5], N - L, n);
      setCol(s[4], L, n, [...uRow].reverse());
      setRow(s[1], N - L, n, lCol);
      setCol(s[5], N - L, n, [...dRow].reverse());
      setRow(s[0], L, n, rCol);
      break;
    }
    case 'R': {
      // R CW: F right col → U right col → B left col(rev) → D right col
      const fCol = getCol(s[2], N - L, n);
      const uCol = getCol(s[0], N - L, n);
      const bCol = getCol(s[3], L, n);
      const dCol = getCol(s[1], N - L, n);
      setCol(s[0], N - L, n, fCol);
      setCol(s[3], L, n, [...uCol].reverse());
      setCol(s[1], N - L, n, [...bCol].reverse());
      setCol(s[2], N - L, n, dCol);
      break;
    }
    case 'L': {
      // L CW: U→F→D→B(rev)→U(rev) — U left col cycles forward/down
      const fCol = getCol(s[2], L, n);
      const uCol = getCol(s[0], L, n);
      const bCol = getCol(s[3], N - L, n);
      const dCol = getCol(s[1], L, n);
      setCol(s[2], L, n, uCol);
      setCol(s[1], L, n, fCol);
      setCol(s[3], N - L, n, [...dCol].reverse());
      setCol(s[0], L, n, [...bCol].reverse());
      break;
    }
  }
};

const getRow = (face: string[], row: number, n: number): string[] =>
  face.slice(row * n, (row + 1) * n);

const setRow = (face: string[], row: number, n: number, values: string[]): void => {
  for (let c = 0; c < n; c++) face[row * n + c] = values[c];
};

const getCol = (face: string[], col: number, n: number): string[] =>
  Array.from({ length: n }, (_, r) => face[r * n + col]);

const setCol = (face: string[], col: number, n: number, values: string[]): void => {
  for (let r = 0; r < n; r++) face[r * n + col] = values[r];
};

/** Apply a full scramble string to a solved state. */
export const applyScramble = (scramble: string, event: WcaEvent): CubeState => {
  let state = solvedState(event);
  for (const move of parseMoves(scramble)) {
    state = applyMove(state, move, event);
  }
  return state;
};
