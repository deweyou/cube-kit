import { describe, expect, it } from 'vitest';
import { SubgroupSolver } from './subgroup-solver.js';

interface ClockState {
  readonly value: number;
}

describe('SubgroupSolver', () => {
  const solver = new SubgroupSolver<ClockState>({
    identity: { value: 0 },
    generators: [
      {
        id: 'R',
        apply: ({ value }) => ({ value: (value + 1) % 8 }),
        inverseId: "R'",
      },
      {
        id: "R'",
        apply: ({ value }) => ({ value: (value + 7) % 8 }),
        inverseId: 'R',
      },
    ],
    stateKey: ({ value }) => String(value),
    maxDepth: 4,
  });

  it('builds the reachable subgroup and returns shortest paths', () => {
    expect(solver.size).toBe(8);
    expect(solver.isComplete).toBe(true);
    expect(solver.solve({ value: 3 })).toEqual(["R'", "R'", "R'"]);
  });

  it('samples a reachable non-degenerate state deterministically', () => {
    const sample = solver.sample(
      {
        nextInt(maxExclusive) {
          return maxExclusive - 1;
        },
      },
      { minDepth: 2 },
    );

    expect(sample.depth).toBeGreaterThanOrEqual(2);
    expect(sample.scramble).not.toHaveLength(0);
    expect(solver.solve(sample.state)).not.toBeNull();
  });

  it('reports when enumeration is intentionally bounded', () => {
    const bounded = new SubgroupSolver<ClockState>({
      identity: { value: 0 },
      generators: [
        {
          id: 'R',
          apply: ({ value }) => ({ value: value + 1 }),
          inverseId: "R'",
        },
      ],
      stateKey: ({ value }) => String(value),
      maxDepth: 2,
    });

    expect(bounded.size).toBe(3);
    expect(bounded.isComplete).toBe(false);
  });

  it('rejects unknown and unreachable states', () => {
    expect(() => solver.solve({ value: 9 })).toThrow(
      "@cubegin/solver: state '9' is not in the enumerated subgroup",
    );
  });
});
