import { describe, expect, expectTypeOf, it } from 'vitest';
import { createPuzzleRegistry } from './registry.js';
import type { PuzzleDefinition } from './puzzle-definition.js';

interface CounterState {
  readonly value: number;
}

interface CounterMove {
  readonly delta: number;
}

const counterDefinition: PuzzleDefinition<CounterState, CounterMove> = {
  id: 'counter',
  eventIds: ['333'],
  createSolvedState: () => ({ value: 0 }),
  parseAlgorithm: () => [{ delta: 1 }],
  applyMove: (state, move) => ({ value: state.value + move.delta }),
  applyAlgorithm: (state) => ({ value: state.value + 1 }),
  isSolved: (state) => state.value === 0,
};

describe('createPuzzleRegistry', () => {
  it('throws a typed error for unknown events', () => {
    const registry = createPuzzleRegistry([]);
    expect(() => registry.getByEventId('333')).toThrow(
      "@cubegin/scramble-puzzle: event '333' is not registered",
    );
  });

  it('preserves concrete definition types for registered events', () => {
    const registry = createPuzzleRegistry([counterDefinition]);
    const definition = registry.getByEventId('333');

    expectTypeOf(definition).toEqualTypeOf<PuzzleDefinition<CounterState, CounterMove>>();
    expect(definition.applyMove({ value: 1 }, { delta: 2 })).toEqual({
      value: 3,
    });
  });
});
