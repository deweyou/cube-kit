import { randomInt } from './utils/random';

/**
 * WCA Megaminx scramble generator.
 *
 * Format: 7 rows, each row is 5 alternating R±±/D±± pairs followed by U or U'.
 * Example row: "R-- D++ R++ D-- R++ D-- R-- D++ R-- D++ U"
 *
 * This matches the WCA standard (TNoodle) Megaminx scramble format.
 */

const DIRS = ['++', '--'] as const;

export const generateMinx = (): string => {
  return Array.from({ length: 7 }, () => {
    const pairs = Array.from(
      { length: 5 },
      () => `R${DIRS[randomInt(2)]} D${DIRS[randomInt(2)]}`,
    ).join(' ');
    const u = randomInt(2) === 0 ? 'U' : "U'";
    return `${pairs} ${u}`;
  }).join('\n');
};
