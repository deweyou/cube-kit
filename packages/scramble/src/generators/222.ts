import { rankPerm, unrankPerm, rankOrientation, unrankOrientation } from './utils/coords';
import { randomInt } from './utils/random';

/**
 * WCA 2x2x2 random-state scramble generator.
 *
 * Corner layout: 0=URF, 1=UFL, 2=ULB, 3=UBR, 4=DFR, 5=DLF, 6=DBL, 7=DRB
 * Fixed corner: DBL (index 6) — NOT moved by U, R, or F generators.
 *
 * State: cp = rank of permutation of corners [0,1,2,3,4,5,7] in positions [0..6]
 *        co = rank of orientations of those 7 corners (6 free + 1 derived)
 *
 * CP size: 7! = 5040   CO size: 3^6 = 729
 */

// Move definitions: raw[destPosition] = [sourceCorner, twistDelta]
// Corner 6 (DBL) occupies position 6 and is never moved.
// The 7 tracked corners are [0,1,2,3,4,5,7] mapped to positions [0..6].

// Position-to-original-corner mapping (with DBL=6 fixed at position 6):
// pos 0=URF(0), pos 1=UFL(1), pos 2=ULB(2), pos 3=UBR(3),
// pos 4=DFR(4), pos 5=DLF(5), pos 6=DBL(6-fixed), pos7slot=DRB(7)
// We track 7 movable positions: [0,1,2,3,4,5, 7-mapped-to-pos6]

// Re-label for clarity: positions 0..6 track corners in slots
// slot 0=URF, 1=UFL, 2=ULB, 3=UBR, 4=DFR, 5=DLF, 6=DRB (slot 6 = original corner 7)
// DBL (original corner 6) is fixed and excluded.
// The "logical position" array is [URF,UFL,ULB,UBR,DFR,DLF,DRB] — 7 slots.

// Move raw: for each of the 7 tracked slots, [fromSlot, twistDelta]
// U move cycles: URF→UBR→ULB→UFL (slots 0,3,2,1)
// R move cycles: URF→DRB→DFR→UBR (slots 0,6,4,3)
// F move cycles: URF→DFR→DLF→UFL (slots 0,4,5,1)

type RawMove7 = Array<[number, number]>; // length 7

const RAW7: Record<string, RawMove7> = {
  // Format: result[slot] = [sourceSlot, twistDelta]
  // U: URF←UFL, UFL←ULB, ULB←UBR, UBR←URF; rest unchanged
  // Cycle: URF(0)→UBR(3)→ULB(2)→UFL(1)→URF(0), no orientation change
  U: [
    [1, 0],
    [2, 0],
    [3, 0],
    [0, 0],
    [4, 0],
    [5, 0],
    [6, 0],
  ],
  // R: URF(0)→UBR(3)→DRB(6)→DFR(4)→URF(0), with orientation change
  // Twist pattern for R: URF gets twist+2, UBR gets twist+1, DRB gets twist+2, DFR gets twist+1
  R: [
    [4, 2],
    [1, 0],
    [2, 0],
    [0, 1],
    [6, 1],
    [5, 0],
    [3, 2],
  ],
  // F: URF(0)→UFL(1)→DLF(5)→DFR(4)→URF(0), with orientation change
  // Twist: URF+1, UFL+2, DLF+1, DFR+2
  F: [
    [5, 1],
    [0, 2],
    [2, 0],
    [3, 0],
    [1, 2],
    [4, 1],
    [6, 0],
  ],
};

const invertRaw7 = (m: RawMove7): RawMove7 => {
  const inv: RawMove7 = Array.from({ length: 7 }) as RawMove7;
  for (let i = 0; i < 7; i++) inv[m[i][0]] = [i, (3 - m[i][1]) % 3];
  return inv;
};

const composeRaw7 = (a: RawMove7, b: RawMove7): RawMove7 =>
  a.map(([src, tw]) => [b[src][0], (tw + b[src][1]) % 3] as [number, number]);

const ALL_RAW: Record<string, RawMove7> = {};
for (const [n, r] of Object.entries(RAW7)) {
  ALL_RAW[n] = r;
  ALL_RAW[`${n}'`] = invertRaw7(r);
  ALL_RAW[`${n}2`] = composeRaw7(r, r);
}

const MOVE_NAMES = Object.keys(ALL_RAW);
const MOVE_FACE = MOVE_NAMES.map((m) => m[0]);
const N_MOVES = MOVE_NAMES.length; // 9

const CP_SIZE = 5040; // 7!
const CO_SIZE = 729; // 3^6 (6 free orientations)

// Separate CP and CO move tables (they're independent!)
let cpMoveTable: Uint16Array[] | null = null;
let coMoveTable: Uint16Array[] | null = null;
let pruningTable: Int8Array | null = null;

const buildMoveTables = (): void => {
  cpMoveTable = Array.from({ length: N_MOVES }, () => new Uint16Array(CP_SIZE));
  coMoveTable = Array.from({ length: N_MOVES }, () => new Uint16Array(CO_SIZE));

  for (let m = 0; m < N_MOVES; m++) {
    const raw = ALL_RAW[MOVE_NAMES[m]];

    for (let cp = 0; cp < CP_SIZE; cp++) {
      const perm = unrankPerm(cp, 7);
      const newPerm = raw.map(([src]) => perm[src]);
      cpMoveTable![m][cp] = rankPerm(newPerm);
    }

    // CO: 7 elements, last one derived (sum % 3 = 0) → encode first 6 → range 3^6=729
    // unrankOrientation(co, 7, 3) gives 7-element array where last = derived
    for (let co = 0; co < CO_SIZE; co++) {
      const ori = unrankOrientation(co, 7, 3);
      const newOri = raw.map(([src, twist]) => (ori[src] + twist) % 3);
      coMoveTable![m][co] = rankOrientation(newOri, 3);
    }
  }
};

const buildPruningTable = (): void => {
  pruningTable = new Int8Array(CP_SIZE * CO_SIZE).fill(-1);
  const queue = new Int32Array(CP_SIZE * CO_SIZE);
  // Solved state: identity perm (rank=0), all orientations 0 (rank=0)
  pruningTable[0] = 0;
  queue[0] = 0;
  let head = 0,
    tail = 1;

  const cpT = cpMoveTable!;
  const coT = coMoveTable!;

  while (head < tail) {
    const idx = queue[head++];
    const cp = Math.floor(idx / CO_SIZE);
    const co = idx % CO_SIZE;
    const depth = pruningTable[idx];

    for (let m = 0; m < N_MOVES; m++) {
      const nextIdx = cpT[m][cp] * CO_SIZE + coT[m][co];
      if (pruningTable[nextIdx] === -1) {
        pruningTable[nextIdx] = depth + 1;
        queue[tail++] = nextIdx;
      }
    }
  }
};

const ensureTables = (): void => {
  if (pruningTable) return;
  buildMoveTables();
  buildPruningTable();
};

const solve = (startCp: number, startCo: number): string[] | null => {
  const pt = pruningTable!;
  const cpT = cpMoveTable!;
  const coT = coMoveTable!;

  const search = (
    cp: number,
    co: number,
    g: number,
    threshold: number,
    path: number[],
    lastFace: string,
  ): number | true => {
    const h = pt[cp * CO_SIZE + co];
    if (h < 0) return Infinity; // unreachable (shouldn't happen)
    if (g + h > threshold) return g + h;
    if (cp === 0 && co === 0) return true;
    let min = Infinity;
    for (let m = 0; m < N_MOVES; m++) {
      if (MOVE_FACE[m] === lastFace) continue;
      const ncp = cpT[m][cp];
      const nco = coT[m][co];
      path.push(m);
      const r = search(ncp, nco, g + 1, threshold, path, MOVE_FACE[m]);
      if (r === true) return true;
      if (typeof r === 'number' && r < min) min = r;
      path.pop();
    }
    return min;
  };

  let threshold = pt[startCp * CO_SIZE + startCo];
  while (threshold <= 14) {
    const path: number[] = [];
    const r = search(startCp, startCo, 0, threshold, path, '');
    if (r === true) return path.map((m) => MOVE_NAMES[m]);
    if (typeof r === 'number') threshold = r;
    else break;
  }
  return null;
};

const invertMoveList = (moves: string[]): string[] => {
  const INV: Record<string, string> = {};
  for (const n of MOVE_NAMES) {
    if (n.endsWith("'")) INV[n] = n.slice(0, -1);
    else if (n.endsWith('2')) INV[n] = n;
    else INV[n] = `${n}'`;
  }
  return moves.map((m) => INV[m]).reverse();
};

export const generate222 = (): string => {
  ensureTables();
  const cp = randomInt(CP_SIZE);
  const co = randomInt(CO_SIZE);
  if (cp === 0 && co === 0) return generate222(); // skip solved state
  const solution = solve(cp, co);
  if (!solution) return generate222();
  return invertMoveList(solution).join(' ');
};
