import { describe, expect, it } from 'vitest';
import { applyAlgorithm } from './algorithm.js';
import { InvalidScrambleError } from './errors.js';
import type { PuzzleDefinition } from './puzzle-definition.js';

interface CounterState {
  readonly value: number;
}

interface CounterMove {
  readonly delta: number;
}

describe('applyAlgorithm', () => {
  it('wraps parse failures while preserving the original cause', () => {
    const parseError = new Error('bad token');
    const definition: Pick<
      PuzzleDefinition<CounterState, CounterMove>,
      'applyMove' | 'parseAlgorithm'
    > = {
      applyMove: (state, move) => ({ value: state.value + move.delta }),
      parseAlgorithm: () => {
        throw parseError;
      },
    };

    expect(() => applyAlgorithm(definition, { value: 0 }, 'bad')).toThrow(
      InvalidScrambleError,
    );

    try {
      applyAlgorithm(definition, { value: 0 }, 'bad');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidScrambleError);
      expect(error).toHaveProperty(
        'message',
        "@cubekit/scramble-puzzle: scramble 'bad' is invalid: bad token",
      );
      expect(error).toHaveProperty('cause', parseError);
    }
  });
});
