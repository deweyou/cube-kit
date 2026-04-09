import type { WcaEvent } from '../types';
import { generate222 } from './222';
import { generate333 } from './333';
import { generate444 } from './444';
import { generate555 } from './555';
import { generate666 } from './666';
import { generate777 } from './777';
import { generateMinx } from './minx';
import { generatePyram } from './pyram';
import { generateSq1 } from './sq1';
import { generateSkewb } from './skewb';
import { generateClock } from './clock';

const pickOne = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/**
 * 333bf: random-state 3x3 + optional Rw/Fw suffix + optional Uw suffix.
 * Randomizes cube orientation so solvers can't infer axis from the scramble.
 */
const generate333bf = (): string => {
  const base = generate333();
  const s1 = pickOne(['', 'Rw', 'Rw2', "Rw'", 'Fw', "Fw'"]);
  const s2 = pickOne(['', 'Uw', 'Uw2', "Uw'"]);
  return [base, s1, s2].filter(Boolean).join(' ');
};

/**
 * 444bf: random-state 4x4 + optional x/z rotation + optional y rotation.
 * Full-puzzle rotations randomize orientation for BLD solving.
 */
const generate444bf = (): string => {
  const base = generate444();
  const s1 = pickOne(['', 'x', 'x2', "x'", 'z', "z'"]);
  const s2 = pickOne(['', 'y', 'y2', "y'"]);
  return [base, s1, s2].filter(Boolean).join(' ');
};

/**
 * 555bf: same orientation-randomization pattern as 444bf.
 */
const generate555bf = (): string => {
  const base = generate555();
  const s1 = pickOne(['', 'x', 'x2', "x'", 'z', "z'"]);
  const s2 = pickOne(['', 'y', 'y2', "y'"]);
  return [base, s1, s2].filter(Boolean).join(' ');
};

/**
 * 333fm: wraps 3x3 scramble as `R' U' F [scramble] R' U' F`.
 * Constraint: scramble must not start with F-family or end with R-family moves
 * (prevents cancellation with the prefix/suffix).
 */
const generate333fm = (): string => {
  let scramble: string;
  let moves: string[];
  do {
    scramble = generate333();
    moves = scramble.trim().split(/\s+/);
  } while ((moves[0] ?? '').startsWith('F') || (moves[moves.length - 1] ?? '').startsWith('R'));
  return `R' U' F ${scramble} R' U' F`;
};

const REGISTRY: Record<WcaEvent, () => string> = {
  '333': generate333,
  '222': generate222,
  '444': generate444,
  '555': generate555,
  '666': generate666,
  '777': generate777,
  '333bf': generate333bf,
  '333fm': generate333fm,
  '333oh': generate333,
  '444bf': generate444bf,
  '555bf': generate555bf,
  minx: generateMinx,
  pyram: generatePyram,
  sq1: generateSq1,
  skewb: generateSkewb,
  clock: generateClock,
};

export const generate = (event: WcaEvent): string => REGISTRY[event]();

/** Pre-initialize tables for events that require precomputation (222). */
export const warmupGenerators = async (): Promise<void> => {
  // Trigger table build for 222 (synchronous but CPU-intensive on first call)
  generate222();
};
