import { describe, expect, it } from 'vitest';
import { Edge3 } from './edge.js';

describe('threephase edge coordinates', () => {
  it('round-trips raw coordinates used by Edge3 symmetry reduction', () => {
    const edge = new Edge3();

    for (let raw = 0; raw < 11_880; raw += 1) {
      edge.set(raw * Edge3.factX[8]!);

      expect(edge.get(4)).toBe(raw);
    }
  });

  it('builds the expected TNoodle Edge3 symmetry table', () => {
    Edge3.initRaw2Sym();

    expect(Edge3.sym2raw).toHaveLength(Edge3.N_SYM);
  });

  it('builds the expected TNoodle Edge3 pruning frontier', () => {
    Edge3.initMvrot();
    Edge3.initRaw2Sym();
    Edge3.createPrun();

    expect(Edge3.done).toBe(Edge3.prunValues[Edge3.MAX_DEPTH - 1]);
  }, 120_000);
});
