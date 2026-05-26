import type { RandomSource } from '../random-source.js';

export interface MegaminxScrambleOptions {
  random: RandomSource;
}

export const generateMegaminxScramble = ({ random }: MegaminxScrambleOptions): string => {
  const rows: string[] = [];

  for (let row = 0; row < 7; row += 1) {
    const moves: string[] = [];
    let lastDirection = 0;

    for (let column = 0; column < 10; column += 1) {
      const side = column % 2 === 0 ? 'R' : 'D';
      lastDirection = random.nextInt(2);
      moves.push(`${side}${lastDirection === 0 ? '++' : '--'}`);
    }

    moves.push(lastDirection === 0 ? 'U' : "U'");
    rows.push(moves.join(' '));
  }

  return rows.join('\n');
};
