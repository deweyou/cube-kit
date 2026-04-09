import { describe, expect, it } from 'vitest';
import { buildMoveTable } from '../../../src/generators/utils/move-table';

describe('buildMoveTable', () => {
  it('builds correct table for cyclic 3-state puzzle', () => {
    // state 0 --move+1--> 1, --move+2--> 2
    // state 1 --move+1--> 2, --move+2--> 0
    // state 2 --move+1--> 0, --move+2--> 1
    const table = buildMoveTable(3, (s, m) => (s + m) % 3, [1, 2]);
    expect(table).toEqual([
      [1, 2],
      [2, 0],
      [0, 1],
    ]);
  });

  it('has dimensions [numStates][numMoves]', () => {
    const table = buildMoveTable(5, (s, m) => (s + m) % 5, [1, 2, 3]);
    expect(table.length).toBe(5);
    for (const row of table) expect(row.length).toBe(3);
  });

  it('identity move leaves all states unchanged', () => {
    const table = buildMoveTable(4, (s, _m) => s, [0]);
    expect(table).toEqual([[0], [1], [2], [3]]);
  });
});
